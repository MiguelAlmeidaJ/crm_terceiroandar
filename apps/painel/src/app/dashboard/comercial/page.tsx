'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { useRouter } from 'next/navigation';
import './comercial.css';

type Role = 'ADMIN' | 'GESTOR' | 'COLABORADOR';
type Stage = 'NOVO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHO' | 'PERDIDO';
type Period = '7d' | '30d' | '90d' | 'all';
type CurrentUser = { id: string; name: string; role: Role };
type Data = {
  period: Period;
  generatedAt: string;
  filters: { ownerId: string | null; from: string | null; to: string };
  kpis: { opportunities: number; estimatedValue: string; won: number; lost: number; winRate: number | null; openTasks: number; overdueTasks: number };
  stages: { stage: Stage; count: number; value: string }[];
  owners: { id: string; name: string; active: boolean }[];
  performance: { id: string; name: string; total: number; won: number; lost: number; winRate: number | null; estimatedValue: string }[];
  notes: { opportunityPeriod: string; taskPeriod: string };
};
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const labels: Record<Stage, string> = {
  NOVO: 'Novo', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta',
  NEGOCIACAO: 'Negociação', GANHO: 'Ganho', PERDIDO: 'Perdido',
};
const currency = (value: string) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rate = (value: number | null) => value === null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

export default function CommercialDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const manager = user?.role === 'ADMIN' || user?.role === 'GESTOR';

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const result = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
        if (result.status === 401) { router.replace('/login'); return; }
        if (!result.ok) throw new Error('Não foi possível validar sua sessão.');
        const body = await result.json() as { user: CurrentUser };
        if (alive) setUser(body.user);
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : 'API indisponível.');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [router]);

  const load = useCallback(async () => {
    setUpdating(true); setError('');
    try {
      const query = new URLSearchParams({ period });
      if (ownerId) query.set('ownerId', ownerId);
      const response = await fetch(API + '/dashboard/commercial?' + query, { credentials: 'include', cache: 'no-store' });
      if (response.status === 401) { router.replace('/login'); return; }
      if (!response.ok) throw new Error('Falha ao carregar indicadores comerciais.');
      setData(await response.json() as Data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar indicadores.');
    } finally { setUpdating(false); }
  }, [period, ownerId, router]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  if (loading || !user) return <main className="loading-screen">{error || 'Carregando indicadores...'}</main>;
  const kpis = data?.kpis;
  const maximum = Math.max(1, ...(data?.stages.map(stage => stage.count) ?? [0]));
  return <AppShell user={user}>
    
    <main className="commercial-main">
      <div className="commercial-heading">
        <div><p className="eyebrow">INDICADORES / COMERCIAL</p><h1>Dashboard comercial</h1><p className="subtitle">Acompanhe o funil, o desempenho e as pendências de sua operação.</p></div>
        <button type="button" className="commercial-refresh" onClick={() => void load()} disabled={updating}>{updating ? 'Atualizando...' : 'Atualizar dados'}</button>
      </div>
      <div className="commercial-filters">
        <label>Período de criação
          <select value={period} onChange={e => setPeriod(e.target.value as Period)}>
            <option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option><option value="all">Todo o histórico</option>
          </select>
        </label>
        {manager && <label>Responsável
          <select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {data?.owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}{owner.active ? '' : ' (inativo)'}</option>)}
          </select>
        </label>}
        {data && <span className="commercial-updated">Atualizado: {new Date(data.generatedAt).toLocaleString('pt-BR')}</span>}
      </div>
      {error && <p className="commercial-error" role="alert">{error}</p>}
      <section className="commercial-metrics" aria-label="Indicadores principais">
        <article><span>Oportunidades</span><strong>{kpis?.opportunities ?? '—'}</strong><small>Registradas no período</small></article>
        <article><span>Valor estimado</span><strong>{kpis ? currency(kpis.estimatedValue) : '—'}</strong><small>Soma das oportunidades no período</small></article>
        <article><span>Ganhos / Perdidos</span><strong>{kpis ? kpis.won + ' / ' + kpis.lost : '—'}</strong><small>Etapa atual</small></article>
        <article><span>Taxa de ganho</span><strong>{kpis ? rate(kpis.winRate) : '—'}</strong><small>Ganhos ÷ (ganhos + perdidos)</small></article>
        <article><span>Tarefas abertas</span><strong>{kpis?.openTasks ?? '—'}</strong><small>Indicador atual</small></article>
        <article><span>Tarefas atrasadas</span><strong>{kpis?.overdueTasks ?? '—'}</strong><small>Prazos vencidos e não concluídos</small></article>
      </section>
      <div className="commercial-content">
        <section className="commercial-panel"><h2>Distribuição do funil</h2><p className="subtitle">Quantidade por etapa atual</p>
          <div className="commercial-bars">
            {data?.stages.map(stage => <div className="commercial-bar-row" key={stage.stage}>
              <div className="commercial-bar-label"><span>{labels[stage.stage]}</span><strong>{stage.count}</strong></div>
              <div className="commercial-bar-track"><div className="commercial-bar-fill" style={{ width: (stage.count / maximum * 100) + '%' }} /></div>
              <small>{currency(stage.value)}</small>
            </div>)}
          </div>
          {!data && <p>Carregando distribuição...</p>}
        </section>
        <section className="commercial-panel"><h2>Resumo operacional</h2>
          <p className="commercial-explanation">{data?.notes.opportunityPeriod}</p>
          <p className="commercial-explanation">{data?.notes.taskPeriod}</p>
          <div className="commercial-shortcuts"><Link href="/relacionamento/kanban">Abrir funil Kanban</Link><Link href="/tarefas">Ver tarefas comerciais</Link></div>
        </section>
      </div>
      {manager && <section className="commercial-panel"><h2>Desempenho por responsável</h2>
        <p className="subtitle">Contagem e valor das oportunidades criadas no período, por responsável atual.</p>
        <div className="commercial-table-wrap"><table><thead><tr><th>Responsável</th><th>Oportunidades</th><th>Ganhos</th><th>Perdidos</th><th>Taxa de ganho</th><th>Valor estimado</th></tr></thead><tbody>
          {data?.performance.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.total}</td><td>{row.won}</td><td>{row.lost}</td><td>{rate(row.winRate)}</td><td>{currency(row.estimatedValue)}</td></tr>)}
        </tbody></table>{data?.performance.length === 0 && <p className="commercial-empty">Sem oportunidades para o filtro selecionado.</p>}</div>
      </section>}
    </main>
  </AppShell>;
}
