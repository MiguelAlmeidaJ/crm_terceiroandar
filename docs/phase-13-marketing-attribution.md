# Fase 13 — Atribuição de oportunidades e resultados de Marketing

## Modelo
A migração `20261106130000_campaign_attribution` adiciona `opportunities.campaign_id` opcional. Cada oportunidade possui no máximo uma campanha de origem atribuída; campanhas podem ter várias oportunidades. Oportunidades existentes permanecem sem atribuição e não são contabilizadas em campanhas até uma associação explícita.

## Operação
Acesse `/marketing` → Detalhes da campanha → Oportunidades atribuídas. ADMIN e GESTOR podem associar/desvincular oportunidades já existentes e acompanhar resultados. Vincular uma oportunidade também associa automaticamente seu contato à campanha (sem duplicar vínculos). A transferência para outra campanha exige desvinculação prévia.

Ao desvincular uma oportunidade, o vínculo do contato permanece registrado. A operação não altera o status, valor ou responsável pela oportunidade.

Os filtros de empresas são **sempre aplicados no servidor**. IDs de oportunidade/campanha de outras empresas são rejeitados. A criação e a consulta de campanhas permanecem como na Fase 12.

## Indicadores
- **Contatos vinculados**: número de contatos associados à campanha, não necessariamente novos leads.
- **Oportunidades atribuídas**: oportunidades com `campaign_id` correspondente.
- **Ganhas/perdidas**: etapas atuais `GANHO` e `PERDIDO`.
- **Taxa de ganho**: ganhas / (ganhas + perdidas). Sem oportunidades decididas, exibe travessão.
- **Conversão das oportunidades**: ganhas / todas as oportunidades atribuídas; distinto da taxa de ganho.
- **Custo por contato vinculado**: gasto informado / vínculos de contatos (proxy do CPL, *não* CPL verificado de leads captados).
- **Custo por oportunidade**: gasto informado / oportunidades atribuídas.
- **Custo por oportunidade ganha**: gasto informado / oportunidades atualmente ganhas.
- **Valor estimado ganho**: soma do campo de valor das oportunidades atualmente ganhas, **não** receita recebida.

Valores sem denominador válido retornam `null` e são exibidos como travessão, nunca infinito ou 0 artificial.

Relatório por canal agrega campanhas e vínculos. O mesmo contato pode participar de várias campanhas, logo o indicador de contatos por canal soma vínculos, não pessoas únicas.

## Rotas
- `GET /api/marketing/report/channels`
- `GET /api/marketing/campaigns/:id/metrics`
- `POST /api/marketing/campaigns/:id/opportunities` com `{ "opportunityId": "..." }`
- `DELETE /api/marketing/campaigns/:id/opportunities/:opportunityId`
- `GET /api/marketing/campaigns/:id` agora inclui oportunidades vinculadas (até 100), além dos indicadores.

## Deploy
Faça backup antes de atualizar e aplicar migrações:
```bash
git switch beta
git pull origin beta
npm install
npm run db:generate
npm run db:deploy
npm run lint
npm run build
npm run dev
```

**Limites**: atribuição manual, sem UTMs, eventos externos, importação de gasto, integração com anúncios ou rastreamento automatizado. Métricas de ROI financeiro exigem receita recebida efetivamente registrada e definição de custos/atribuição contábil; não são calculadas nesta fase. O seletor mostra apenas 30 oportunidades recentes; relatórios cobrem todas.
