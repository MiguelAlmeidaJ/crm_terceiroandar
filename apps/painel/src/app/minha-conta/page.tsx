'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, ShellUser } from '@/components/app-shell';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
export default function MinhaConta(){
 const router=useRouter();
 const [user,setUser]=useState<ShellUser|null>(null);
 const [name,setName]=useState('');
 const [currentPassword,setCurrentPassword]=useState('');
 const [newPassword,setNewPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{void fetch(API+'/auth/me',{credentials:'include',cache:'no-store'}).then(async r=>{if(!r.ok){router.replace('/login');return}const {user}=await r.json() as {user:ShellUser};setUser(user);setName(user.name)}).catch(()=>setError('Não foi possível carregar seu perfil.'))},[router]);
 async function send(url:string,payload:unknown){
  const res=await fetch(API+url,{method:url.endsWith('profile')?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){const body=await res.json().catch(()=>({})) as {message?:string|string[]};throw new Error(Array.isArray(body.message)?body.message.join(', '):body.message||'Não foi possível salvar.')}
  return res.json();
 }
 async function saveProfile(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await send('/auth/profile',{name}) as {user:ShellUser};setUser(result.user);setMessage('Perfil atualizado com sucesso.')}catch(e){setError(e instanceof Error?e.message:'Erro ao salvar perfil')}finally{setBusy(false)}}
 async function changePassword(e:FormEvent<HTMLFormElement>){e.preventDefault();if(newPassword!==confirmation){setError('A confirmação não corresponde à nova senha.');return}setBusy(true);setError('');setMessage('');try{await send('/auth/change-password',{currentPassword,newPassword});setCurrentPassword('');setNewPassword('');setConfirmation('');setMessage('Senha alterada. Suas sessões anteriores foram invalidadas.')}catch(e){setError(e instanceof Error?e.message:'Erro ao trocar senha')}finally{setBusy(false)}}
 if(!user)return <main className="loading-screen">{error||'Carregando conta...'}</main>;
 return <AppShell user={user}><main className="ta-profile"><div className="ta-profile-title"><p className="eyebrow">CONFIGURAÇÕES / CONTA</p><h1>Minha conta</h1><p className="subtitle">Gerencie seus dados pessoais e a segurança do seu acesso.</p></div>
  <div className="ta-profile-grid">
   <section className="ta-profile-panel"><h2>Informações do perfil</h2><p className="subtitle">Dados associados ao seu acesso.</p><form onSubmit={saveProfile}>
    <label>Nome completo<input minLength={2} maxLength={120} required value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>E-mail<input value={user.email||''} disabled readOnly/></label>
    <label>Permissão<input value={user.role==='ADMIN'?'Administrador':user.role==='GESTOR'?'Gestor':'Colaborador'} disabled readOnly/></label>
    <button type="submit" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button>
   </form></section>
   <section className="ta-profile-panel" id="seguranca"><h2>Segurança da conta</h2><p className="subtitle">Use uma senha forte de pelo menos 12 caracteres.</p><form onSubmit={changePassword}>
    <label>Senha atual<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
    <label>Nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
    <label>Confirmar nova senha<input type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
    <button type="submit" disabled={busy}>{busy?'Atualizando...':'Trocar senha'}</button>
   </form></section>
  </div>{error&&<p className="ta-profile-error" role="alert">{error}</p>}{message&&<p className="ta-profile-success" role="status">{message}</p>}
 </main></AppShell>;
}
