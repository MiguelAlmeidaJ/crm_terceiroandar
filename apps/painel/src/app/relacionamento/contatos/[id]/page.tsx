'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell, ShellUser } from '@/components/app-shell';
import './contato.css';

type Channel='LIGACAO'|'WHATSAPP'|'EMAIL'|'REUNIAO'|'NOTA';
type Contact={
 id:string;name:string;email:string|null;phone:string|null;company:string|null;
 jobTitle:string|null;website:string|null;source:string|null;notes:string|null;tags:string[];
 createdAt:string;updatedAt:string;
 opportunities:{id:string;title:string;stage:string;value:string|null;createdAt:string;owner:{name:string}|null}[];
};
type Interaction={id:string;channel:Channel;description:string;occurredAt:string;createdAt:string;author:{id:string;name:string}};
type Paged<T>={items:T[];total:number;page:number;pages:number};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
const channels:Record<Channel,string>={LIGACAO:'Ligação',WHATSAPP:'WhatsApp',EMAIL:'E-mail',REUNIAO:'Reunião',NOTA:'Anotação'};
const labels:Record<string,string>={NOVO:'Novo',QUALIFICACAO:'Qualificação',PROPOSTA:'Proposta',NEGOCIACAO:'Negociação',GANHO:'Ganho',PERDIDO:'Perdido'};
const currency=(v:string|null)=>v?Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
async function request<T>(path:string, init?:RequestInit):Promise<T>{
 const result=await fetch(API+path,{...init,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json',...init?.headers}});
 if(!result.ok){const data=await result.json().catch(()=>({})) as {message?:string|string[]};throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Erro na API');}
 return result.json() as Promise<T>;
}
export default function ContactDetails(){
 const params=useParams<{id:string}>();const router=useRouter();
 const id=params.id;
 const [user,setUser]=useState<ShellUser|null>(null);
 const [contact,setContact]=useState<Contact|null>(null);
 const [history,setHistory]=useState<Paged<Interaction>>({items:[],total:0,page:1,pages:0});
 const [page,setPage]=useState(1);
 const [channel,setChannel]=useState<Channel>('NOTA');
 const [description,setDescription]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const reload=useCallback(async()=>{
  const [c,h]=await Promise.all([
   request<Contact>('/crm/contacts/'+encodeURIComponent(id)),
   request<Paged<Interaction>>('/crm/contacts/'+encodeURIComponent(id)+'/interactions?page='+page)
  ]);
  setContact(c);setHistory(h);
 },[id,page]);
 useEffect(()=>{let live=true;void(async()=>{
  try{const {user}=await request<{user:ShellUser}>('/auth/me');if(!live)return;
   if(user.role==='SYSTEM'){router.replace('/system/empresas');return;}setUser(user);
  }catch{if(live)router.replace('/login');}finally{if(live)setLoading(false)}
 })();return()=>{live=false}},[router]);
 useEffect(()=>{if(user)void reload().catch(e=>setError(e instanceof Error?e.message:'Não foi possível carregar o contato'))},[user,reload]);
 async function addInteraction(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   await request('/crm/contacts/'+encodeURIComponent(id)+'/interactions',{method:'POST',body:JSON.stringify({channel,description})});
   setDescription('');setPage(1);await reload();setNotice('Interação registrada com sucesso.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a interação')}finally{setBusy(false)}
 }
 if(loading||!user)return <main className="loading-screen">Carregando contato...</main>;
 return <AppShell user={user}><main className="contact-details">
  <div className="contact-breadcrumb"><Link href="/relacionamento">Relacionamento</Link> / Contatos / Ficha</div>
  {error&&<p role="alert" className="contact-alert">{error}</p>}
  {notice&&<p role="status" className="contact-success">{notice}</p>}
  {!contact?<p>Carregando informações...</p>:<>
   <section className="contact-intro">
    <div className="contact-avatar">{contact.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}</div>
    <div><p className="eyebrow">FICHA DO RELACIONAMENTO</p><h1>{contact.name}</h1><p>{[contact.jobTitle,contact.company].filter(Boolean).join(' · ')||'Contato cadastrado'}</p>
     <div className="contact-tags">{contact.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
    </div>
    <Link href="/relacionamento" className="contact-back">Voltar para contatos</Link>
   </section>
   <div className="contact-layout">
    <div className="contact-column">
     <section className="contact-panel"><h2>Informações de contato</h2><dl className="contact-fields">
      <div><dt>E-mail</dt><dd>{contact.email||'Não informado'}</dd></div>
      <div><dt>Telefone</dt><dd>{contact.phone||'Não informado'}</dd></div>
      <div><dt>Empresa</dt><dd>{contact.company||'Não informada'}</dd></div>
      <div><dt>Cargo</dt><dd>{contact.jobTitle||'Não informado'}</dd></div>
      <div><dt>Origem</dt><dd>{contact.source||'Não informada'}</dd></div>
      <div><dt>Website</dt><dd>{contact.website||'Não informado'}</dd></div>
     </dl>{contact.notes&&<div className="contact-notes"><strong>Observações</strong><p>{contact.notes}</p></div>}</section>
     <section className="contact-panel"><h2>Oportunidades vinculadas ({contact.opportunities.length})</h2>
      {contact.opportunities.length===0?<p className="contact-empty">Nenhuma oportunidade vinculada.</p>:
      <div className="contact-opportunities">{contact.opportunities.map(o=><article key={o.id}><strong>{o.title}</strong><span>{labels[o.stage]||o.stage}</span><small>{currency(o.value)} · {o.owner?.name||'Sem responsável'}</small></article>)}</div>}
     </section>
    </div>
    <div className="contact-column">
     <section className="contact-panel"><h2>Registrar interação</h2><p className="contact-muted">Mantenha o histórico de cada atendimento.</p>
      <form className="contact-interaction-form" onSubmit={addInteraction}>
       <label>Canal<select value={channel} onChange={e=>setChannel(e.target.value as Channel)}>{(Object.keys(channels) as Channel[]).map(c=><option value={c} key={c}>{channels[c]}</option>)}</select></label>
       <label>Descrição<textarea rows={4} required minLength={2} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Registre o que foi conversado, próximos passos ou informações importantes..."/></label>
       <button type="submit" disabled={busy}>{busy?'Salvando...':'Registrar interação'}</button>
      </form>
     </section>
     <section className="contact-panel"><h2>Histórico de relacionamento ({history.total})</h2>
      {!history.items.length?<p className="contact-empty">Nenhum atendimento registrado até agora.</p>:
       <div className="contact-timeline">{history.items.map(item=><article key={item.id}>
        <div className="contact-timeline-dot"/>
        <div><div className="contact-timeline-top"><strong>{channels[item.channel]}</strong><span>{new Date(item.occurredAt).toLocaleString('pt-BR')}</span></div><p>{item.description}</p><small>Registrado por {item.author.name}</small></div>
       </article>)}</div>}
      <div className="contact-pagination"><button disabled={page<=1} onClick={()=>setPage(x=>x-1)}>Anterior</button><span>{page} / {Math.max(1,history.pages)}</span><button disabled={page>=history.pages} onClick={()=>setPage(x=>x+1)}>Próxima</button></div>
     </section>
    </div>
   </div>
  </>}
 </main></AppShell>;
}
