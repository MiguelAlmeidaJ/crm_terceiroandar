'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import './captura.css';

type PublicCampaign={name:string;description:string|null;company:string;channel:string};
type UTM={utm_source:string;utm_medium:string;utm_campaign:string;utm_content:string;utm_term:string};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001/api';
export default function PublicLeadCapture(){
 const {token}=useParams<{token:string}>();
 const [campaign,setCampaign]=useState<PublicCampaign|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState(false);
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [phone,setPhone]=useState('');
 const [website,setWebsite]=useState('');
 const [consent,setConsent]=useState(false);
 const [utm,setUtm]=useState<UTM>({utm_source:'',utm_medium:'',utm_campaign:'',utm_content:'',utm_term:''});

 useEffect(()=>{
  let alive=true;
  const params=new URLSearchParams(window.location.search);
  const fields=Object.keys(utm) as (keyof UTM)[];
  const parsed={} as UTM;
  for(const field of fields)parsed[field]=(params.get(field)||'').slice(0,120);
  setUtm(parsed);
  void fetch(API+'/public/campaigns/'+encodeURIComponent(token),{cache:'no-store',credentials:'omit'})
   .then(async response=>{
    if(!response.ok)throw new Error('Este formulário não está disponível no momento.');
    return response.json() as Promise<PublicCampaign>;
   })
   .then(data=>{if(alive)setCampaign(data)})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:'Não foi possível carregar o formulário')})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 // token determines which campaign is shown. No UTM update is needed after mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch(API+'/public/campaigns/'+encodeURIComponent(token)+'/leads',{
    method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,email,phone,website,consent,...utm}),
   });
   if(!response.ok){
    const body=await response.json().catch(()=>({})) as {message?:string|string[]};
    throw new Error(Array.isArray(body.message)?body.message.join(', '):body.message||'Não foi possível enviar seus dados.');
   }
   setSuccess(true);
  }catch(e){setError(e instanceof Error?e.message:'Erro ao enviar formulário')}
  finally{setBusy(false)}
 }
 return <main className="lead-page">
  <div className="lead-shell">
   <header className="lead-top"><span className="lead-mark">3A</span><div><strong>Terceiro Andar</strong><span>Marketing & Relacionamento</span></div></header>
   <div className="lead-content">
    <section className="lead-story">
     <p className="lead-overline">FALE COM A NOSSA EQUIPE</p>
     <h1>{campaign?.name||'Conecte-se com a gente.'}</h1>
     <p>{campaign?.description||'Preencha seus dados para que possamos entrar em contato e conhecer suas necessidades.'}</p>
     {campaign&&<div className="lead-company">Campanha de {campaign.company}</div>}
    </section>
    <section className="lead-card">
     {loading?<p role="status">Carregando formulário...</p>:!campaign?<div role="alert" className="lead-error">{error}</div>:success?
      <div className="lead-done"><span>✓</span><h2>Recebemos seu contato!</h2><p>Obrigado pelo interesse. Nossa equipe poderá entrar em contato pelos dados fornecidos.</p></div>:
      <>
       <p className="lead-card-kicker">CONTATO</p>
       <h2>Vamos conversar?</h2>
       <p>Informe seus dados para que possamos retornar.</p>
       <form onSubmit={e=>void submit(e)}>
        <label>Nome completo *<input required autoComplete="name" minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?"/></label>
        <label>E-mail *<input required autoComplete="email" type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label>
        <label>Telefone <input autoComplete="tel" type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000"/></label>
        <div className="lead-honeypot" aria-hidden="true"><label htmlFor="lead-website">Não preencha este campo</label><input id="lead-website" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></div>
        <label className="lead-consent"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Concordo em fornecer os dados acima para que {campaign.company} entre em contato sobre esta solicitação. *</span></label>
        {error&&<p role="alert" className="lead-error">{error}</p>}
        <button disabled={busy||!consent} type="submit">{busy?'Enviando...':'Solicitar contato'}</button>
       </form>
       <small>Seus dados serão encaminhados à empresa responsável pela campanha. Não utilizamos este formulário para criar uma conta.</small>
      </>}
    </section>
   </div>
   <footer>© {new Date().getFullYear()} Terceiro Andar. Relacionamentos que geram resultados.</footer>
  </div>
 </main>;
}
