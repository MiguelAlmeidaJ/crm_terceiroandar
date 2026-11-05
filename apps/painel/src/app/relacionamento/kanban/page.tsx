'use client';

import { DragEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './kanban.css';

type Stage = 'NOVO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHO' | 'PERDIDO';
type Owner = { id: string; name: string; email: string };
type Opportunity = {
  id: string; title: string; stage: Stage; value: string | null; expectedAt: string | null;
  contact: { id: string; name: string }; owner: { id: string; name: string } | null;
  _count: { activities: number };
};
type Column = { stage: Stage; items: Opportunity[]; total: number; hasMore: boolean };
type Board = { columns: Column[]; totals: { opportunities: number; value: string }; limitPerColumn: number };
type User = { id: string; name: string; role: string };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const stages: Stage[] = ['NOVO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO'];
const labels: Record<Stage, string> = { NOVO: 'Novo', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta', NEGOCIACAO: 'Negociação', GANHO: 'Ganho', PERDIDO: 'Perdido' };
const money = (v: string | null) => v === null ? 'Sem valor' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function get<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + url, { ...init, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || 'Não foi possível concluir a operação.');
  }
  return response.json() as Promise<T>;
}

export default function KanbanPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (ownerId) params.set('ownerId', ownerId);
    if (query) params.set('q', query);
    setBoard(await get<Board>('/crm/kanban?' + params.toString()));
  }, [ownerId, query]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { user } = await get<{ user: User }>('/auth/me');
        if (!live) return;
        setMe(user);
        setOwners(await get<Owner[]>('/crm/owners'));
      } catch {
        if (live) router.replace('/login');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    void refresh().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar funil'));
  }, [me, refresh]);

  async function move(id: string, stage: Stage) {
    if (moving) return;
    const card = board?.columns.flatMap(c => c.items).find(item => item.id === id);
    if (!card || card.stage === stage) return;
    setMoving(id); setError(''); setNotice('');
    try {
      await get('/crm/opportunities/' + id, { method: 'PATCH', body: JSON.stringify({ stage }) });
      await refresh();
      setNotice(`Oportunidade movida para ${labels[stage]}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível mover a oportunidade.');
      await refresh().catch(() => undefined);
    } finally { setMoving(null); setDragging(null); }
  }

  function dragStart(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDragging(id);
  }
  function drop(event: DragEvent<HTMLElement>, stage: Stage) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id && board?.columns.some(c => c.items.some(item => item.id === id))) void move(id, stage);
    setDragging(null);
  }
  if (loading || !me) return <main className="loading-screen">Carregando funil...</main>;

  return <div className="kanban-shell">
    <aside className="kanban-sidebar">
      <div className="brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
      <nav aria-label="Menu principal">
        <Link href="/">Visão geral</Link>
        <Link href="/relacionamento">Relacionamento</Link>
        <Link href="/relacionamento/kanban" aria-current="page">Funil Kanban</Link>
        {me.role === 'ADMIN' && <Link href="/admin/usuarios">Usuários e acessos</Link>}
      </nav>
      <p className="sidebar-foot">{me.name} · Ambiente beta</p>
    </aside>
    <main className="kanban-main">
      <div className="kanban-heading"><div><p className="eyebrow">CRM / RELACIONAMENTO</p><h1>Funil de oportunidades</h1><p className="subtitle">Arraste cartões entre etapas ou use o seletor de etapa em cada oportunidade.</p></div><Link href="/relacionamento" className="kanban-link">Voltar aos cadastros</Link></div>
      <div className="kanban-toolbar">
        <label>Responsável
          <select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        <form onSubmit={e => { e.preventDefault(); setQuery(queryInput.trim()); }} className="kanban-search">
          <label htmlFor="kanban-search">Buscar oportunidades</label>
          <div><input id="kanban-search" maxLength={100} placeholder="Título ou contato" value={queryInput} onChange={e => setQueryInput(e.target.value)} /><button type="submit">Buscar</button></div>
        </form>
        <div className="kanban-summary"><span>Oportunidades filtradas</span><strong>{board?.totals.opportunities ?? '—'}</strong><small>Valor estimado: {money(board?.totals.value ?? null)}</small></div>
      </div>
      {error && <p className="kanban-error" role="alert">{error}</p>}
      {notice && <p className="kanban-notice" role="status">{notice}</p>}
      {!board ? <p>Carregando oportunidades...</p> : <>
        <div className="kanban-board" aria-label="Quadro de oportunidades">
          {board.columns.map(column => <section key={column.stage} className={dragging ? 'kanban-column kanban-drop-ready' : 'kanban-column'} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, column.stage)}>
            <div className="kanban-column-head"><h2>{labels[column.stage]}</h2><span>{column.total}</span></div>
            <div className="kanban-column-items">
              {column.items.map(card => <article key={card.id} className="kanban-card" draggable={!moving} onDragStart={e => dragStart(e, card.id)} onDragEnd={() => setDragging(null)}>
                <strong>{card.title}</strong>
                <p>{card.contact.name}</p>
                <span className="kanban-card-value">{money(card.value)}</span>
                <div className="kanban-card-meta"><span>{card.owner?.name || 'Sem responsável'}</span><span>{card._count.activities} atividade(s)</span></div>
                {card.expectedAt && <small>Previsão: {new Date(card.expectedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</small>}
                <label className="kanban-move-label">Mover para
                  <select disabled={!!moving} value={card.stage} onChange={e => void move(card.id, e.target.value as Stage)} aria-label={`Mover ${card.title} para`}>
                    {stages.map(stage => <option key={stage} value={stage}>{labels[stage]}</option>)}
                  </select>
                </label>
              </article>)}
              {!column.items.length && <p className="kanban-empty">Nenhuma oportunidade nesta etapa.</p>}
              {column.hasMore && <p className="kanban-limit">Exibindo as {board.limitPerColumn} mais recentes. Use filtros para encontrar outras.</p>}
            </div>
          </section>)}
        </div>
        <p className="kanban-note">Movimentações são registradas no histórico de atividades da oportunidade. O quadro exibe até {board.limitPerColumn} oportunidades por etapa.</p>
      </>}
    </main>
  </div>;
}
