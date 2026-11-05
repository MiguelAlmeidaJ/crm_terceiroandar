'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AppShell,ShellUser} from '@/components/app-shell';
import './marketing.css';
type Status='RASCUNHO'|'PLANEJADA'|'EM_ANDAMENTO'|'PAUSADA'|'CONCLUIDA'|'CANCELADA';
type Channel='INSTAGRAM'|'FACEBOOK'|'GOOGLE_ADS'|'EMAIL'|'WHATSAPP'|'SITE'|'EVENTO'|'INDICACAO'|'OUTRO';
type Campaign={id:string;name:string;description:string|null;channel:Channel;status:Status;budget:string|null;spent:string;captureToken:string;captureEnabled:boolean;startDate:string|null;endDate:string|null;_count:{contacts:number;leadCaptures:number}};
type Metrics={capturedLeads:number;costPerCapturedLead:string|null;linkedContacts:number;opportunities:number;won:number;lost:number;open:number;costPerLinkedContact:string|null;costPerOpportunity:string|null;costPerWon:string|null;opportunityWinRate:number|null;opportunityConversionRate:number|null;contactToOpportunityRate:number|null;wonOpportunityValue:string;note:string};
type Detail=Campaign&{contacts:{id:string;contact:{id:string;name:string;email:string|null}}[];opportunities:{id:string;title:string;stage:string;value:string|null;contact:{name:string}}[];metrics:Metrics};
type ChannelRow={channel:Channel;campaigns:number;linkedContacts:number;opportunities:number;won:number;lost:number;spent:string;costPerLinkedContact:string|null;costPerOpportunity:string|null;winRate:number|null};
type Opportunity={id:string;title:string;contact:{name:string};campaignId:string|null};
type User=ShellUser;
type Summary={total:number;active:number;participants:number;capturedLeads:number;budget:string;spent:string};
type Paged<T>={items:T[];total:number;page:number;pages:number};
type Contact={id:string;name:string;email:string|null};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
const statuses:Record<Status,string>={RASCUNHO:'Rascunho',PLANEJADA:'Planejada',EM_ANDAMENTO:'Em andamento',PAUSADA:'Pausada',CONCLUIDA:'Concluída',CANCELADA:'Cancelada'};
const channels:Record<Channel,string>={INSTAGRAM:'Instagram',FACEBOOK:'Facebook',GOOGLE_ADS:'Google Ads',EMAIL:'E-mail',WHATSAPP:'WhatsApp',SITE:'Site',EVENTO:'Evento',INDICACAO:'Indicação',OUTRO:'Outro'};
const empty={name:'',description:'',channel:'INSTAGRAM' as Channel,status:'RASCUNHO' as Status,budget:'',spent:'0',captureEnabled:false,startDate:'',endDate:''};
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
 const [opportunities,setOpportunities]=useState<Opportunity[]>([]);
 const [opportunityId,setOpportunityId]=useState('');
 const [channelRows,setChannelRows]=useState<ChannelRow[]>([]);
 const [page,setPage]=useState(1);
 const [status,setStatus]=useState('');
 const [search,setSearch]=useState('');
 const [searchInput,setSearchInput]=useState('');
 const [busy,setBusy]=useState(false);
 const [utmSource,setUtmSource]=useState('instagram');
 const [utmMedium,setUtmMedium]=useState('social');
 const [utmCampaign,setUtmCampaign]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const canEdit=user?.role==='ADMIN'||user?.role==='GESTOR';
 const reload=useCallback(async()=>{
  const query=new URLSearchParams({page:String(page)});
  if(status)query.set('status',status);
  if(search)query.set('q',search);
  const [result,totals,performance]=await Promise.all([request<Paged<Campaign>>('/marketing/campaigns?'+query),request<Summary>('/marketing/summary'),request<ChannelRow[]>('/marketing/report/channels')]);
  setList(result);setSummary(totals);setChannelRows(performance);
 },[page,status,search]);
 useEffect(()=>{let live=true;void(async()=>{
  try{
   const {user}=await request<{user:User}>('/auth/me');
   if(!live)return;
   if(user.role==='SYSTEM'){router.replace('/system/empresas');return;}
   setUser(user);
   const [result,opps]=await Promise.all([request<Paged<Contact>>('/crm/contacts?page=1'),request<Paged<Opportunity>>('/crm/opportunities?page=1')]);
   if(live){setContacts(result.items);setOpportunities(opps.items);}
  }catch(e){if(live)setError(e instanceof Error?e.message:'Erro na autenticação');}
  finally{if(live)setLoading(false)}
 })();return()=>{live=false};},[router]);
 useEffect(()=>{if(user)void reload().catch(e=>setError(e instanceof Error?e.message:'Erro ao carregar campanhas'));},[user,reload]);
 function edit(c:Campaign){setEditing(c.id);setForm({name:c.name,description:c.description||'',channel:c.channel,status:c.status,budget:c.budget||'',spent:c.spent,captureEnabled:c.captureEnabled,startDate:c.startDate?.slice(0,10)||'',endDate:c.endDate?.slice(0,10)||''});window.scrollTo({top:0,behavior:'smooth'});}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const payload={...form,budget:form.budget||null,startDate:form.startDate||null,endDate:form.endDate||null};
   await request('/marketing/campaigns'+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
   setForm(empty);setEditing(null);setNotice('Campanha salva com sucesso.');await reload();
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar');}finally{setBusy(false);}
 }
 async function open(id:string){
  try{setSelected(await request<Detail>('/marketing/campaigns/'+id));setContactId('');setOpportunityId('');}catch(e){setError(e instanceof Error?e.message:'Erro ao abrir campanha');}
 }
 async function link(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||!contactId)return;setBusy(true);setError('');setNotice('');
  try{
   await request('/marketing/campaigns/'+selected.id+'/contacts',{method:'POST',body:JSON.stringify({contactId})});
   await open(selected.id);await reload();setNotice('Contato vinculado.');
  }catch(e){setError(e instanceof Error?e.message:'Erro ao vincular');}finally{setBusy(false);}
 }
 async function linkOpportunity(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||!opportunityId)return;
  setBusy(true);setError('');setNotice('');
  try{
   await request('/marketing/campaigns/'+selected.id+'/opportunities',{method:'POST',body:JSON.stringify({opportunityId})});
   await open(selected.id);await reload();setNotice('Oportunidade atribuída à campanha.');
  }catch(e){setError(e instanceof Error?e.message:'Falha ao atribuir oportunidade');}
  finally{setBusy(false);}
 }
 async function unlinkOpportunity(id:string){
  if(!selected)return;
  setBusy(true);setError('');setNotice('');
  try{
   await request('/marketing/campaigns/'+selected.id+'/opportunities/'+id,{method:'DELETE'});
   await open(selected.id);await reload();setNotice('Atribuição removida. O contato continua vinculado à campanha.');
  }catch(e){setError(e instanceof Error?e.message:'Falha ao remover atribuição');}
  finally{setBusy(false);}
 }
 function captureLink(token:string){
  const url=new URL('/captura/'+encodeURIComponent(token),window.location.origin);
  if(utmSource.trim())url.searchParams.set('utm_source',utmSource.trim());
  if(utmMedium.trim())url.searchParams.set('utm_medium',utmMedium.trim());
  if(utmCampaign.trim())url.searchParams.set('utm_campaign',utmCampaign.trim());
  return url.toString();
 }
 async function copyCaptureLink(token:string){
  try{await navigator.clipboard.writeText(captureLink(token));setNotice('Link de captura copiado.');}
  catch{setError('Não foi possível copiar. Verifique as permissões do navegador.');}
 }
 const displayRate=(value:number|null)=>value===null?'—':value.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
 const displayCost=(value:string|null)=>value===null?'—':money(value);
 if(loading||!user)return <main className="loading-screen">{error||'Carregando Marketing...'}</main>;
 return <AppShell user={user}><main className="marketing-main">
  <div className="marketing-heading"><div><p className="eyebrow">GESTÃO / MARKETING</p><h1>Campanhas</h1><p className="subtitle">Planeje ações, registre investimentos e associe seus contatos.</p></div><Link href="/relacionamento">Ver contatos</Link></div>
  <section className="marketing-kpis"><article><span>Campanhas</span><strong>{summary?.total??'—'}</strong></article><article><span>Em andamento</span><strong>{summary?.active??'—'}</strong></article><article><span>Orçamento</span><strong>{summary?money(summary.budget):'—'}</strong></article><article><span>Gasto</span><strong>{summary?money(summary.spent):'—'}</strong></article><article><span>Leads captados pelo formulário</span><strong>{summary?.capturedLeads??'—'}</strong></article></section>
  {error&&<p className="marketing-error" role="alert">{error}</p>}{notice&&<p className="marketing-success" role="status">{notice}</p>}
  {canEdit&&<section className="marketing-panel"><h2>{editing?'Editar campanha':'Nova campanha'}</h2><form className="marketing-form" onSubmit={save}>
    <label>Nome *<input required minLength={2} maxLength={150} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Canal<select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value as Channel})}>{(Object.keys(channels) as Channel[]).map(k=><option key={k} value={k}>{channels[k]}</option>)}</select></label>
    <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{(Object.keys(statuses) as Status[]).map(k=><option key={k} value={k}>{statuses[k]}</option>)}</select></label>
    <label>Orçamento (R$)<input type="number" min="0" step="0.01" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></label>
    <label>Gasto realizado (R$)<input required type="number" min="0" step="0.01" value={form.spent} onChange={e=>setForm({...form,spent:e.target.value})}/></label>
    <label>Início<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
    <label>Término<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>
    <label className="marketing-wide marketing-capture-toggle"><input type="checkbox" checked={form.captureEnabled} onChange={e=>setForm({...form,captureEnabled:e.target.checked})}/><span>Habilitar formulário público de captação (somente campanhas em andamento recebem leads)</span></label>
    <label className="marketing-wide">Descrição<textarea rows={3} maxLength={3000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <div className="marketing-actions"><button type="submit" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':'Criar campanha'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty)}}>Cancelar</button>}</div>
  </form></section>}
  <section className="marketing-panel"><div className="marketing-list-heading"><h2>Campanhas cadastradas ({list.total})</h2><form onSubmit={e=>{e.preventDefault();setPage(1);setSearch(searchInput)}}><select aria-label="Status" value={status} onChange={e=>{setPage(1);setStatus(e.target.value)}}><option value="">Todos os status</option>{(Object.keys(statuses) as Status[]).map(k=><option key={k} value={k}>{statuses[k]}</option>)}</select><input placeholder="Buscar campanha" maxLength={100} value={searchInput} onChange={e=>setSearchInput(e.target.value)}/><button>Buscar</button></form></div>
   <div className="marketing-table"><table><thead><tr><th>Campanha</th><th>Canal</th><th>Status</th><th>Orçamento</th><th>Gasto</th><th>Contatos</th><th>Ações</th></tr></thead><tbody>
    {list.items.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td>{channels[c.channel]}</td><td>{statuses[c.status]}</td><td>{c.budget?money(c.budget):'—'}</td><td>{money(c.spent)}</td><td>{c._count.contacts}</td><td><button onClick={()=>void open(c.id)}>Detalhes</button>{canEdit&&<button onClick={()=>edit(c)}>Editar</button>}</td></tr>)}
   </tbody></table>{!list.items.length&&<p className="marketing-muted">Nenhuma campanha cadastrada.</p>}</div>
   <div className="marketing-pages"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page} de {Math.max(1,list.pages)}</span><button disabled={page>=list.pages} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
  </section>
  <section className="marketing-panel">
   <h2>Desempenho por canal</h2>
   <p className="marketing-muted">Custo por contato vinculado e por oportunidade atribuída, com base nos gastos informados.</p>
   <div className="marketing-table"><table><thead><tr><th>Canal</th><th>Campanhas</th><th>Contatos vinculados</th><th>Oportunidades</th><th>Ganhos</th><th>Gasto</th><th>Custo / contato</th><th>Custo / oportunidade</th><th>Taxa de ganho</th></tr></thead><tbody>
     {channelRows.map(row=><tr key={row.channel}><td>{channels[row.channel]}</td><td>{row.campaigns}</td><td>{row.linkedContacts}</td><td>{row.opportunities}</td><td>{row.won}</td><td>{money(row.spent)}</td><td>{displayCost(row.costPerLinkedContact)}</td><td>{displayCost(row.costPerOpportunity)}</td><td>{displayRate(row.winRate)}</td></tr>)}
   </tbody></table>{!channelRows.length&&<p className="marketing-muted">Sem dados para comparar canais.</p>}</div>
  </section>
  {selected&&<section className="marketing-panel"><div className="marketing-list-heading"><h2>{selected.name} — Contatos</h2><button onClick={()=>setSelected(null)}>Fechar</button></div>
   <p className="marketing-muted">Contatos vinculados não equivalem necessariamente a leads novos. Oportunidades atribuídas têm uma campanha de origem cada.</p>
   <section className="marketing-capture-block">
     <h3>Captação automática de leads</h3>
     <p className="marketing-muted">{selected.captureEnabled && selected.status==='EM_ANDAMENTO'
       ?'Formulário público ativo. Compartilhe seu link com UTMs para identificar a origem dos cadastros.'
       :'Formulário desativado ou campanha fora do status Em andamento. Edite a campanha para habilitar.'}</p>
     <div className="marketing-capture-fields">
       <label>utm_source<input maxLength={120} value={utmSource} onChange={e=>setUtmSource(e.target.value)}/></label>
       <label>utm_medium<input maxLength={120} value={utmMedium} onChange={e=>setUtmMedium(e.target.value)}/></label>
       <label>utm_campaign<input maxLength={120} value={utmCampaign} onChange={e=>setUtmCampaign(e.target.value)}/></label>
     </div>
     <div className="marketing-capture-actions"><button type="button" disabled={!selected.captureEnabled||selected.status!=='EM_ANDAMENTO'} onClick={()=>void copyCaptureLink(selected.captureToken)}>Copiar link rastreável</button></div>
   </section>
   <div className="marketing-attribution-kpis">
    <article><span>Contatos vinculados</span><strong>{selected.metrics.linkedContacts}</strong></article><article><span>Leads captados pelo formulário</span><strong>{selected.metrics.capturedLeads}</strong></article><article><span>Custo por lead captado</span><strong>{displayCost(selected.metrics.costPerCapturedLead)}</strong></article>
    <article><span>Oportunidades atribuídas</span><strong>{selected.metrics.opportunities}</strong></article>
    <article><span>Ganhos / perdidos</span><strong>{selected.metrics.won} / {selected.metrics.lost}</strong></article>
    <article><span>Taxa de ganho</span><strong>{displayRate(selected.metrics.opportunityWinRate)}</strong></article>
    <article><span>Custo / contato vinculado</span><strong>{displayCost(selected.metrics.costPerLinkedContact)}</strong></article>
    <article><span>Custo / oportunidade</span><strong>{displayCost(selected.metrics.costPerOpportunity)}</strong></article>
   </div>
   <p className="marketing-muted">{selected.metrics.note}</p>
   <h3>Oportunidades atribuídas</h3>
   {canEdit&&<form className="marketing-link-form" onSubmit={linkOpportunity}>
     <label>Oportunidade existente<select required value={opportunityId} onChange={e=>setOpportunityId(e.target.value)}>
       <option value="">Selecione uma oportunidade</option>
       {opportunities.filter(o=>!o.campaignId||o.campaignId===selected.id).map(o=><option key={o.id} value={o.id}>{o.title} — {o.contact.name}</option>)}
     </select></label><button disabled={!opportunityId||busy}>Atribuir campanha</button>
     <small>Exibindo as 30 oportunidades mais recentes sem outra atribuição. A vinculação também associa o contato à campanha.</small>
   </form>}
   <div className="marketing-table"><table><thead><tr><th>Oportunidade</th><th>Contato</th><th>Etapa</th><th>Valor estimado</th><th>Ação</th></tr></thead><tbody>
    {selected.opportunities.map(o=><tr key={o.id}><td>{o.title}</td><td>{o.contact.name}</td><td>{o.stage}</td><td>{o.value?money(o.value):'—'}</td><td>{canEdit&&<button disabled={busy} onClick={()=>void unlinkOpportunity(o.id)}>Desvincular</button>}</td></tr>)}
   </tbody></table>{!selected.opportunities.length&&<p className="marketing-muted">Nenhuma oportunidade atribuída.</p>}</div>
   {selected.opportunities.length===100&&<p className="marketing-muted">Exibindo até 100 oportunidades recentes.</p>}
   <h3>Contatos vinculados</h3>
   {canEdit&&<form className="marketing-link-form" onSubmit={link}><label>Contato<select required value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">Selecione</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button disabled={!contactId||busy}>Vincular</button><small>Seleção limitada aos primeiros 20 contatos da lista.</small></form>}
   <div className="marketing-linked">{selected.contacts.map(item=><Link href={'/relacionamento/contatos/'+item.contact.id} key={item.id}><strong>{item.contact.name}</strong><small>{item.contact.email||'Sem e-mail'}</small></Link>)}{!selected.contacts.length&&<p className="marketing-muted">Nenhum contato vinculado.</p>}</div>
   {selected.contacts.length===100&&<p className="marketing-muted">Exibindo até 100 vínculos.</p>}
  </section>}
 </main></AppShell>;
}
