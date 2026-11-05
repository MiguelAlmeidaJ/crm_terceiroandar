# Fase 4 — Relacionamento (MVP)

## Banco
Novas tabelas: `contacts`, `opportunities`, `opportunity_activities`. Nova enum `OpportunityStage`. Contatos não são excluídos nesta versão para preservar vínculos. Migração versionada `20261105190000_crm_contacts_opportunities`.

## API autenticada
- `GET /api/crm/contacts?q=&page=`: pesquisa por nome, email ou empresa; 20 por página
- `POST /api/crm/contacts`: cria contato
- `PATCH /api/crm/contacts/:id`: edita contato
- `GET /api/crm/opportunities?stage=&page=`: oportunidades; 30 por página
- `POST /api/crm/opportunities`: cria oportunidade vinculada a contato e responsável (por padrão, usuário logado)
- `PATCH /api/crm/opportunities/:id`: modifica dados/etapa; mudança de etapa gera atividade
- `GET /api/crm/opportunities/:id/activities`: últimas 100 atividades
- `POST /api/crm/opportunities/:id/activities`: registra interação
- `GET /api/crm/summary`: contagens para indicadores

Todos os endpoints exigem uma sessão válida. Os perfis ainda compartilham acesso ao módulo; regras de visibilidade por equipe são planejadas para fase posterior.

## Tela
`http://localhost:3000/relacionamento`. Cadastro e edição de contatos, criação de oportunidades, alteração de etapa, histórico e indicadores. Para selecionar um contato fora da primeira página, use a busca na aba Contatos.

## Implantação
```bash
git switch beta
git pull origin beta
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

## Limitações conhecidas
MVP sem exclusão, importação, filtros avançados, customização de etapas e upload de anexos. Não usar dados sensíveis sem revisão de autorização por equipe e proteções anti-CSRF/rate-limit. Testes de integração e build local precisam ser confirmados.
