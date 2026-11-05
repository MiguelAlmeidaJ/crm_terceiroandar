# Marketing — Campanhas (MVP)
Cadastro e edição de campanhas, status, canal, orçamento/gasto e calendário.
Consulta, filtros, totais e vínculos a contatos já existentes. A interface é /marketing.
API autenticada e vinculada a empresa: GET /api/marketing/campaigns, GET /api/marketing/summary, GET /api/marketing/campaigns/:id, POST /api/marketing/campaigns, PATCH /api/marketing/campaigns/:id e POST /api/marketing/campaigns/:id/contacts.
ADMIN e GESTOR alteram; COLABORADOR apenas consulta.
Migração 20261106110000_marketing_campaigns. Faça backup antes de npm run db:deploy.
Limitações: contato vinculado não é conversão; não há integração com plataformas de anúncios, envio em massa, atribuição de oportunidades ou cálculo de ROI.
