# Fase 3 — gestão de usuários (beta)

Acesso à interface: `/admin/usuarios` (apenas ADMIN).

## Rotas da API

Todas requerem cookie de sessão válido e papel ADMIN:
- `GET /api/admin/users`: lista até 200 usuários (campos públicos, sem hashes).
- `POST /api/admin/users`: cria usuário (name, email, password >=12 caracteres, role).
- `PATCH /api/admin/users/:id`: edita nome, e-mail, senha, papel, ativo/inativo.
- `GET /api/admin/audit`: últimas 100 ações administrativas registradas.

Papéis: ADMIN, GESTOR, COLABORADOR. Não é permitido remover o próprio acesso administrativo nem desativar o último administrador ativo. Atualizações são transacionais, incluindo log de auditoria. Senhas jamais são registradas em logs. A desativação bloqueia acessos subsequentes porque o guard verifica a conta em cada requisição.

## Implantação

```bash
git switch beta
git pull origin beta
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

**Não execute reset ou seed novamente** se já possui administrador cadastrado.

## Limites desta fase

- Interface administrativa cliente; acesso protegido pela API.
- RBAC exclusivamente para gestão de usuários neste incremento.
- Logs administrativos básicos (criação/atualização), não auditoria de autenticação.
- Para produção, adicionar política completa de proteção CSRF, rate limiting, paginação e política de sessões.
- Se o banco contém migrações feitas manualmente ou ainda falhas, revisar `prisma migrate status` antes de `db:deploy`.
