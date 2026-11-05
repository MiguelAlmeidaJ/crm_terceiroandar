'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, ShellUser } from '@/components/app-shell';
import './importar.css';

type ContactRow = { name:string; email?:string; phone?:string; company?:string; source?:string; jobTitle?:string; notes?:string; tags?:string };
type RowStatus = { row:number; name:string; status:'ready'|'duplicate'|'invalid'|'imported'; reason?:string };
type Preview = { total:number;ready:number;duplicates:number;invalid:number;results:RowStatus[] };
type Result = { total:number;imported:number;duplicates:number;invalid:number;results:RowStatus[] };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const columns: Record<string,keyof ContactRow> = {
  nome:'name', name:'name', email:'email', 'e-mail':'email', telefone:'phone', phone:'phone',
  empresa:'company', company:'company', origem:'source', source:'source',
  cargo:'jobTitle', jobtitle:'jobTitle', observacoes:'notes', observação:'notes', notes:'notes',
  etiquetas:'tags', tags:'tags',
};
const canonical = ['name','email','phone','company','source','jobTitle','notes','tags'] as const;

function parseCsv(csv:string):string[][]{
  const lines:string[][]=[];let row:string[]=[];let field='';let quoted=false;
  const raw=csv.replace(/^\uFEFF/,'');
  const first=raw.split(/\r?\n/,1)[0];const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  for(let i=0;i<raw.length;i++){
    const char=raw[i];
    if(quoted){
      if(char==='"'&&raw[i+1]==='"'){field+='"';i++;}
      else if(char==='"')quoted=false;
      else field+=char;
    }else if(char==='"'){
      if(field.trim())throw new Error('Aspas inválidas na planilha');
      quoted=true;
    }else if(char===delimiter){row.push(field.trim());field='';}
    else if(char==='\n'||char==='\r'){
      if(char==='\r'&&raw[i+1]==='\n')i++;
      row.push(field.trim());field='';
      if(row.some(v=>v!==''))lines.push(row);
      row=[];
    }else field+=char;
  }
  if(quoted)throw new Error('Arquivo com aspas não fechadas');
  row.push(field.trim());if(row.some(v=>v!==''))lines.push(row);
  return lines;
}
function parseContacts(csv:string):ContactRow[]{
  const parsed=parseCsv(csv);
  if(parsed.length<2)throw new Error('Inclua o cabeçalho e pelo menos um contato.');
  const header=parsed[0].map(x=>x.toLowerCase().trim());
  const mapped=header.map(k=>columns[k]);
  if(!mapped.includes('name'))throw new Error('O cabeçalho precisa conter a coluna nome.');
  if(mapped.filter(x=>x==='name').length!==1)throw new Error('Cabeçalho de nome repetido.');
  if(new Set(mapped.filter(Boolean)).size!==mapped.filter(Boolean).length)throw new Error('Colunas repetidas no cabeçalho.');
  if(parsed.length-1>200)throw new Error('Máximo de 200 contatos por arquivo.');
  return parsed.slice(1).map((values,i)=>{
    if(values.length!==header.length)throw new Error('Quantidade de colunas diferente na linha '+(i+2)+'.');
    const result:ContactRow={name:''};
    mapped.forEach((key,j)=>{if(key)result[key]=values[j];});
    return result;
  });
}
async function call<T>(endpoint:string,rows:ContactRow[]):Promise<T>{
  const response=await fetch(API+endpoint,{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows})
  });
  if(!response.ok){
    const payload=await response.json().catch(()=>({})) as {message?:string|string[]};
    throw new Error(Array.isArray(payload.message)?payload.message.join(', '):payload.message||'Falha na importação.');
  }
  return response.json() as Promise<T>;
}

