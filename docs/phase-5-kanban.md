# Fase 5 — Funil Kanban

## Interface
Abra `/relacionamento/kanban`. O funil possui seis etapas e mostra cartões com título, contato, responsável, valor, previsão e número de atividades. É possível arrastar com mouse ou usar o seletor de etapa (inclusive em dispositivos móveis).

## API
- `GET /api/crm/owners`: nomes dos usuários ativos para seleção de responsável (até 200).
- `GET /api/crm/kanban?ownerId=&q=`: seis colunas, até 50 oportunidades mais recentes por etapa, além de contagens totais por etapa e valor agregado de todas as oportunidades filtradas.
- `PATCH /api/crm/opportunities/:id` com `{ "stage": "PROPOSTA" }`: reutiliza endpoint existente, com histórico da mudança.

Não há nova migração nesta fase.

## Subir localmente
```bash
git switch beta
git pull origin beta
npm install
npm run db:generate
npm run lint
npm run build
npm run dev
```

## Limitações
- O quadro apresenta no máximo 50 cartões por etapa; filtros facilitam a localização. As contagens incluem todos os registros filtrados.
- A mudança de etapa é persistida antes da atualização da tela.
- O controle por responsável é de filtragem, **não é autorização por carteira**: todo usuário autenticado pode consultar e editar oportunidades, conforme o modelo existente.
- Filtros de responsáveis listam até 200 usuários ativos.
- Próximos passos: permissões por equipe, paginação avançada, prevenção completa contra CSRF, atualizações concorrentes e testes de integração.
