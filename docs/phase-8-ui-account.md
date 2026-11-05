# Fase 8 — Navegação unificada e Minha conta

## Interface
- `AppShell` compartilhado para visão geral, dashboard comercial, relacionamento, funil Kanban, tarefas e usuários.
- Sidebar com ícones vetoriais, grupos de navegação, item ativo, modo compacto persistido em `localStorage` e acesso móvel.
- Header fixo com identidade do sistema, alternância de tema e dropdown de conta.
- Tema claro/escuro persistido por navegador (chave `terceiroandar-theme`).
- Página `/minha-conta`: edição de nome, visualização de e-mail/perfil e alteração de senha.

## API
- `PATCH /api/auth/profile` — aceita `{ "name": "..." }` e altera o nome do usuário autenticado.
- `POST /api/auth/change-password` — aceita `{ "currentPassword": "...", "newPassword": "..." }`; senha nova entre 12 e 128 caracteres, diferente da atual.
- Alteração de senha usa bcrypt e incrementa `users.session_version`; todas as sessões JWT anteriores são invalidadas, enquanto a sessão atual recebe novo cookie HttpOnly.

## Migração obrigatória
`20261105200000_session_version`: nova coluna `users.session_version` com valor padrão zero.

Execute após atualizar:
```bash
npm install
npm run db:generate
npm run db:deploy
npm run lint
npm run build
npm run dev
```

**Importante**: sessões antigas da versão anterior (JWT sem claim `ver`) precisarão entrar novamente após a atualização. Execute a migração antes de iniciar a API nova.

## Pendências de segurança
- Proteção CSRF sistemática e rate limiting para login, troca de senha e operações administrativas.
- Autorização por carteira/equipe em todos endpoints de CRM; atualmente somente algumas áreas têm restrição por papel.
- Testes de integração da API e testes end-to-end do painel.
