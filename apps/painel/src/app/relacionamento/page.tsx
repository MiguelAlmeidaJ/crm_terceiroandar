'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Stage = 'NOVO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHO' | 'PERDIDO';
type Contact = { id: string; name: string; email: string | null; phone: string | null; company: string | null; notes: string | null };
type Opportunity = { id: string; title: string; description: string | null; stage: Stage; value: string | null; contact: { id: string; name: string }; owner: { id: string; name: string } | null; _count: { activities: number } };
type Activity = { id: string; message: string; createdAt: string; author: { name: string } };
type Page<T> = { items: T[]; total: number; page: number; pages: number };
type Summary = { contacts: number; opportunities: number; byStage: Record<Stage, number> };
type User = { id: string; name: string; role: string };
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const stages: Stage[] = ['NOVO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO'];
const labels: Record<Stage, string> = { NOVO: 'Novo', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta', NEGOCIACAO: 'Negociação', GANHO: 'Ganho', PERDIDO: 'Perdido' };
const blankContact = { name: '', email: '', phone: '', company: '', notes: '' };
const blankOpportunity = { title: '', contactId: '', description: '', value: '', expectedAt: '' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { ...init, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || `Erro na API (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export default function RelacionamentoPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [tab, setTab] = useState<'contatos' | 'oportunidades'>('contatos');
  const [contacts, setContacts] = useState<Page<Contact>>({ items: [], total: 0, page: 1, pages: 0 });
  const [opportunities, setOpportunities] = useState<Page<Opportunity>>({ items: [], total: 0, page: 1, pages: 0 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contactQuery, setContactQuery] = useState('');
  const [search, setSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const [opportunityPage, setOpportunityPage] = useState(1);
  const [stageFilter, setStageFilter] = useState('');
  const [contactForm, setContactForm] = useState(blankContact);
  const [contactEditing, setContactEditing] = useState<string | null>(null);
  const [opportunityForm, setOpportunityForm] = useState(blankOpportunity);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityMessage, setActivityMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const [c, o, s] = await Promise.all([
      request<Page<Contact>>(`/crm/contacts?page=${contactPage}&q=${encodeURIComponent(search)}`),
      request<Page<Opportunity>>(`/crm/opportunities?page=${opportunityPage}${stageFilter ? '&stage=' + encodeURIComponent(stageFilter) : ''}`),
      request<Summary>('/crm/summary'),
    ]);
    setContacts(c); setOpportunities(o); setSummary(s);
  }, [contactPage, opportunityPage, search, stageFilter]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const response = await fetch(api + '/auth/me', { credentials: 'include', cache: 'no-store' });
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error('Falha ao validar a sessão');
        const data = await response.json() as { user: User };
        if (live) setMe(data.user);
      } catch { if (live) setError('Não foi possível conectar à API.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [router]);
  useEffect(() => {
    if (!me) return;
    void reload().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar CRM'));
  }, [me, reload]);

  function editContact(contact: Contact) {
    setContactEditing(contact.id);
    setContactForm({ name: contact.name, email: contact.email || '', phone: contact.phone || '', company: contact.company || '', notes: contact.notes || '' });
    setTab('contatos'); setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request(`/crm/contacts${contactEditing ? '/' + contactEditing : ''}`, {
        method: contactEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(contactForm),
      });
      setContactForm(blankContact); setContactEditing(null); setNotice('Contato salvo com sucesso.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar contato'); }
    finally { setBusy(false); }
  }
  async function submitOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request('/crm/opportunities', { method: 'POST', body: JSON.stringify(opportunityForm) });
      setOpportunityForm(blankOpportunity); setNotice('Oportunidade criada com sucesso.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar oportunidade'); }
    finally { setBusy(false); }
  }
  async function changeStage(id: string, stage: Stage) {
    setError(''); setNotice('');
    try {
      await request('/crm/opportunities/' + id, { method: 'PATCH', body: JSON.stringify({ stage }) });
      setNotice('Etapa atualizada.'); await reload();
      if (selectedOpportunity === id) await showActivities(id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao atualizar etapa'); }
  }
  async function showActivities(id: string) {
    setSelectedOpportunity(id); setActivities([]);
    try { setActivities(await request<Activity[]>('/crm/opportunities/' + id + '/activities')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar histórico'); }
  }
  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOpportunity) return;
    setBusy(true); setError('');
    try {
      await request('/crm/opportunities/' + selectedOpportunity + '/activities', {
        method: 'POST', body: JSON.stringify({ message: activityMessage }),
      });
      setActivityMessage(''); await showActivities(selectedOpportunity); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar atividade'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="loading-screen">Verificando acesso...</main>;
  if (!me) return <main className="loading-screen">{error || 'Redirecionando...'}</main>;

  return <div className="crm-shell">
    <aside className="crm-sidebar">
      <div className="brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
      <nav aria-label="Menu principal">
        <Link href="/">Visão geral</Link>
        <Link href="/relacionamento" aria-current="page">Relacionamento</Link><Link href="/relacionamento/kanban">Funil Kanban</Link><Link href="/tarefas">Tarefas comerciais</Link>
        {me.role === 'ADMIN' && <Link href="/admin/usuarios">Usuários e acessos</Link>}
      </nav>
      <p className="sidebar-foot">{me.name} · Ambiente beta</p>
    </aside>
    <main className="crm-main">
      <div className="crm-heading"><div><p className="eyebrow">CRM / RELACIONAMENTO</p><h1>Relacionamento</h1><p className="subtitle">Organize seus contatos e acompanhe o funil de oportunidades.</p></div><div className="crm-heading-actions"><Link className="crm-back" href="/relacionamento/kanban">Abrir Kanban</Link> · <Link className="crm-back" href="/">Voltar ao painel</Link></div></div>
      <section className="crm-stats" aria-label="Resumo do relacionamento">
        <article><span>Contatos</span><strong>{summary?.contacts ?? '—'}</strong></article>
        <article><span>Oportunidades</span><strong>{summary?.opportunities ?? '—'}</strong></article>
        <article><span>Em negociação</span><strong>{summary?.byStage.NEGOCIACAO ?? '—'}</strong></article>
        <article><span>Ganhos</span><strong>{summary?.byStage.GANHO ?? '—'}</strong></article>
      </section>
      {notice && <p className="crm-notice" role="status">{notice}</p>}
      {error && <p className="crm-error" role="alert">{error}</p>}
      <div className="crm-tabs" role="group" aria-label="Áreas de relacionamento">
        <button aria-pressed={tab === 'contatos'} onClick={() => { setTab('contatos'); setError(''); }}>Contatos</button>
        <button aria-pressed={tab === 'oportunidades'} onClick={() => { setTab('oportunidades'); setError(''); }}>Oportunidades</button>
      </div>
      {tab === 'contatos' ? <>
        <section className="crm-panel"><h2>{contactEditing ? 'Editar contato' : 'Cadastrar contato'}</h2>
          <form className="crm-form" onSubmit={submitContact}>
            <label>Nome *<input required minLength={2} maxLength={120} value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })}/></label>
            <label>E-mail<input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })}/></label>
            <label>Telefone<input maxLength={30} value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}/></label>
            <label>Empresa<input maxLength={120} value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })}/></label>
            <label className="crm-wide">Observações<textarea rows={3} maxLength={3000} value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}/></label>
            <div className="crm-form-actions"><button disabled={busy} type="submit">{busy ? 'Salvando...' : contactEditing ? 'Salvar contato' : 'Cadastrar contato'}</button>{contactEditing && <button className="crm-secondary" type="button" onClick={() => { setContactEditing(null); setContactForm(blankContact); }}>Cancelar edição</button>}</div>
          </form>
        </section>
        <section className="crm-panel"><div className="crm-list-heading"><h2>Contatos ({contacts.total})</h2>
          <form onSubmit={e => { e.preventDefault(); setContactPage(1); setSearch(contactQuery); }} className="crm-search"><input aria-label="Buscar contato" placeholder="Buscar nome, e-mail ou empresa" value={contactQuery} onChange={e => setContactQuery(e.target.value)} /><button type="submit">Buscar</button></form></div>
          <div className="crm-overflow"><table><thead><tr><th>Nome</th><th>Empresa</th><th>E-mail</th><th>Telefone</th><th>Ação</th></tr></thead><tbody>{contacts.items.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.company || '—'}</td><td>{c.email || '—'}</td><td>{c.phone || '—'}</td><td><button className="crm-inline" onClick={() => editContact(c)}>Editar</button></td></tr>)}</tbody></table>{!contacts.items.length && <p className="crm-empty">Nenhum contato encontrado.</p>}</div>
          <div className="crm-pagination"><button disabled={contactPage <= 1} onClick={() => setContactPage(p => p - 1)}>Anterior</button><span>Página {contactPage} de {Math.max(1, contacts.pages)}</span><button disabled={contactPage >= contacts.pages} onClick={() => setContactPage(p => p + 1)}>Próxima</button></div>
        </section>
      </> : <>
        <section className="crm-panel"><h2>Nova oportunidade</h2>
          <form className="crm-form" onSubmit={submitOpportunity}>
            <label>Título *<input required minLength={2} maxLength={150} value={opportunityForm.title} onChange={e => setOpportunityForm({ ...opportunityForm, title: e.target.value })}/></label>
            <label>Contato *<select required value={opportunityForm.contactId} onChange={e => setOpportunityForm({ ...opportunityForm, contactId: e.target.value })}><option value="">Selecione um contato</option>{contacts.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small>Exibindo os contatos da página atual. Busque na aba Contatos se necessário.</small></label>
            <label>Valor estimado (R$)<input type="number" step="0.01" min="0" value={opportunityForm.value} onChange={e => setOpportunityForm({ ...opportunityForm, value: e.target.value })}/></label>
            <label>Previsão de fechamento<input type="date" value={opportunityForm.expectedAt} onChange={e => setOpportunityForm({ ...opportunityForm, expectedAt: e.target.value })}/></label>
            <label className="crm-wide">Descrição<textarea maxLength={3000} rows={3} value={opportunityForm.description} onChange={e => setOpportunityForm({ ...opportunityForm, description: e.target.value })}/></label>
            <div className="crm-form-actions"><button disabled={busy || contacts.total === 0} type="submit">{busy ? 'Salvando...' : 'Criar oportunidade'}</button></div>
          </form>
        </section>
        <section className="crm-panel"><div className="crm-list-heading"><h2>Funil de oportunidades ({opportunities.total})</h2><label>Filtrar etapa <select value={stageFilter} onChange={e => { setOpportunityPage(1); setStageFilter(e.target.value); }}><option value="">Todas as etapas</option>{stages.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></label></div>
          <div className="crm-overflow"><table><thead><tr><th>Oportunidade</th><th>Contato</th><th>Valor</th><th>Responsável</th><th>Etapa</th><th>Histórico</th></tr></thead><tbody>{opportunities.items.map(o => <tr key={o.id}><td><strong>{o.title}</strong></td><td>{o.contact.name}</td><td>{o.value === null ? '—' : Number(o.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{o.owner?.name || '—'}</td><td><select aria-label={`Etapa de ${o.title}`} value={o.stage} onChange={e => void changeStage(o.id, e.target.value as Stage)}>{stages.map(s => <option value={s} key={s}>{labels[s]}</option>)}</select></td><td><button className="crm-inline" onClick={() => void showActivities(o.id)}>Ver ({o._count.activities})</button></td></tr>)}</tbody></table>{!opportunities.items.length && <p className="crm-empty">Nenhuma oportunidade encontrada.</p>}</div>
          <div className="crm-pagination"><button disabled={opportunityPage <= 1} onClick={() => setOpportunityPage(p => p - 1)}>Anterior</button><span>Página {opportunityPage} de {Math.max(1, opportunities.pages)}</span><button disabled={opportunityPage >= opportunities.pages} onClick={() => setOpportunityPage(p => p + 1)}>Próxima</button></div>
        </section>
        {selectedOpportunity && <section className="crm-panel"><div className="crm-list-heading"><h2>Histórico da oportunidade</h2><button className="crm-inline" onClick={() => setSelectedOpportunity(null)}>Fechar</button></div>
          <form onSubmit={addActivity} className="crm-activity-form"><textarea aria-label="Descrever atividade" required minLength={2} maxLength={2000} rows={3} placeholder="Ex.: ligação realizada; aguardando retorno..." value={activityMessage} onChange={e => setActivityMessage(e.target.value)}/><button type="submit" disabled={busy}>Registrar atividade</button></form>
          {activities.length ? <ul className="crm-activities">{activities.map(a => <li key={a.id}><strong>{a.author.name}</strong><span>{new Date(a.createdAt).toLocaleString('pt-BR')}</span><p>{a.message}</p></li>)}</ul> : <p className="crm-empty">Nenhuma atividade registrada.</p>}
        </section>}
      </>}
    </main>
  </div>;
}
