# SFIP Data Model Refactoring

## Princípios

- O Excel deixa de ser fonte de verdade e passa a ser apenas camada de importação.
- Cada entidade tem um único identificador canónico.
- Campos derivados deixam de ser persistidos como verdade de negócio.
- Inteligência, histórico e comunicação ficam separados dos dados oficiais.
- A interface só lê índices leves e projeções calculadas.

## Entidades principais

### Calls

Fonte oficial de oportunidades abertas, previstas e encerradas.

Campos oficiais:

- `id`
- `sourceId`
- `programId`
- `officialCode`
- `officialTitle`
- `entity`
- `type`
- `level`
- `areaPrimary`
- `areaSecondary`
- `thematicKeywords`
- `targetGroups`
- `eligibility`
- `dates`
- `links`
- `status`
- `sourcePriority`
- `notes`

Campos calculados:

- `stateComputed`
- `daysRemaining`
- `urgencyScore`
- `relevanceScore`
- `potentialIt`
- `areaStrategicIt`
- `groupsIt`
- `researchersSuggested`
- `partnerNeeds`
- `communicationTags`
- `radarDecision`
- `explainWhy`
- `confidence`

### Radar

Fila estratégica para oportunidades futuras, alterações de calendário e sinais a monitorizar.

### Events

Eventos, webinars, brokerage events, info days e ações de networking.

### Companies

Entidades empresariais com capacidade, setor e vínculos a oportunidades.

### Institutions

Instituições financiadoras, pontos de contacto, universidades, centros e entidades parceiras.

### Workspaces

Objeto operacional da SFIP.

Um workspace representa uma ideia, um pedido, um contacto empresarial ou uma oportunidade em análise.

### Campaigns

Comunicações segmentadas por grupo, investigador, empresa, programa, tipo, estado e área.

### History

Histórico auditável de alterações, decisões, aprovações e publicação.

## Camadas lógicas

### 1. Official Data Layer

Armazena apenas o que vem das fontes oficiais e importações controladas.

### 2. Intelligence Layer

Calcula:

- estado efetivo
- dias restantes
- urgência
- prioridade
- radar
- matching
- recomendação
- audiência
- explicação

### 3. Experience Layer

Serve apenas projeções filtradas, listas resumidas e índices pesquisáveis.

## Modelo físico recomendado

### Opção preferida: SQLite

Adequado quando a SFIP precisar de:

- relações explícitas
- pesquisa estruturada
- histórico transacional
- versionamento leve
- processamento local ou embarcado

### Alternativa: JSON canónico + índices derivados

Adequado para MVP leve, desde que:

- haja um ficheiro canónico por domínio
- o índice de pesquisa seja regenerado após cada ingestão
- a aplicação nunca use o JSON bruto como fonte de apresentação

## Índices recomendados

- `knowledge_index`
- `deadline_index`
- `group_index`
- `researcher_index`
- `company_index`
- `campaign_audience_index`
- `history_index`

## Campos que deixam de ser fonte de verdade

- `Estado`
- `Dias Restantes`
- `Urgência`
- `Potencial IT`
- `Grupo IT`
- `Investigadores Potencialmente Interessados`
- `Prioridade`
- `Ação Recomendada`
- `Match Processado`

Estes campos passam a ser derivados por regras da Intelligence Layer.

## Fluxo de ingestão

1. Aquisição da fonte.
2. Normalização para o modelo canónico.
3. Deduplicação por entidade e código oficial.
4. Cálculo de inteligência.
5. Escrita em histórico.
6. Publicação de projeções para a interface.

## Fluxo de consumo

1. Interface pede listas leves.
2. Knowledge Engine devolve projeções.
3. Assistant recebe apenas contexto reduzido.
4. Histórico e auditoria ficam fora do caminho principal.

## Resultado esperado

O modelo reduz redundância, melhora desempenho e prepara a SFIP para evoluir de Excel operacional para uma plataforma persistente orientada a objetos.

