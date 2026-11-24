-- =====================================================================
-- Controle de Contas — migration 0001 (estrutura inicial)
-- Executada por scripts/migrate.ts dentro de uma transação.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Responsáveis: quem faz os lançamentos (sem login individual)
-- Remoção é lógica (ativo = false) para nunca perder a identificação.
-- ---------------------------------------------------------------------
CREATE TABLE responsaveis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           varchar(80)  NOT NULL CHECK (length(btrim(nome)) > 0),
  ativo          boolean      NOT NULL DEFAULT true,
  criado_em      timestamptz  NOT NULL DEFAULT now(),
  atualizado_em  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX responsaveis_nome_ativo_uq ON responsaveis (lower(nome)) WHERE ativo;

-- ---------------------------------------------------------------------
-- Categorias (Luz, Água, ... + personalizadas)
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           varchar(60)  NOT NULL CHECK (length(btrim(nome)) > 0),
  icone          varchar(40)  NOT NULL DEFAULT 'receipt',
  cor            varchar(9)   NOT NULL DEFAULT '#6a24f5' CHECK (cor ~ '^#[0-9a-fA-F]{6}$'),
  padrao         boolean      NOT NULL DEFAULT false,
  ativa          boolean      NOT NULL DEFAULT true,
  criado_em      timestamptz  NOT NULL DEFAULT now(),
  atualizado_em  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categorias_nome_ativa_uq ON categorias (lower(nome)) WHERE ativa;

-- ---------------------------------------------------------------------
-- Contas
-- responsavel_nome é um "retrato" gravado no momento do cadastro:
-- mesmo que o responsável seja renomeado ou removido, a conta continua
-- mostrando quem fez o lançamento.
-- Exclusão é lógica (excluida_em) para preservar o histórico.
-- ---------------------------------------------------------------------
CREATE TABLE contas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao           varchar(120) NOT NULL CHECK (length(btrim(descricao)) > 0),
  categoria_id        uuid         NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  valor_centavos      bigint       NOT NULL CHECK (valor_centavos > 0 AND valor_centavos < 100000000000),
  vencimento          date         NOT NULL,
  observacao          varchar(500),
  responsavel_id      uuid         REFERENCES responsaveis(id) ON DELETE SET NULL,
  responsavel_nome    varchar(80)  NOT NULL,
  chave_idempotencia  uuid         UNIQUE,
  excluida_em         timestamptz,
  excluida_por        varchar(80),
  criado_em           timestamptz  NOT NULL DEFAULT now(),
  atualizado_em       timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX contas_vencimento_ativas_idx ON contas (vencimento) WHERE excluida_em IS NULL;
CREATE INDEX contas_categoria_idx        ON contas (categoria_id);
CREATE INDEX contas_responsavel_idx      ON contas (responsavel_id);
-- Evita duplicação acidental: mesma categoria + descrição + valor + vencimento.
CREATE UNIQUE INDEX contas_sem_duplicidade_uq
  ON contas (categoria_id, lower(descricao), valor_centavos, vencimento)
  WHERE excluida_em IS NULL;

-- ---------------------------------------------------------------------
-- Pagamentos (no máximo um pagamento ativo por conta)
-- ---------------------------------------------------------------------
CREATE TABLE pagamentos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id             uuid        NOT NULL UNIQUE REFERENCES contas(id) ON DELETE CASCADE,
  data_pagamento       date        NOT NULL,
  valor_pago_centavos  bigint      NOT NULL CHECK (valor_pago_centavos > 0),
  registrado_por_nome  varchar(80),
  criado_em            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pagamentos_data_idx ON pagamentos (data_pagamento);

-- ---------------------------------------------------------------------
-- Listas de compras: uma lista ATIVA por data; "Limpar lista" arquiva
-- a lista (status = 'arquivada') em vez de apagar os itens.
-- ---------------------------------------------------------------------
CREATE TABLE listas_compras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data          date        NOT NULL,
  status        varchar(12) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'arquivada')),
  arquivada_em  timestamptz,
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX listas_compras_ativa_por_data_uq ON listas_compras (data) WHERE status = 'ativa';
CREATE INDEX listas_compras_data_idx ON listas_compras (data);

CREATE TABLE itens_lista (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id             uuid         NOT NULL REFERENCES listas_compras(id) ON DELETE CASCADE,
  descricao            varchar(120) NOT NULL CHECK (length(btrim(descricao)) > 0),
  comprado             boolean      NOT NULL DEFAULT false,
  comprado_em          timestamptz,
  adicionado_por_nome  varchar(80),
  criado_em            timestamptz  NOT NULL DEFAULT now(),
  atualizado_em        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX itens_lista_lista_idx ON itens_lista (lista_id, criado_em);
CREATE INDEX itens_lista_descricao_idx ON itens_lista (lower(descricao));

-- ---------------------------------------------------------------------
-- Histórico de alterações (auditoria)
-- ---------------------------------------------------------------------
CREATE TABLE historico_alteracoes (
  id                bigserial PRIMARY KEY,
  entidade          varchar(30) NOT NULL,
  entidade_id       uuid,
  acao              varchar(30) NOT NULL,
  dados             jsonb,
  responsavel_nome  varchar(80),
  criado_em         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historico_entidade_idx ON historico_alteracoes (entidade, entidade_id, criado_em DESC);

-- ---------------------------------------------------------------------
-- Tentativas de acesso (limite contra força bruta do código e do PIN)
-- ---------------------------------------------------------------------
CREATE TABLE tentativas_acesso (
  id         bigserial PRIMARY KEY,
  tipo       varchar(10) NOT NULL CHECK (tipo IN ('acesso', 'admin')),
  ip_hash    char(64)    NOT NULL,
  sucesso    boolean     NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tentativas_acesso_idx ON tentativas_acesso (tipo, ip_hash, criado_em DESC);

-- ---------------------------------------------------------------------
-- Categorias padrão (configuração inicial, não são dados de contas)
-- ---------------------------------------------------------------------
INSERT INTO categorias (nome, icone, cor, padrao) VALUES
  ('Luz',      'zap',           '#f59e0b', true),
  ('Água',     'droplet',       '#0ea5e9', true),
  ('Internet', 'wifi',          '#7c3aed', true),
  ('Mercado',  'shopping-cart', '#16a34a', true),
  ('Aluguel',  'home',          '#1e1b6b', true),
  ('Telefone', 'phone',         '#db2777', true),
  ('Outros',   'receipt',       '#64748b', true);
