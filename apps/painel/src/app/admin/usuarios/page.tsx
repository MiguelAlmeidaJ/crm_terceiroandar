'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { useRouter } from 'next/navigation';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
type Role = 'ADMIN' | 'GESTOR' | 'COLABORADOR';
type User = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string };
type Audit = { id: string; action: string; targetId: string; createdAt: string; actor: { name: string } };
const roleLabel: Record<Role, string> = { ADMIN: 'Administrador', GESTOR: 'Gestor', COLABORADOR: 'Colaborador' };
const empty = { name: '', email: '', password: '', role: 'COLABORADOR' as Role, active: true };

export default function UsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const [u, a] = await Promise.all([
      fetch(`${api}/admin/users`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${api}/admin/audit`, { credentials: 'include', cache: 'no-store' }),
    ]);
    if (!u.ok) throw new Error('Não foi possível carregar usuários.');
    setUsers(await u.json());
    if (a.ok) setAudit(await a.json());
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const response = await fetch(`${api}/auth/me`, { credentials: 'include', cache: 'no-store' });
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error('Falha na autenticação');
        const { user } = await response.json() as { user: User };
        if (user.role !== 'ADMIN') { router.replace('/'); return; }
        if (live) setMe(user);
        await refresh();
      } catch { if (live) setError('Não foi possível carregar o painel. Confira a conexão com a API.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [refresh, router]);

  function beginEdit(user: User) {
    setEditing(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, active: user.active });
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() { setEditing(null); setForm(empty); setError(''); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const payload = editing
        ? { name: form.name, email: form.email, role: form.role, active: form.active, ...(form.password ? { password: form.password } : {}) }
        : { name: form.name, email: form.email, role: form.role, password: form.password };
      const response = await fetch(editing ? `${api}/admin/users/${editing}` : `${api}/admin/users`, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string | string[] };
        throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Não foi possível salvar.');
      }
      reset();
      setNotice('Usuário salvo com sucesso.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar usuário.'); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="loading-screen">Carregando usuários...</main>;
  if (!me) return <main className="loading-screen"><p>{error || 'Verificando acesso...'}</p></main>;

  return <AppShell user={me}>
    
    <main className="admin-main">
      <div className="admin-top"><div><p className="eyebrow">CONFIGURAÇÕES / ACESSOS</p><h1>Gestão de usuários</h1><p className="subtitle">Controle quem acessa o sistema e seus perfis.</p></div><Link href="/" className="back-link">Voltar ao painel</Link></div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="admin-panel" aria-labelledby="edit-title">
        <h2 id="edit-title">{editing ? 'Editar usuário' : 'Novo usuário'}</h2>
        <form className="user-form" onSubmit={submit}>
          <label>Nome<input required minLength={2} maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>E-mail<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Perfil<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>{Object.entries(roleLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Senha {editing && <small>(em branco para manter)</small>}<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required={!editing} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          {editing && <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Usuário ativo</label>}
          <div className="form-actions"><button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar usuário'}</button>{editing && <button type="button" className="secondary-button" onClick={reset}>Cancelar</button>}</div>
        </form>
      </section>
      <section className="admin-panel" aria-labelledby="list-title"><h2 id="list-title">Usuários cadastrados ({users.length})</h2>
        <div className="table-overflow"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ação</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{roleLabel[u.role]}</td><td><span className={u.active ? 'active-pill' : 'inactive-pill'}>{u.active ? 'Ativo' : 'Inativo'}</span></td><td><button className="table-action" onClick={() => beginEdit(u)}>Editar</button></td></tr>)}</tbody></table></div>
      </section>
      <section className="admin-panel" aria-labelledby="audit-title"><h2 id="audit-title">Atividades administrativas recentes</h2>
        {audit.length === 0 ? <p className="subtitle">Nenhuma alteração registrada ainda.</p> : <div className="table-overflow"><table><thead><tr><th>Data</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>{audit.map(a => <tr key={a.id}><td>{new Date(a.createdAt).toLocaleString('pt-BR')}</td><td>{a.actor.name}</td><td>{a.action === 'USER_CREATED' ? 'Cadastro de usuário' : 'Edição de usuário'}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  </AppShell>;
}
