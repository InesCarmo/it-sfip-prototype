# SFIP Operations

Esta pasta concentra os procedimentos operacionais da SFIP.

## Objetivo

Separar claramente a camada de manutenção da camada do produto.

## Filosofia

- Descobrir primeiro.
- Validar antes de executar.
- Executar apenas com intenção explícita.
- Registar tudo.
- Não alterar a UI nem o Core Engine.
- Não assumir esquema, colunas ou tabelas sem confirmação.

## Convenções

- Todos os scripts devem aceitar `--dry-run`.
- Todos os scripts devem aceitar `--report`.
- A execução destrutiva só pode ocorrer com `--execute`.
- O comportamento por defeito deve ser seguro.
- Logs e relatórios devem ir apenas para `operations/reports/`.
- Nenhum script deve saltar as fases:
  1. Discover
  2. Validate
  3. Dry Run
  4. Execute
  5. Verify
  6. Report

## Estrutura

- `backups/`: cópias operacionais da base e artefactos relacionados.
- `reports/`: relatórios Markdown e ficheiros de diagnóstico.
- `cleanup/`: scripts de limpeza e rollback.
- `verify/`: verificações de integridade, encoding, modelo canónico, pipeline, pesquisa e estado temporal.
- `diagnostics/`: relatórios de ambiente e dependências.
- `common/`: utilitários partilhados por scripts operacionais.

## Regras de execução

- Em modo `--dry-run`, o script nunca pode escrever.
- Em modo normal, o script continua seguro e não destrutivo por defeito.
- Em modo `--execute`, o script pode alterar dados, mas apenas após validações explícitas.
- Qualquer falha de validação deve terminar com erro explícito e sem alterações parciais.

