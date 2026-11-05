const modules = [
  { title: 'Visão geral', description: 'Indicadores e acompanhamento de resultados.' },
  { title: 'Relacionamento', description: 'Contatos, oportunidades e histórico.' },
  { title: 'Marketing', description: 'Campanhas, canais e conversões.' },
  { title: 'Processos', description: 'Fluxos, tarefas e atividades.' },
];

export default function Home() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">3A</span><span>Terceiro Andar<small>CRM & Operações</small></span></div>
        <nav aria-label="Menu principal">
          <a href="/" aria-current="page">Visão geral</a>
          <span>Relacionamento</span>
          <span>Marketing</span>
          <span>Processos</span>
          <span>Configurações</span>
        </nav>
        <p className="sidebar-foot">Ambiente beta · Estrutura inicial</p>
      </aside>
      <main className="main">
        <header><div><p className="eyebrow">PAINEL / INÍCIO</p><h1>Bem-vindo ao Terceiro Andar</h1><p className="subtitle">Sua operação, organizada em um só lugar.</p></div><span className="status">● Beta</span></header>
        <section className="hero"><div><p className="eyebrow">FUNDAÇÃO DO SISTEMA</p><h2>Uma plataforma pronta para evoluir.</h2><p>A infraestrutura do CRM está preparada. Os módulos e as regras de negócio serão implementados nas próximas etapas.</p></div><span className="hero-icon">3A</span></section>
        <section aria-labelledby="modules-title"><div className="section-title"><h2 id="modules-title">Áreas do sistema</h2><p>Estrutura prevista para o desenvolvimento</p></div><div className="cards">{modules.map((module, index) => <article className="card" key={module.title}><div className="card-number">0{index + 1}</div><h3>{module.title}</h3><p>{module.description}</p><span className="pending">Em preparação</span></article>)}</div></section>
      </main>
    </div>
  );
}
