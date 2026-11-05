# Fase 7 — Dashboard Comercial

## Acesso
`/dashboard/comercial` (sessão obrigatória).

## API
`GET /api/dashboard/commercial?period=30d&ownerId=<uuid>`
- Períodos: `7d`, `30d` (padrão), `90d`, `all`.
- Filtra oportunidades por **data de criação** e responsável **atual**.
- Métricas: quantidade, soma de valores estimados, ganhos, perdidos, taxa de ganho, tarefas em aberto e atrasadas.
- Taxa de ganho = ganhos / (ganhos + perdidos). Sem oportunidades decididas, retorna `null` (exibido como travessão).
- Oportunidades agrupadas por etapa atual e por responsável atual.
- Tarefas não seguem o filtro de período das oportunidades; são o estado atual.
- ADMIN/GESTOR: visão agregada e filtro por responsável.
- COLABORADOR: visão somente de oportunidades sob sua responsabilidade e tarefas atribuídas a si; tentativa de consultar outro usuário gera 403.

## Segurança e limites
As regras deste endpoint são aplicadas na API. O controle de acesso por carteira nos demais endpoints de CRM ainda deve ser implementado antes de liberar dados reais a diferentes equipes. Não inferir receita realizada a partir de valor de oportunidade; o indicador é estimado.

## Operação
Sem migração nova nesta fase. Atualize a branch e rode `npm run db:generate`, `npm run lint`, `npm run build` e `npm run dev`.
