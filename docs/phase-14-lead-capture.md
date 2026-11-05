# Fase 14 — Captação pública de leads com rastreamento UTM

## Escopo entregue
Cada campanha possui `captureToken` (UUID único) e `captureEnabled` (false por padrão). Administradores/gestores habilitam o formulário ao criar/editar uma campanha. A campanha precisa estar com status `EM_ANDAMENTO` e pertencer a uma empresa ativa; campanhas pausadas, desabilitadas ou de empresas suspensas não expõem formulário.

No painel `/marketing` → Detalhes, há gerador de URL de captura com `utm_source`, `utm_medium` e `utm_campaign`. O link tem a forma `https://SEU_DOMINIO/captura/<captureToken>?utm_source=...&utm_medium=...` e pode ser utilizado em anúncios, e-mails ou sites que enviem tráfego ao formulário do CRM. O domínio é o domínio do painel em que o usuário está navegando.

A página pública solicita nome, e-mail, telefone opcional e aceite explícito para o contato. Não exige login e não usa cookies de sessão. Armazena UTM source/medium/campaign/content/term, timestamp de consentimento e vínculo do contato com a campanha. Reutiliza contato existente pelo e-mail dentro da empresa (sem alterar seu nome/dados anteriores) e não aumenta as capturas ao receber novamente o mesmo contato da mesma campanha.

## Novos endpoints públicos
- `GET /api/public/campaigns/:token`: apenas nome da campanha, descrição, canal e empresa; não expõe leads.
- `POST /api/public/campaigns/:token/leads`: body `{name,email,phone?,consent:true,utm_source?,utm_medium?,utm_campaign?,utm_content?,utm_term?,website?}`.

## Indicadores
- `capturedLeads`: capturas únicas geradas pelo formulário para uma campanha.
- `costPerCapturedLead`: gasto registrado da campanha dividido pelo número de leads captados; é uma estimativa de CPL, não um custo validado nas plataformas.
- Os indicadores antigos de contatos vinculados, oportunidades e taxa de ganho permanecem disponíveis. Contatos vinculados manualmente não são contados como capturas.

## Proteções iniciais
- Token público de campanha aleatório e não enumerável, formulário inativo por padrão.
- Rate limit Redis por campanha + IP (12/h) e campanha + e-mail (3/h), com chave hash, falhando fechado se Redis indisponível. Redis 7+ necessário para opção NX em EXPIRE.
- Campo honeypot invisível; limite de tamanho e validação rígida dos dados.
- Não retorna ID do contato nem informa se e-mail já existia.
- Consentimento obrigatório para comunicação decorrente da solicitação; consentimento armazenado por campanha.
- Todas as buscas de contatos e gravações usam o `tenantId` da campanha resolvida pelo token; não aceita tenantId no corpo.

## Limitações e próximos passos
- A captura é feita via formulário hospedado no CRM. **Não há integração direta** com a API do Meta Lead Ads, Google Ads, plataformas de e-mail ou WhatsApp nesta fase.
- Para usar links externos, configure HTTPS e `NEXT_PUBLIC_API_URL` para a API acessível pelo visitante, além de `CORS_ORIGIN` com a URL do painel. Não compartilhe URLs `localhost` em campanhas reais.
- Envio em massa, double opt-in, revogação de consentimento, retenção LGPD, deduplicação transacional em alta concorrência, CAPTCHA/Turnstile e webhooks com assinatura permanecem pendentes. Implante proteções adicionais antes de tráfego significativo.
- O rate limit exige Redis disponível. Em implantação com proxy, revise `req.ip` e os endereços/proxies confiáveis; IP do proxy pode limitar visitantes em conjunto.
- A contagem é por contato único por campanha. Uma pessoa em campanhas diferentes pode gerar uma captura em cada uma.
- Atribuição de oportunidades continua manual (fase 13). Captura de lead não cria oportunidade automaticamente para não inflar o funil.

## Migração e atualização
**Faça backup do PostgreSQL antes de executar.** Não apague volumes nem reinicie as tabelas.

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

Migração `20261106150000_campaign_lead_capture`: adiciona configurações de captura à campanha e tabela `marketing_lead_captures`. Preserva campanhas, contatos e oportunidades existentes. Todas as campanhas antigas permanecem com captura desativada.

## Verificação rápida
1. Entre com ADMIN/GESTOR e crie uma campanha `EM_ANDAMENTO` com captura habilitada.
2. Abra detalhes → preencha as UTMs → copie o link.
3. Abra o link em janela anônima. Preencha nome, e-mail e aceite.
4. Confirme a presença do contato em Relacionamento e do vínculo na campanha.
5. Faça uma nova submissão com o mesmo e-mail; a quantidade de leads captados deve permanecer igual.
6. Desabilite a captura e verifique que o link deixa de aceitar envios.
