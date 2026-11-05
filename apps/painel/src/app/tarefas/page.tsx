'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './tarefas.css';

type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
type Priority = 'BAIXA' | 'MEDIA' | 'ALTA';
type User = { id: string; name: string; role: 'ADMIN' | 'GESTOR' | 'COLABORADOR' };
type Task = {
  id: string; title: string; description: string | null; status: Status;
  priority: Priority; dueDate: string; completedAt: string | null;
  assignee: { id: string; name: string }; opportunity: { id: string; title: string; contact: { name: string } };
};
type Page<T> = { items: T[]; total: number; page: number; pages: number };
type Opportunity = { id: string; title: string; contact: { name: string } };
type Owner = { id: string; name: string };
type Summary = { pending: number; overdue: number; done: number };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const statuses: Status[] = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const statusLabel: Record<Status, string> = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const priorityLabel: Record<Priority, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta' };
const initial = { title: '', description: '', dueDate: '', priority: 'MEDIA' as Priority, opportunityId: '', assigneeId: '' };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + path, {
    ...init, credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || 'Não foi possível concluir a operação.');
  }
  return response.json() as Promise<T>;
}
function dateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function TarefasPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Page<Task>>({ items: [], total: 0, page: 1, pages: 0 });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const manager = me?.role === 'ADMIN' || me?.role === 'GESTOR';
  const reload = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (assignee) params.set('assigneeId', assignee);
    const [list, totals] = await Promise.all([
      api<Page<Task>>('/tasks?' + params.toString()),
      api<Summary>('/tasks/summary'),
    ]);
    setTasks(list); setSummary(totals);
  }, [page, status, assignee]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [{ user }, opportunityPage, ownerList] = await Promise.all([
          api<{ user: User }>('/auth/me'),
          api<Page<Opportunity>>('/crm/opportunities?page=1'),
          api<Owner[]>('/crm/owners'),
        ]);
        if (!live) return;
        setMe(user); setOpportunities(opportunityPage.items); setOwners(ownerList);
      } catch {
        if (live) router.replace('/login');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    void reload().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar tarefas'));
  }, [me, reload]);

  function beginEdit(task: Task) {
    setEditing(task.id);
    setForm({
      title: task.title, description: task.description || '', priority: task.priority,
      dueDate: task.dueDate.slice(0, 10), opportunityId: task.opportunity.id, assigneeId: task.assignee.id,
    });
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy('form'); setError(''); setNotice('');
    try {
      const payload = editing
        ? { title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate, ...(manager ? { assigneeId: form.assigneeId } : {}) }
        : { ...form, assigneeId: manager ? form.assigneeId || me!.id : me!.id };
      await api('/tasks' + (editing ? '/' + editing : ''), {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditing(null); setForm(initial);
      setNotice(editing ? 'Tarefa atualizada.' : 'Tarefa criada.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar tarefa'); }
    finally { setBusy(null); }
  }

  async function changeStatus(id: string, next: Status) {
    setBusy(id); setError(''); setNotice('');
    try {
      await api('/tasks/' + id, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      setNotice('Status atualizado.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao atualizar status'); }
    finally { setBusy(null); }
  }

  if (loading || !me) return <main className="loading-screen">Carregando tarefas...</main>;

  return <div className="tasks-shell">
    <aside className="tasks-sidebar">
      <div className="brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
      <nav aria-label="Menu principal">
        <Link href="/">Visão geral</Link>
        <Link href="/relacionamento">Relacionamento</Link>
        <Link href="/relacionamento/kanban">Funil Kanban</Link>
        <Link href="/tarefas" aria-current="page">Tarefas comerciais</Link>
        {me.role === 'ADMIN' && <Link href="/admin/usuarios">Usuários e acessos</Link>}
      </nav>
      <p className="sidebar-foot">{me.name} · Ambiente beta</p>
    </aside>
    <main className="tasks-main">
      <div className="tasks-header"><div><p className="eyebrow">CRM / ATIVIDADES</p><h1>Tarefas comerciais</h1><p className="subtitle">Organize compromissos vinculados às oportunidades.</p></div><Link href="/relacionamento/kanban" className="tasks-back">Abrir funil Kanban</Link></div>
      <section className="tasks-metrics" aria-label="Indicadores de tarefas">
        <article><span>Em aberto</span><strong>{summary?.pending ?? '—'}</strong></article>
        <article><span>Atrasadas</span><strong>{summary?.overdue ?? '—'}</strong></article>
        <article><span>Concluídas</span><strong>{summary?.done ?? '—'}</strong></article>
      </section>
      {error && <p className="tasks-error" role="alert">{error}</p>}
      {notice && <p className="tasks-notice" role="status">{notice}</p>}
      <section className="tasks-panel">
        <h2>{editing ? 'Editar tarefa' : 'Nova tarefa'}</h2>
        <form className="tasks-form" onSubmit={submit}>
          <label>Título *<input value={form.title} required maxLength={150} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
          <label>Oportunidade *<select required value={form.opportunityId} disabled={!!editing} onChange={e => setForm({ ...form, opportunityId: e.target.value })}>
            <option value="">Selecione uma oportunidade</option>
            {editing && !opportunities.some(o => o.id === form.opportunityId) && <option value={form.opportunityId}>Oportunidade atual</option>}
            {opportunities.map(o => <option key={o.id} value={o.id}>{o.title} — {o.contact.name}</option>)}
          </select><small>Disponíveis as 30 oportunidades mais recentes; consulte Relacionamento para as demais.</small></label>
          <label>Data limite *<input type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}/></label>
          <label>Prioridade<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {(Object.keys(priorityLabel) as Priority[]).map(p => <option key={p} value={p}>{priorityLabel[p]}</option>)}
          </select></label>
          {manager && <label>Responsável<select value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
            <option value="">Eu mesmo</option>
            {owners.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}
          </select></label>}
          <label className="tasks-wide">Descrição<textarea maxLength={2000} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
          <div className="tasks-actions"><button type="submit" disabled={!!busy || (!editing && !opportunities.length)}>{busy === 'form' ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar tarefa'}</button>
            {editing && <button type="button" className="tasks-secondary" onClick={() => { setEditing(null); setForm(initial); }}>Cancelar</button>}
          </div>
        </form>
      </section>
      <section className="tasks-panel">
        <div className="tasks-list-heading"><h2>Tarefas ({tasks.total})</h2><div className="tasks-filters">
          <label>Status<select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}><option value="">Todos</option>{statuses.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select></label>
          {manager && <label>Responsável<select value={assignee} onChange={e => { setPage(1); setAssignee(e.target.value); }}><option value="">Todos</option>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        </div></div>
        <div className="tasks-table-wrap"><table><thead><tr><th>Tarefa</th><th>Oportunidade</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Ação</th></tr></thead><tbody>
          {tasks.items.map(task => <tr key={task.id}>
            <td><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</td>
            <td>{task.opportunity.title}</td><td>{task.assignee.name}</td><td>{dateBR(task.dueDate)}</td>
            <td>{priorityLabel[task.priority]}</td>
            <td><select value={task.status} disabled={!!busy} aria-label={`Status de ${task.title}`} onChange={e => void changeStatus(task.id, e.target.value as Status)}>
              {statuses.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select></td>
            <td><button type="button" className="tasks-edit" onClick={() => beginEdit(task)}>Editar</button></td>
          </tr>)}
        </tbody></table>{tasks.items.length === 0 && <p className="tasks-empty">Nenhuma tarefa encontrada.</p>}</div>
        <div className="tasks-pages"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {Math.max(tasks.pages, 1)}</span><button disabled={page >= tasks.pages} onClick={() => setPage(p => p + 1)}>Próxima</button></div>
      </section>
    </main>
  </div>;
}
