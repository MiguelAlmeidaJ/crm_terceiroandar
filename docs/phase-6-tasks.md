# Fase 6 — tarefas comerciais

Nova tela: `/tarefas`. Vincula tarefas a oportunidades, com prazo, prioridade, responsável, descrição e status.

## Endpoints

Todos exigem autenticação:
- `GET /api/tasks?status=&assigneeId=&page=`: tarefas paginadas (20 por página).
- `GET /api/tasks/summary`: pendentes/em andamento, atrasadas e concluídas.
- `POST /api/tasks`: cria tarefa com título, data (AAAA-MM-DD), oportunidade e opcionalmente responsável e prioridade.
- `PATCH /api/tasks/:id`: edita dados, responsável ou status.

## Autorização nesta fase

ADMIN e GESTOR visualizam e administram tarefas de todos. COLABORADOR visualiza, cria e atualiza tarefas atribuídas a si mesmo, e não pode transferir a responsabilidade. Esta regra é aplicada na API para tarefas. A autorização global das oportunidades e contatos ainda não foi segmentada por carteira.

## Implantação

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

Nenhuma alteração nos registros existentes; nova migração `20261105194500_commercial_tasks`.

## Pontos ainda não concluídos

- O seletor de oportunidades mostra as 30 mais recentes; implementar busca remota para volumes grandes.
- Não há lembretes automáticos, notificações, upload ou calendário.
- Não há trilha de auditoria detalhada para tarefas nem proteção completa anti-CSRF.
- Dashboard traz indicadores operacionais de tarefas, sem fórmulas financeiras ou de conversão avançada.
