# Terceiro Andar CRM

Monorepo TypeScript com **NestJS** (API), **Next.js** (painel), **Prisma/PostgreSQL**, **Redis**, **Docker Compose** (somente infraestrutura) e **PM2** (processos Node).

## Requisitos

- Node.js 22+
- npm 10+
- Docker com Compose
- PM2 (instalado globalmente ou via `npx pm2`)

## Primeiro acesso

```bash
git checkout beta
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Painel: http://localhost:3000 • API: http://localhost:3001/api • Health: http://localhost:3001/api/health

`npm run dev` executa as duas aplicações em modo de desenvolvimento. Atualize as variáveis do `.env` para seus ambientes.

## Produção / PM2

```bash
npm ci
docker compose up -d
npm run db:generate
npm run db:deploy
npm run build
npm run start:pm2
npx pm2 save
```

Para operações em produção, configure o `.env`, senhas e rede/firewall antes de expor serviços. O Docker publica PostgreSQL e Redis por padrão apenas em 127.0.0.1.

## Estrutura

- `apps/api`: REST API NestJS, health, Prisma e Redis
- `apps/painel`: painel web Next.js (App Router)
- `docker-compose.yml`: PostgreSQL e Redis
- `ecosystem.config.cjs`: dois processos PM2
- `docs/architecture.md`: convenções e próximos módulos

## Scripts principais

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | API + painel, hot reload |
| `npm run build` | Build das duas aplicações |
| `npm run lint` | Checagem TypeScript (sem emitir) |
| `npm run db:generate` | Gerar cliente Prisma |
| `npm run db:migrate` | Aplicar migrações de desenvolvimento |
| `npm run db:deploy` | Aplicar migrações existentes |
| `npm run start:pm2` | Iniciar serviços compilados no PM2 |

**Escopo:** esta entrega é a base técnica. Login/RBAC, módulos de CRM, integrações e aplicação final do manual visual entram nas próximas etapas.

## Autenticação (fase 2)

Após configurar `JWT_SECRET` (mínimo 32 caracteres), `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo 12 caracteres) no `.env`, execute:

```bash
npm run db:deploy
npm run db:generate
npm run seed:admin -w @terceiroandar/api
npm run dev
```

Acesse http://localhost:3000/login. O login define cookie HttpOnly com sessão JWT válida por 8 horas. As rotas `GET /api/auth/me` e `GET /api/dashboard/summary` exigem sessão. `POST /api/auth/logout` apaga o cookie.

Papéis previstos no banco: `ADMIN`, `GESTOR`, `COLABORADOR`. A implementação inicial restringe a interface de configurações ao ADMIN, mas **não oferece ainda CRUD de usuários nem autorização RBAC granular**. As áreas sem implementação não são links funcionais.

**Importante:** para produção, configurar HTTPS, proxy reverso, segredos fortes, limitação de requisições no login, proteção CSRF quando necessário, auditoria e estratégia de revogação de sessões. Não utilizar credenciais do exemplo. Não há testes automatizados dessa fase ainda.
