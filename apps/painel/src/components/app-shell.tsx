'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export type ShellUser = { id: string; name: string; role: string; email?: string };
function UiIcon({name,size=19}:{name:string;size?:number}){
 const p:Record<string,ReactNode>={
 home:<><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></>,
 chart:<><path d="M3 3v18h18"/><path d="m7 16 4-5 3 2 6-8"/></>,
 users:<><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 7M19 15a5 5 0 0 1 3 5"/></>,
 kanban:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7v10M12 7v6M16 7v9"/></>,
 tasks:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 9 2 2 4-4M7 16h10"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
 profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 moon:<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>,
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
 lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
 exit:<><path d="m10 17 5-5-5-5M15 12H3M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></>,
 menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
 collapse:<path d="m14 6-6 6 6 6"/>,
 chevron:<path d="m6 9 6 6 6-6"/>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]||p.home}</svg>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const roleName: Record<string,string> = { SYSTEM:'Sistema', ADMIN:'Administrador', GESTOR:'Gestor', COLABORADOR:'Colaborador' };
const sections = [
  { heading:'VISÃO GERAL', links:[['/','Início','home'],['/dashboard/comercial','Dashboard comercial','chart']] },
  { heading:'GESTÃO COMERCIAL', links:[['/relacionamento','Relacionamento','users'],['/relacionamento/kanban','Funil Kanban','kanban'],['/tarefas','Tarefas comerciais','tasks']] },
  { heading:'CONFIGURAÇÕES', links:[['/admin/usuarios','Usuários e acessos','settings']] },
];
const systemSections = [{ heading:'PLATAFORMA', links:[['/system/empresas','Empresas e licenças','settings']] }];
export function AppShell({user,children}:{user:ShellUser;children:ReactNode}) {
  const route = usePathname();
  const router = useRouter();
  const [theme,setTheme]=useState<'light'|'dark'>('light');
  const [open,setOpen]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [compact,setCompact]=useState(false);
  const dropdown=useRef<HTMLDivElement>(null);
  const initials=user.name.trim().split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()).join('') || 'TA';
  useEffect(()=>{
    const saved=localStorage.getItem('terceiroandar-theme');
    const current=saved==='dark'?'dark':'light';
    document.documentElement.dataset.theme=current;
    setTheme(current);
    setCompact(localStorage.getItem('terceiroandar-compact')==='true');
  },[]);
  useEffect(()=>{setMobile(false);setOpen(false)},[route]);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!dropdown.current?.contains(e.target as Node))setOpen(false)};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  function toggleTheme(){
    const next=theme==='light'?'dark':'light';setTheme(next);
    document.documentElement.dataset.theme=next;localStorage.setItem('terceiroandar-theme',next);
  }
  function toggleCompact(){setCompact(!compact);localStorage.setItem('terceiroandar-compact',String(!compact))}
  async function logout(){
    try{await fetch(API+'/auth/logout',{method:'POST',credentials:'include'})}finally{router.replace('/login');router.refresh()}
  }
  return <div className={'ta-shell'+(compact?' ta-compact':'')+(mobile?' ta-mobile-open':'')}>
    {mobile&&<button className="ta-overlay" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
    <aside className="ta-sidebar" aria-label="Menu do sistema">
      <Link href={user.role==='SYSTEM'?'/system/empresas':'/'} className="ta-brand"><span className="ta-brand-badge">3A</span><span className="ta-brand-copy"><strong>Terceiro Andar</strong><small>CRM & OPERAÇÕES</small></span></Link>
      <div className="ta-menu">
        {(user.role==='SYSTEM'?systemSections:sections).map(group=>{
          if(group.heading==='CONFIGURAÇÕES'&&user.role!=='ADMIN')return null;
          return <div className="ta-menu-group" key={group.heading}>
            <p className="ta-group-title">{group.heading}</p>
            <nav aria-label={group.heading}>{group.links.map(([href,label,symbol])=><Link key={href} href={href} title={label} aria-current={route===href?'page':undefined} className={'ta-menu-link'+(route===href?' ta-active':'')}><span className="ta-nav-icon" aria-hidden="true"><UiIcon name={symbol}/></span><span className="ta-nav-label">{label}</span></Link>)}</nav>
          </div>;
        })}
      </div>
      <div className="ta-sidebar-footer"><div className="ta-user-mini"><span className="ta-avatar">{initials}</span><span className="ta-sidebar-name"><strong>{user.name}</strong><small>{roleName[user.role]??user.role}</small></span></div><button className="ta-compact-button" onClick={toggleCompact} type="button"><UiIcon name="collapse"/><span>Recolher menu</span></button></div>
    </aside>
    <div className="ta-workspace">
      <div className="ta-header">
        <div className="ta-header-start"><button type="button" className="ta-mobile-toggle" aria-label="Alternar menu" onClick={()=>setMobile(!mobile)}><UiIcon name="menu"/></button><div><strong>Terceiro Andar</strong><small>Workspace <span className="ta-beta">BETA</span></small></div></div>
        <div className="ta-header-right">
          <button className="ta-theme-button" title="Alternar tema" aria-label="Alternar tema" onClick={toggleTheme} type="button"><UiIcon name={theme==='light'?'moon':'sun'}/></button>
          <div className="ta-account" ref={dropdown}>
            <button type="button" className="ta-account-trigger" onClick={()=>setOpen(!open)} aria-expanded={open} aria-haspopup="menu"><span className="ta-avatar">{initials}</span><span className="ta-account-name"><strong>{user.name}</strong><small>{roleName[user.role]??user.role}</small></span><span className="ta-caret"><UiIcon name="chevron" size={16}/></span></button>
            {open&&<div className="ta-dropdown" role="menu">
              <div className="ta-dropdown-info"><strong>{user.name}</strong><small>{user.email||roleName[user.role]}</small></div>
              <Link role="menuitem" href="/minha-conta" className="ta-dropdown-item" onClick={()=>setOpen(false)}><span><UiIcon name="profile"/></span> Meu perfil</Link>
              <button role="menuitem" type="button" className="ta-dropdown-item" onClick={()=>{toggleTheme();setOpen(false)}}><span><UiIcon name={theme==='light'?'moon':'sun'}/></span> Tema {theme==='light'?'escuro':'claro'}</button>
              <Link role="menuitem" href="/minha-conta#seguranca" className="ta-dropdown-item" onClick={()=>setOpen(false)}><span><UiIcon name="lock"/></span> Trocar senha</Link>
              <div className="ta-dropdown-divider"/>
              <button role="menuitem" type="button" className="ta-dropdown-item ta-logout" onClick={()=>void logout()}><span><UiIcon name="exit"/></span> Sair do sistema</button>
            </div>}
          </div>
        </div>
      </div>
      <div className="ta-content">{children}</div>
    </div>
  </div>;
}
