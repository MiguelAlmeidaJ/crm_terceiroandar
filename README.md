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