export default function ImportarContatos(){
  const router=useRouter();
  const [user,setUser]=useState<ShellUser|null>(null);
  const [name,setName]=useState('');
  const [rows,setRows]=useState<ContactRow[]>([]);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [result,setResult]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{void fetch(API+'/auth/me',{credentials:'include',cache:'no-store'})
    .then(async response=>{
      if(!response.ok){router.replace('/login');return;}
      const payload=await response.json() as {user:ShellUser};
      if(payload.user.role==='SYSTEM'){router.replace('/system/empresas');return;}
      setUser(payload.user);
    }).catch(()=>setError('Não foi possível verificar a sessão.'));},[router]);

  async function selectFile(e:ChangeEvent<HTMLInputElement>){
    setError('');setPreview(null);setResult(null);setRows([]);
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>1024*1024){setError('Arquivo muito grande. Limite: 1 MB.');return;}
    try{
      const contacts=parseContacts(await file.text());
      setName(file.name);setRows(contacts);
    }catch(error){setError(error instanceof Error?error.message:'Erro ao ler o CSV');}
  }
  async function validate(){
    setBusy(true);setError('');setResult(null);
    try{setPreview(await call<Preview>('/crm/contacts/import/preview',rows));}
    catch(error){setError(error instanceof Error?error.message:'Falha ao validar arquivo');}
    finally{setBusy(false);}
  }
  async function importRows(){
    if(!preview||!preview.ready)return;
    setBusy(true);setError('');
    try{const imported=await call<Result>('/crm/contacts/import/commit',rows);setResult(imported);setPreview(null);}
    catch(error){setError(error instanceof Error?error.message:'Falha ao importar arquivo');}
    finally{setBusy(false);}
  }
  function template(){
    const csv='nome;email;telefone;empresa;origem;cargo;observacoes;etiquetas\r\n"Maria Exemplo";"maria@exemplo.com";"11999999999";"Empresa Exemplo";"Indicação";"Gerente";"Contato inicial";"cliente|vip"\r\n';
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download='modelo-contatos.csv';anchor.click();URL.revokeObjectURL(url);
  }
  if(!user)return <main className="loading-screen">{error||'Carregando importação...'}</main>;
  const state=result??preview;
  return <AppShell user={user}><main className="import-page">
    <div className="import-heading"><div><p className="eyebrow">RELACIONAMENTO / CONTATOS</p><h1>Importação de contatos</h1><p className="subtitle">Traga seus clientes de planilhas CSV para o CRM, com revisão antes da gravação.</p></div>
      <Link href="/relacionamento" className="import-back">Voltar aos contatos</Link></div>
    <section className="import-panel"><div className="import-step"><span>01</span><div><h2>Escolher arquivo</h2><p>CSV separado por ponto e vírgula ou vírgula. Até 200 contatos e 1 MB por lote.</p></div></div>
      <div className="import-file-row"><label htmlFor="import-csv" className="import-picker">Selecionar CSV</label><input id="import-csv" type="file" accept=".csv,text/csv" onChange={e=>void selectFile(e)}/><span>{name||'Nenhum arquivo selecionado'}</span><button type="button" onClick={template} className="import-template">Baixar modelo CSV</button></div>
      <p className="import-help">Coluna obrigatória: nome. Opcionais: email, telefone, empresa, origem, cargo, observacoes e etiquetas. Separe etiquetas com |. Os dados não saem da sua empresa.</p>
      {rows.length>0&&<div className="import-action-row"><span>{rows.length} linha(s) carregada(s)</span><button type="button" disabled={busy} onClick={()=>void validate()}>{busy?'Validando...':'Validar contatos'}</button></div>}
    </section>
    {error&&<p className="import-error" role="alert">{error}</p>}
    {state&&<section className="import-panel">
      <div className="import-step"><span>02</span><div><h2>{result?'Resultado da importação':'Revisar importação'}</h2><p>{result?'Os contatos válidos foram gravados.':'Os registros ainda não foram cadastrados.'}</p></div></div>
      <div className="import-stats">
        <article><strong>{state.total}</strong><span>Registros</span></article>
        <article><strong>{result?result.imported:preview?.ready}</strong><span>{result?'Importados':'Prontos'}</span></article>
        <article><strong>{state.duplicates}</strong><span>Duplicados</span></article>
        <article><strong>{state.invalid}</strong><span>Inválidos</span></article>
      </div>
      <div className="import-table"><table><thead><tr><th>Linha</th><th>Contato</th><th>Situação</th><th>Observações</th></tr></thead><tbody>
        {state.results.map(item=><tr key={item.row}><td>{item.row}</td><td>{item.name||'—'}</td>
          <td><span className={'import-pill import-'+item.status}>{({ready:'Pronto',duplicate:'Duplicado',invalid:'Inválido',imported:'Importado'} as Record<string,string>)[item.status]}</span></td>
          <td>{item.reason||'—'}</td></tr>)}
      </tbody></table></div>
      {!result&&preview&&<div className="import-action-row"><p>Somente os registros prontos serão criados. Nenhum contato existente será sobrescrito.</p><button type="button" disabled={busy||!preview.ready} onClick={()=>void importRows()}>{busy?'Importando...':`Importar ${preview.ready} contato(s)`}</button></div>}
      {result&&<div className="import-action-row"><p>{result.imported} contato(s) cadastrado(s). Duplicados e inválidos foram ignorados.</p><Link href="/relacionamento" className="import-done">Ver contatos</Link></div>}
    </section>}
  </main></AppShell>;
}
