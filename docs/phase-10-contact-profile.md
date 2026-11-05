# Fase 10 — Ficha de Contatos e histórico de relacionamento

## Novos campos
A tabela contacts recebe source, job_title, website e tags (array de textos). Dados anteriores são preservados.

Nova tabela contact_interactions vinculada a contato, autor e empresa. Canais: LIGACAO, WHATSAPP, EMAIL, REUNIAO, NOTA.

## Rotas
- GET /api/crm/contacts/:id — ficha completa e 50 oportunidades recentes
- GET /api/crm/contacts/:id/interactions?page= — histórico paginado, 20 por página
- POST /api/crm/contacts/:id/interactions — {channel, description, occurredAt?}; registra o autor autenticado
- POST/PATCH /api/crm/contacts — campos adicionais source, jobTitle, website e tags

O isolamento por empresa ocorre em todas as rotas. Contatos de outra empresa retornam 404.

## Interface
Acesse Relacionamento > Contatos > Ficha. O histórico mostra o canal, data, descrição e autor. A edição de contatos fica na tela principal.

## Duplicidade
O sistema alerta quando encontra e-mail idêntico ignorando maiúsculas/minúsculas ou telefone idêntico **dentro da mesma empresa**. Ainda não há regra única no banco para impedir duplicações concorrentes.

## Limites
Não há importação de planilhas, anexos, merge de contatos, controle de consentimento LGPD ou busca por telefone normalizado neste incremento. O histórico é exclusivo de contatos, independente do histórico das oportunidades. Todos os colaboradores autenticados na empresa compartilham acesso aos contatos; ainda é necessário implantar regras por carteira.

## Atualizar
Faça backup antes de aplicar a migração `20261106090000_contact_profile`.
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
