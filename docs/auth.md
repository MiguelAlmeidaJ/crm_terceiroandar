# Autenticação e controle de acesso (fase 2)

- Login: POST /api/auth/login com JSON `{ "email": "...", "password": "..." }`.
- Sessão: JWT assinado com HS256 em cookie HttpOnly, SameSite=Lax, Secure em produção, 8 horas.
- Perfil: GET /api/auth/me (autenticado).
- Logout: POST /api/auth/logout (limpa cookie local).
- Indicadores: GET /api/dashboard/summary (autenticado).
- Papéis no schema: ADMIN, GESTOR, COLABORADOR. Permissões granulares futuras.
- Primeira conta: variáveis ADMIN_* e script `npm run seed:admin -w @terceiroandar/api`.

Segurança operacional: login rate-limit, CSRF para operações mutáveis, logs de auditoria, sessão revogável, provisionamento de usuários, redefinição de senha e testes são trabalhos futuros. O dashboard não exibe métricas comerciais ainda, apenas contagens reais de infraestrutura.
