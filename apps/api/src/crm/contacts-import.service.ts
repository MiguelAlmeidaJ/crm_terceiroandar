import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';

type ImportInput = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  jobTitle: string | null;
  notes: string | null;
  tags: string[];
};
type RowResult = { row: number; name: string; status: 'ready' | 'duplicate' | 'invalid' | 'imported'; reason?: string };
type Prepared = { items: { data: ImportInput; row: number }[]; results: RowResult[] };

@Injectable()
export class ContactsImportService {
  constructor(private readonly prisma: PrismaService) {}

  private optional(value: unknown, label: string, max: number): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max) throw new BadRequestException(label + ' inválido (máximo ' + max + ' caracteres)');
    return value.trim() || null;
  }

  private prepare(payload: unknown): Prepared {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Formato da importação inválido');
    const request = payload as Record<string, unknown>;
    if (Object.keys(request).some(key => key !== 'rows') || !Array.isArray(request.rows) || request.rows.length < 1 || request.rows.length > 200) {
      throw new BadRequestException('Envie de 1 a 200 contatos por lote');
    }
    const items: Prepared['items'] = [];
    const results: RowResult[] = [];
    const fields = ['name', 'email', 'phone', 'company', 'source', 'jobTitle', 'notes', 'tags'];
    for (let index = 0; index < request.rows.length; index++) {
      const row = index + 2; // A primeira linha do CSV é o cabeçalho.
      const original = request.rows[index];
      if (!original || typeof original !== 'object' || Array.isArray(original)) {
        results.push({ row, name: '', status: 'invalid', reason: 'Linha inválida' }); continue;
      }
      const input = original as Record<string, unknown>;
      const displayName = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
      try {
        if (Object.keys(input).some(key => !fields.includes(key))) throw new BadRequestException('Colunas não reconhecidas');
        if (displayName.length < 2 || displayName.length > 120) throw new BadRequestException('Nome deve ter de 2 a 120 caracteres');
        const email = this.optional(input.email, 'E-mail', 254)?.toLowerCase() ?? null;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('E-mail inválido');
        const tags = input.tags === undefined || input.tags === '' ? [] :
          typeof input.tags === 'string' ? input.tags.split('|').map(value => value.trim().toLowerCase()).filter(Boolean) : [];
        if (input.tags !== undefined && typeof input.tags !== 'string') throw new BadRequestException('Etiquetas inválidas');
        if (tags.length > 15 || tags.some(tag => tag.length > 30) || new Set(tags).size !== tags.length) {
          throw new BadRequestException('Etiquetas inválidas: até 15 etiquetas únicas com 30 caracteres');
        }
        items.push({ row, data: {
          name: displayName, email,
          phone: this.optional(input.phone, 'Telefone', 30),
          company: this.optional(input.company, 'Empresa', 120),
          source: this.optional(input.source, 'Origem', 100),
          jobTitle: this.optional(input.jobTitle, 'Cargo', 120),
          notes: this.optional(input.notes, 'Observações', 3000),
          tags,
        } });
      } catch (error) {
        results.push({ row, name: displayName, status: 'invalid', reason: error instanceof Error ? error.message : 'Dados inválidos' });
      }
    }
    return { items, results };
  }

  private async inspect(user: CurrentUser, payload: unknown) {
    const id = tenantId(user);
    const prepared = this.prepare(payload);
    const emails = prepared.items.map(({data}) => data.email).filter((value): value is string => !!value);
    const phones = prepared.items.map(({data}) => data.phone).filter((value): value is string => !!value);
    const or: Prisma.ContactWhereInput[] = [];
    if (emails.length) or.push({ email: { in: emails, mode: 'insensitive' } });
    if (phones.length) or.push({ phone: { in: phones } });
    const existing = or.length ? await this.prisma.contact.findMany({ where: { tenantId: id, OR: or }, select: { email:true, phone:true } }) : [];
    const knownEmails = new Set(existing.map(item => item.email?.toLowerCase()).filter((v):v is string => !!v));
    const knownPhones = new Set(existing.map(item => item.phone).filter((v):v is string => !!v));
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const accepted: typeof prepared.items = [];
    for (const item of prepared.items) {
      const {email,phone} = item.data;
      if ((email && (knownEmails.has(email) || seenEmails.has(email))) ||
          (phone && (knownPhones.has(phone) || seenPhones.has(phone)))) {
        prepared.results.push({ row:item.row, name:item.data.name, status:'duplicate', reason:'E-mail ou telefone já cadastrado neste lote ou na empresa' });
      } else {
        accepted.push(item);
        if (email) seenEmails.add(email);
        if (phone) seenPhones.add(phone);
        prepared.results.push({ row:item.row, name:item.data.name, status:'ready' });
      }
    }
    return { tenant:id, accepted, results:prepared.results.sort((a,b)=>a.row-b.row) };
  }

  async preview(user: CurrentUser, payload: unknown) {
    const checked = await this.inspect(user,payload);
    return { total:checked.results.length, ready:checked.accepted.length,
      duplicates:checked.results.filter(r=>r.status==='duplicate').length,
      invalid:checked.results.filter(r=>r.status==='invalid').length,
      results:checked.results };
  }

  async run(user: CurrentUser, payload: unknown) {
    const checked = await this.inspect(user,payload);
    const results = checked.results.map(result=>({...result}));
    let imported=0;
    // Cada linha tem um resultado explícito; registros existentes nunca são sobrescritos.
    for (const entry of checked.accepted) {
      const result=results.find(item=>item.row===entry.row)!;
      const {email,phone}=entry.data;
      const conditions: Prisma.ContactWhereInput[]=[];
      if(email)conditions.push({email:{equals:email,mode:'insensitive'}});
      if(phone)conditions.push({phone});
      try {
        const duplicate=conditions.length ? await this.prisma.contact.findFirst({
          where:{tenantId:checked.tenant,OR:conditions},select:{id:true}
        }):null;
        if(duplicate){result.status='duplicate';result.reason='Contato cadastrado enquanto o lote era processado';continue;}
        await this.prisma.contact.create({data:{...entry.data,tenantId:checked.tenant}});
        result.status='imported';imported++;
      }catch {
        result.status='invalid';result.reason='Não foi possível cadastrar a linha';
      }
    }
    return {total:results.length,imported,duplicates:results.filter(r=>r.status==='duplicate').length,
      invalid:results.filter(r=>r.status==='invalid').length,results};
  }
}
