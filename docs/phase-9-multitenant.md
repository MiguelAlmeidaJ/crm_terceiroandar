# Fase 9 — Multiempresa (multi-tenant) e sidebar

## Papéis e escopo

- `SYSTEM`: administrador global da plataforma, sem vínculo a uma empresa; gerencia empresas em `/system/empresas`.
- `ADMIN`: administra usuários e registros de sua empresa.
- `GESTOR`: atua sobre as informações da empresa.
- `COLABORADOR`: atua sobre as informações da empresa, respeitando restrições de tarefas.

Um usuário está associado a **uma** empresa nesta fase. E-mails continuam globalmente exclusivos. O usuário SYSTEM precisa ter e-mail diferente do novo administrador empresarial. Não existe ainda um seletor de múltiplas empresas para o mesmo usuário.

Todos os endpoints comerciais, de tarefas, auditoria e usuários foram limitados no servidor por `tenantId`. A API usa somente a empresa da sessão validada; não aceita `tenantId` enviado pelo navegador como forma de selecionar outra empresa. Empresas suspensas deixam de autenticar e de usar as sessões.

## Migração dos registros atuais

1. **Faça backup do banco antes de aplicar as migrações.**
2. `20261105210000_system_role`: adiciona o papel SYSTEM.
3. `20261105210100_multitenant`: cria a tabela tenants, uma empresa Legado e vínculos de usuários, contatos, oportunidades, atividades, tarefas e auditorias.
4. O primeiro ADMIN ativo, por `created_at, id`, torna-se SYSTEM e tem a sessão atual invalidada. Os demais usuários passam a pertencer à empresa Legado.
5. Todas as informações anteriores permanecem na empresa Legado até uma transferência explícita.

**Não use `prisma migrate reset` nem apague o volume do PostgreSQL.**

## Criar a empresa definitiva

Entre com o usuário SYSTEM e acesse `http://localhost:3000/system/empresas`.

Preencha nome e identificador (slug) da empresa, além do nome, e-mail e senha do novo administrador. Para aproveitar os registros anteriores, marque **Transferir dados e usuários existentes da empresa Legado**. A operação realiza a movimentação de todos os registros empresariais numa única transação de banco. Usuários empresariais movidos devem entrar novamente, pois suas sessões são invalidadas. A empresa Legado fica registrada, mas esvaziada.

A transferência é deliberadamente integral; não existe redistribuição parcial nesta versão. Caso queira usar a empresa Legado diretamente, é possível renomeá-la, mas ela não recebe automaticamente um novo administrador após a promoção do primeiro ADMIN a SYSTEM. A opção recomendada é criar uma empresa e importar os registros com o novo administrador.

## Como atualizar no Windows (PowerShell)

Backup usando formato binário gerado dentro do container (evita problemas de codificação no PowerShell):

```powershell
docker compose exec postgres pg_dump -U terceiroandar -d terceiroandar -Fc -f /tmp/pre-multitenant.dump
docker cp "$(docker compose ps -q postgres):/tmp/pre-multitenant.dump" ".\\backup-pre-multitenant.dump"
```

Depois:

```powershell
git switch beta
git pull origin beta
npm install
npm run db:generate
npm run db:deploy
npm run lint
npm run build
npm run dev
```

Entre novamente após a migração (o usuário promovido ao papel SYSTEM terá a versão da sessão incrementada).

## Validação

CI usa PostgreSQL 17 para aplicar todas as migrações, criar o primeiro SYSTEM, checar isolamento entre duas empresas, negar referências cruzadas a contatos, oportunidades e tarefas e validar a transferência integral de dados legados.

## Pendências para produção

- Auditoria específica de ações SYSTEM e transferências de dados.
- Proteção anti-CSRF com token robusto, limites de requisições e política de recuperação de senha.
- Controles granulares por carteira/equipe dentro de cada empresa.
- Chave composta ou políticas RLS no PostgreSQL como defesa em profundidade.
- Backups, restore testado, observabilidade e fluxo de migração entre empresas com aprovação.
