'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: string; name: string; email: string; role: 'ADMIN' | 'GESTOR' | 'COLABORADOR' };
type Summary = { users: number; activeUsers: number; events: number };
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const modules = [
  { title: 'Visão geral', description: 'Indicadores e acompanhamento de resultados.' },
  { title: 'Relacionamento', description: 'Contatos, oportunidades e histórico.' },
  { title: 'Marketing', description: 'Campanhas, canais e conversões.' },
  { title: 'Processos', description: 'Fluxos, tarefas e atividades.' },
];
const roleNames = { ADMIN: 'Administrador', GESTOR: 'Gestor', COLABORADOR: 'Colaborador' };

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const me = await fetch(`${apiUrl}/auth/me`, { credentials: 'include', cache: 'no-store' });
        if (!me.ok) { router.replace('/login'); return; }
        const data: { user: User } = await me.json();
        if (!alive) return;
        setUser(data.user);
        const response = await fetch(`${apiUrl}/dashboard/summary`, { credentials: 'include', cache: 'no-store' });
        if (response.ok && alive) setSummary(await response.json());
      } catch {
        router.replace('/login');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [router]);

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => null);
    router.replace('/login');
  }

  if (loading || !user) return <main className="loading-screen" aria-live="polite">Carregando ambiente...</main>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
        <nav aria-label="Menu principal">
          <a href="/" aria-current="page">Visão geral</a>
          <span>Relacionamento</span>
          <span>Marketing</span>
          <span>Processos</span>
          {user.role === 'ADMIN' && <span>Configurações</span>}
        </nav>
        <div className="sidebar-foot"><p>{user.name}</p><p>{roleNames[user.role]}</p><button className="logout-button" onClick={logout}>Sair</button></div>
      </aside>
      <main className="main">
        <header><div><p className="eyebrow">PAINEL / INÍCIO</p><h1>Bem-vindo, {user.name}</h1><p className="subtitle">Sua operação, organizada em um só lugar.</p></div><span className="status">● Beta</span></header>
        <section className="hero"><div><p className="eyebrow">VISÃO GERAL</p><h2>Uma plataforma pronta para evoluir.</h2><p>Seu ambiente está protegido por autenticação. Os módulos de negócio serão implementados nas próximas etapas.</p></div><span className="hero-icon">3A</span></section>
        <section aria-label="Indicadores do ambiente" className="metrics">
          <article className="metric"><span>Usuários cadastrados</span><strong>{summary?.users ?? '—'}</strong></article>
          <article className="metric"><span>Usuários ativos</span><strong>{summary?.activeUsers ?? '—'}</strong></article>
          <article className="metric"><span>Eventos registrados</span><strong>{summary?.events ?? '—'}</strong></article>
        </section>
        <section aria-labelledby="modules-title"><div className="section-title"><h2 id="modules-title">Áreas do sistema</h2><p>Estrutura prevista para o desenvolvimento</p></div><div className="cards">{modules.map((module, index) => <article className="card" key={module.title}><div className="card-number">0{index + 1}</div><h3>{module.title}</h3><p>{module.description}</p><span className="pending">Em preparação</span></article>)}</div></section>
      </main>
    </div>
  );
}
