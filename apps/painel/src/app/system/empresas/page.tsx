'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, ShellUser } from '@/components/app-shell';
import './empresas.css';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
type Company={id:string;name:string;slug:string;active:boolean;isLegacy:boolean;_count:{users:number;contacts:number;opportunities:number;tasks:number}};
const initial={name:'',slug:'',adminName:'',adminEmail:'',adminPassword:'',importLegacy:false};
function errorMessage(body:unknown):string {
 if(!body||typeof body!=='object')return 'Não foi possível salvar.';
 const message=(body as {message?:string|string[]}).message;
 return Array.isArray(message)?message.join(', '):message||'Não foi possível salvar.';
}
export default function EmpresasPage(){
 const router=useRouter();
 const [user,setUser]=useState<ShellUser|null>(null);
 const [companies,setCompanies]=useState<Company[]>([]);
 const [form,setForm]=useState(initial);
 const [saving,setSaving]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [newName,setNewName]=useState('');
 const legacy=companies.find(c=>c.isLegacy);
 const legacyCount=(legacy?legacy._count.contacts+legacy._count.opportunities+legacy._count.tasks+legacy._count.users:0);
 const refresh=useCallback(async()=>{
  const response=await fetch(API+'/system/companies',{credentials:'include',cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível carregar as empresas');
  setCompanies(await response.json() as Company[]);
 },[]);
 useEffect(()=>{let live=true;void (async()=>{
  try{
   const response=await fetch(API+'/auth/me',{credentials:'include',cache:'no-store'});
   if(response.status===401){router.replace('/login');return}
   if(!response.ok)throw new Error('Falha ao verificar a sessão');
   const {user}=await response.json() as {user:ShellUser};
   if(user.role!=='SYSTEM'){router.replace('/');return}
   if(live)setUser(user);
   await refresh();
  }catch(e){if(live)setError(e instanceof Error?e.message:'Erro de conexão')}
  finally{if(live)setLoading(false)}
 })();return()=>{live=false}},[router,refresh]);
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError('');setNotice('');
  try{
   const response=await fetch(API+'/system/companies',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   if(!response.ok)throw new Error(errorMessage(await response.json().catch(()=>({}))));
   await refresh();setForm(initial);setNotice('Empresa e administrador criados com sucesso.');
  }catch(e){setError(e instanceof Error?e.message:'Falha ao criar empresa')}finally{setSaving(false)}
 }
 async function update(company:Company,changes:{name?:string;active?:boolean}){
  setSaving(true);setError('');setNotice('');
  try{
   const response=await fetch(API+'/system/companies/'+company.id,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)});
   if(!response.ok)throw new Error(errorMessage(await response.json().catch(()=>({}))));
   await refresh();setEditing(null);setNotice('Empresa atualizada.');
  }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar empresa')}finally{setSaving(false)}
 }
 if(loading||!user)return <main className="loading-screen">{error||'Carregando empresas...'}</main>;
 return <AppShell user={user}><main className="tenant-main">
  <div className="tenant-heading"><p className="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h1>Empresas</h1><p className="subtitle">Gerencie ambientes isolados, administradores e os dados da empresa.</p></div>
  <section className="tenant-stats"><article><span>Empresas</span><strong>{companies.length}</strong></article><article><span>Usuários empresariais</span><strong>{companies.reduce((total,c)=>total+c._count.users,0)}</strong></article><article><span>Contatos</span><strong>{companies.reduce((total,c)=>total+c._count.contacts,0)}</strong></article></section>
  {error&&<p role="alert" className="tenant-error">{error}</p>}{notice&&<p role="status" className="tenant-success">{notice}</p>}
  <section className="tenant-panel"><div className="tenant-section-head"><div><h2>Nova empresa</h2><p className="subtitle">Ao criar uma empresa, o primeiro usuário recebe o papel de administrador dela.</p></div></div>
   <form className="tenant-form" onSubmit={create}>
    <label>Nome da empresa *<input required minLength={2} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Terceiro Andar"/></label>
    <label>Identificador *<input required minLength={3} maxLength={50} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder="terceiro-andar"/></label>
    <label>Nome do administrador *<input required minLength={2} maxLength={120} value={form.adminName} onChange={e=>setForm({...form,adminName:e.target.value})}/></label>
    <label>E-mail do administrador *<input type="email" required value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})}/></label>
    <label>Senha inicial *<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})}/></label>
    <div className="tenant-checkbox"><label><input type="checkbox" checked={form.importLegacy} disabled={!legacy||legacyCount===0} onChange={e=>setForm({...form,importLegacy:e.target.checked})}/> Transferir dados e usuários existentes da empresa Legado</label><small>Transfere contatos, oportunidades, tarefas, atividades e usuários da empresa Legado para esta nova empresa. Operação integral; não será possível desfazer automaticamente.</small></div>
    <div className="tenant-actions"><button disabled={saving} type="submit">{saving?'Salvando...':'Criar empresa e administrador'}</button></div>
   </form>
  </section>
  <section className="tenant-panel"><div className="tenant-section-head"><div><h2>Empresas cadastradas</h2><p className="subtitle">Os dados de cada empresa permanecem separados.</p></div></div>
   <div className="tenant-table-wrap"><table><thead><tr><th>Empresa</th><th>Identificador</th><th>Usuários</th><th>Contatos</th><th>Oportunidades</th><th>Status</th><th>Ações</th></tr></thead><tbody>
   {companies.map(company=><tr key={company.id}>
    <td><strong>{company.name}</strong>{company.isLegacy&&<span className="tenant-legacy">Legado</span>}</td>
    <td>{company.slug}</td><td>{company._count.users}</td><td>{company._count.contacts}</td><td>{company._count.opportunities}</td>
    <td><span className={company.active?'tenant-active':'tenant-inactive'}>{company.active?'Ativa':'Suspensa'}</span></td>
    <td><div className="tenant-row-actions"><button type="button" onClick={()=>{setEditing(company.id);setNewName(company.name)}}>Renomear</button><button type="button" disabled={saving} onClick={()=>void update(company,{active:!company.active})}>{company.active?'Suspender':'Ativar'}</button></div></td>
   </tr>)}</tbody></table></div>
   {editing&&<form className="tenant-rename" onSubmit={e=>{e.preventDefault();const company=companies.find(c=>c.id===editing);if(company)void update(company,{name:newName})}}><label>Novo nome<input value={newName} required minLength={2} maxLength={120} onChange={e=>setNewName(e.target.value)}/></label><button disabled={saving}>Salvar nome</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button></form>}
  </section>
 </main></AppShell>
}
