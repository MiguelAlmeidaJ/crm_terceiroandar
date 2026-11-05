'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

type User = { id: string; name: string; email: string; role: 'ADMIN' | 'GESTOR' | 'COLABORADOR' };
type Summary = { users: number; activeUsers: number; events: number };
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const modules = [
  { title: 'Dashboard comercial', description: 'Indicadores, oportunidades e desempenho.', href: '/dashboard/comercial' },
  { title: 'Relacionamento', description: 'Contatos, oportunidades e histórico.', href: '/relacionamento' },
  { title: 'Funil Kanban', description: 'Acompanhe cada etapa das oportunidades.', href: '/relacionamento/kanban' },
  { title: 'Tarefas comerciais', description: 'Prazos e atividades sob controle.', href: '/tarefas' },
];
const roleNames = { SYSTEM: 'Sistema', ADMIN: 'Administrador', GESTOR: 'Gestor', COLABORADOR: 'Colaborador' };

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
        if(data.user.role === 'SYSTEM'){router.replace('/system/empresas');return;}
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
    <AppShell user={user}>
      
      <main className="main">
        <header><div><p className="eyebrow">PAINEL / INÍCIO</p><h1>Bem-vindo, {user.name}</h1><p className="subtitle">Sua operação, organizada em um só lugar.</p></div><span className="status">● Sistema ativo</span></header>
        <section className="hero"><div><p className="eyebrow">VISÃO GERAL</p><h2>Seu negócio, em movimento.</h2><p>Acompanhe oportunidades, mantenha os relacionamentos próximos e organize as prioridades da sua equipe em um único lugar.</p></div><span className="hero-icon">3A</span></section>
        <section aria-label="Indicadores do ambiente" className="metrics">
          <article className="metric"><span>Usuários cadastrados</span><strong>{summary?.users ?? '—'}</strong></article>
          <article className="metric"><span>Usuários ativos</span><strong>{summary?.activeUsers ?? '—'}</strong></article>
          <article className="metric"><span>Eventos registrados</span><strong>{summary?.events ?? '—'}</strong></article>
        </section>
        <section aria-labelledby="modules-title"><div className="section-title"><h2 id="modules-title">Áreas do sistema</h2><p>Acesse rapidamente as principais áreas do seu CRM</p></div><div className="cards">{modules.map((module, index) => <Link className="card ta-home-tile" href={module.href} key={module.title}><div className="card-number">0{index + 1}</div><h3>{module.title}</h3><p>{module.description}</p><span className="pending">Acessar módulo →</span></Link>)}</div></section>
      </main>
    </AppShell>
  );
}
