# Cleanup Operations

Esta pasta reúne scripts de limpeza e rollback da base.

## Regras

- Nunca escrever sem validação prévia.
- `--dry-run` é o modo por defeito.
- `--execute` é obrigatório para qualquer alteração.
- Qualquer script deve regressar `0` apenas quando terminar com verificação e relatório consistentes.

