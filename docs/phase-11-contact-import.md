# Fase 11 — Importação de contatos CSV

## Interface

Acesso: Relacionamento → Importar CSV, URL `/relacionamento/importar`.

Modelo CSV disponível na própria página. Codificação UTF-8; vírgula ou ponto e vírgula; campos entre aspas, incluindo quebras de linha. Até 1 MB e **200 linhas por arquivo**. Colunas aceitas: `nome` (obrigatória), `email`, `telefone`, `empresa`, `origem`, `cargo`, `observacoes`, `etiquetas`. Também aceita equivalentes em inglês.

Etapas:
1. Selecionar arquivo e revisar cabeçalhos.
2. Validar dados contra o banco da empresa e identificar duplicidades.
3. Confirmar importação apenas das linhas válidas.
4. Conferir quantos registros foram importados, ignorados ou inválidos.

## API

- `POST /api/crm/contacts/import/preview` recebe `{ "rows": [...] }`; não grava nada.
- `POST /api/crm/contacts/import/commit` recebe o mesmo payload; importa as linhas válidas.

Os endpoints exigem sessão válida de uma empresa; `SYSTEM` não pode importar. Duplicidades são avaliadas por e-mail (case-insensitive) ou telefone exato, tanto no banco da empresa quanto no próprio lote. As linhas não sobrescrevem registros existentes.

A gravação é parcial: falha em uma linha não impede as demais. Cada linha recebe um status no relatório. A previsão feita antes de importar pode mudar se outro usuário modificar a base entre as duas etapas. Não existe ainda restrição de unicidade concorrente diretamente no banco.

## Segurança e escopo

Não há migração nova, pois utiliza a tabela `contacts` da Fase 10. O arquivo é lido no navegador, e são enviados apenas os campos da planilha para a API, em HTTPS quando implantado. Não existe armazenamento permanente do CSV.

Limitações: não há importação Excel/XLSX direta, importação de mais de 200 linhas por lote, enriquecimento externo, unificação automática ou anexos. Não utilize sem revisão das regras LGPD e permissão por carteira quando houver dados sensíveis.
