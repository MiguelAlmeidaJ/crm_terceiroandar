'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AppShell,ShellUser} from '@/components/app-shell';
import './marketing.css';
type Status='RASCUNHO'|'PLANEJADA'|'EM_ANDAMENTO'|'PAUSADA'|'CONCLUIDA'|'CANCELADA';
type Channel='INSTAGRAM'|'FACEBOOK'|'GOOGLE_ADS'|'EMAIL'|'WHATSAPP'|'SITE'|'EVENTO'|'INDICACAO'|'OUTRO';
type Campaign={id:string;name:string;description:string|null;channel:Channel;status:Status;budget:string|null;spent:string;startDate:string|null;endDate:string|null;_count:{contacts:number}};
type Detail=Campaign&{contacts:{id:string;contact:{id:string;name:string;email:string|null}}[]};
type User=ShellUser;
type Summary={total:number;active:number;participants:number;budget:string;spent:string};
type Paged<T>={items:T[];total:number;page:number;pages:number};
type Contact={id:string;name:string;email:string|null};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
const statuses:Record<Status,string>={RASCUNHO:'Rascunho',PLANEJADA:'Planejada',EM_ANDAMENTO:'Em andamento',PAUSADA:'Pausada',CONCLUIDA:'Concluída',CANCELADA:'Cancelada'};
const channels:Record<Channel,string>={INSTAGRAM:'Instagram',FACEBOOK:'Facebook',GOOGLE_ADS:'Google Ads',EMAIL:'E-mail',WHATSAPP:'WhatsApp',SITE:'Site',EVENTO:'Evento',INDICACAO:'Indicação',OUTRO:'Outro'};
const empty={name:'',description:'',channel:'INSTAGRAM' as Channel,status:'RASCUNHO' as Status,budget:'',spent:'0',startDate:'',endDate:''};
const money=(v:string|null)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function request<T>(path:string,options?:RequestInit):Promise<T>{
 const r=await fetch(API+path,{...options,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json',...options?.headers}});
 if(!r.ok){const d=await r.json().catch(()=>({})) as {message?:string|string[]};throw new Error(Array.isArray(d.message)?d.message.join(', '):d.message||'Falha na requisição');}
 return r.json() as Promise<T>;
}
export default function Marketing(){
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null);
 const [list,setList]=useState<Paged<Campaign>>({items:[],total:0,page:1,pages:0});
 const [summary,setSummary]=useState<Summary|null>(null);
 const [form,setForm]=useState(empty);
 const [editing,setEditing]=useState<string|null>(null);
 const [selected,setSelected]=useState<Detail|null>(null);
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [contactId,setContactId]=useState('');
 const [page,setPage]=useState(1);
 const [status,setStatus]=useState('');
 const [search,setSearch]=useState('');
 const [searchInput,setSearchInput]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const canEdit=user?.role==='ADMIN'||user?.role==='GESTOR';
 const reload=useCallback(async()=>{
  const query=new URLSearchParams({page:String(page)});
  if(status)query.set('status',status);
  if(search)query.set('q',search);
  const [result,totals]=await Promise.all([request<Paged<Campaign>>('/marketing/campaigns?'+query),request<Summary>('/marketing/summary')]);
  setList(result);setSummary(totals);
 },[page,status,search]);
 useEffect(()=>{let live=true;void(async()=>{
  try{
   const {user}=await request<{user:User}>('/auth/me');
   if(!live)return;
   if(user.role==='SYSTEM'){router.replace('/system/empresas');return;}
   setUser(user);
   const result=await request<Paged<Contact>>('/crm/contacts?page=1');
   if(live)setContacts(result.items);
  }catch(e){if(live)setError(e instanceof Error?e.message:'Erro na autenticação');}
  finally{if(live)setLoading(false)}
 })();return()=>{live=false};},[router]);
 useEffect(()=>{if(user)void reload().catch(e=>setError(e instanceof Error?e.message:'Erro ao carregar campanhas'));},[user,reload]);
 function edit(c:Campaign){setEditing(c.id);setForm({name:c.name,description:c.description||'',channel:c.channel,status:c.status,budget:c.budget||'',spent:c.spent,startDate:c.startDate?.slice(0,10)||'',endDate:c.endDate?.slice(0,10)||''});window.scrollTo({top:0,behavior:'smooth'});}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const payload={...form,budget:form.budget||null,startDate:form.startDate||null,endDate:form.endDate||null};
   await request('/marketing/campaigns'+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
   setForm(empty);setEditing(null);setNotice('Campanha salva com sucesso.');await reload();
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar');}finally{setBusy(false);}
 }
 async function open(id:string){
  try{setSelected(await request<Detail>('/marketing/campaigns/'+id));setContactId('');}catch(e){setError(e instanceof Error?e.message:'Erro ao abrir campanha');}
 }
 async function link(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||!contactId)return;setBusy(true);setError('');setNotice('');
  try{
   await request('/marketing/campaigns/'+selected.id+'/contacts',{method:'POST',body:JSON.stringify({contactId})});
   await open(selected.id);await reload();setNotice('Contato vinculado.');
  }catch(e){setError(e instanceof Error?e.message:'Erro ao vincular');}finally{setBusy(false);}
 }
 if(loading||!user)return <main className="loading-screen">{error||'Carregando Marketing...'}</main>;
 return <AppShell user={user}><main className="marketing-main">
  <div className="marketing-heading"><div><p className="eyebrow">GESTÃO / MARKETING</p><h1>Campanhas</h1><p className="subtitle">Planeje ações, registre investimentos e associe seus contatos.</p></div><Link href="/relacionamento">Ver contatos</Link></div>
  <section className="marketing-kpis"><article><span>Campanhas</span><strong>{summary?.total??'—'}</strong></article><article><span>Em andamento</span><strong>{summary?.active??'—'}</strong></article><article><span>Orçamento</span><strong>{summary?money(summary.budget):'—'}</strong></article><article><span>Gasto</span><strong>{summary?money(summary.spent):'—'}</strong></article><article><span>Contatos vinculados</span><strong>{summary?.participants??'—'}</strong></article></section>
  {error&&<p className="marketing-error" role="alert">{error}</p>}{notice&&<p className="marketing-success" role="status">{notice}</p>}
  {canEdit&&<section className="marketing-panel"><h2>{editing?'Editar campanha':'Nova campanha'}</h2><form className="marketing-form" onSubmit={save}>
    <label>Nome *<input required minLength={2} maxLength={150} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Canal<select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value as Channel})}>{(Object.keys(channels) as Channel[]).map(k=><option key={k} value={k}>{channels[k]}</option>)}</select></label>
    <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{(Object.keys(statuses) as Status[]).map(k=><option key={k} value={k}>{statuses[k]}</option>)}</select></label>
    <label>Orçamento (R$)<input type="number" min="0" step="0.01" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></label>
    <label>Gasto realizado (R$)<input required type="number" min="0" step="0.01" value={form.spent} onChange={e=>setForm({...form,spent:e.target.value})}/></label>
    <label>Início<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
    <label>Término<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>
    <label className="marketing-wide">Descrição<textarea rows={3} maxLength={3000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <div className="marketing-actions"><button type="submit" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':'Criar campanha'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty)}}>Cancelar</button>}</div>
  </form></section>}
  <section className="marketing-panel"><div className="marketing-list-heading"><h2>Campanhas cadastradas ({list.total})</h2><form onSubmit={e=>{e.preventDefault();setPage(1);setSearch(searchInput)}}><select aria-label="Status" value={status} onChange={e=>{setPage(1);setStatus(e.target.value)}}><option value="">Todos os status</option>{(Object.keys(statuses) as Status[]).map(k=><option key={k} value={k}>{statuses[k]}</option>)}</select><input placeholder="Buscar campanha" maxLength={100} value={searchInput} onChange={e=>setSearchInput(e.target.value)}/><button>Buscar</button></form></div>
   <div className="marketing-table"><table><thead><tr><th>Campanha</th><th>Canal</th><th>Status</th><th>Orçamento</th><th>Gasto</th><th>Contatos</th><th>Ações</th></tr></thead><tbody>
    {list.items.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td>{channels[c.channel]}</td><td>{statuses[c.status]}</td><td>{c.budget?money(c.budget):'—'}</td><td>{money(c.spent)}</td><td>{c._count.contacts}</td><td><button onClick={()=>void open(c.id)}>Detalhes</button>{canEdit&&<button onClick={()=>edit(c)}>Editar</button>}</td></tr>)}
   </tbody></table>{!list.items.length&&<p className="marketing-muted">Nenhuma campanha cadastrada.</p>}</div>
   <div className="marketing-pages"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page} de {Math.max(1,list.pages)}</span><button disabled={page>=list.pages} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
  </section>
  {selected&&<section className="marketing-panel"><div className="marketing-list-heading"><h2>{selected.name} — Contatos</h2><button onClick={()=>setSelected(null)}>Fechar</button></div>
   <p className="marketing-muted">Contatos vinculados não equivalem necessariamente a conversões.</p>
   {canEdit&&<form className="marketing-link-form" onSubmit={link}><label>Contato<select required value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">Selecione</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button disabled={!contactId||busy}>Vincular</button><small>Seleção limitada aos primeiros 20 contatos da lista.</small></form>}
   <div className="marketing-linked">{selected.contacts.map(item=><Link href={'/relacionamento/contatos/'+item.contact.id} key={item.id}><strong>{item.contact.name}</strong><small>{item.contact.email||'Sem e-mail'}</small></Link>)}{!selected.contacts.length&&<p className="marketing-muted">Nenhum contato vinculado.</p>}</div>
   {selected.contacts.length===100&&<p className="marketing-muted">Exibindo até 100 vínculos.</p>}
  </section>}
 </main></AppShell>;
}
