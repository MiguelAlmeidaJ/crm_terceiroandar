# Arquitetura inicial

## Contexto
Monorepo npm workspaces para API NestJS e painel Next.js. PostgreSQL e Redis rodam em contêineres locais; aplicações Node executam no host (dev ou PM2).

## Limites
- API: toda regra de negócio, validação, autorização e persistência.
- Painel: interface e comunicação com a API por `NEXT_PUBLIC_API_URL`.
- Prisma: camada de acesso a dados. Migrações são versionadas em `apps/api/prisma/migrations`.
- Redis: cache e preparação para filas; não é a origem primária dos dados.
- Docker: somente PostgreSQL/Redis.
- PM2: processos API/painel compilados.

## Próximas entregas
1. Importar e interpretar o mapa do CRM e o manual de identidade visual.
2. Modelar entidades, migrações e papéis de acesso.
3. Autenticação e autorização (RBAC), validação, logs e auditoria.
4. Módulos de contatos, pipeline, marketing, processos e relatórios conforme documentação.
5. Testes, CI/CD, observabilidade e hardening antes de produção.

## Segurança
Nunca versionar `.env`. Ajustar CORS, autenticação, proteção contra abuso, HTTPS/reverse proxy, backup e segredos para produção. O endpoint `/api/health` verifica conectividade com PostgreSQL e Redis.
