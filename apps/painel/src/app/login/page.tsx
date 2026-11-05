'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('E-mail ou senha inválidos.');
      router.replace('/');
      router.refresh();
    } catch {
      setError('Não foi possível entrar. Verifique suas credenciais e a conexão com a API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
        <p className="eyebrow">ACESSO AO SISTEMA</p>
        <h1>Entrar na plataforma</h1>
        <p className="subtitle">Acesse seu ambiente de gestão.</p>
        <form onSubmit={login} className="login-form">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  );
}
