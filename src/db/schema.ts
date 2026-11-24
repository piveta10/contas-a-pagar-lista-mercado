/**
 * Mapeamento Drizzle das tabelas. A fonte da verdade da estrutura são as
 * migrations SQL em db/migrations (índices parciais, CHECKs, dados iniciais).
 */
import {
  bigint,
  bigserial,
  boolean,
  char,
  date,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const criadoEm = () => timestamp("criado_em", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const responsaveis = pgTable("responsaveis", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 80 }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 60 }).notNull(),
  icone: varchar("icone", { length: 40 }).notNull().default("receipt"),
  cor: varchar("cor", { length: 9 }).notNull().default("#6a24f5"),
  padrao: boolean("padrao").notNull().default(false),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const contas = pgTable("contas", {
  id: uuid("id").primaryKey().defaultRandom(),
  descricao: varchar("descricao", { length: 120 }).notNull(),
  categoriaId: uuid("categoria_id")
    .notNull()
    .references(() => categorias.id, { onDelete: "restrict" }),
  valorCentavos: bigint("valor_centavos", { mode: "number" }).notNull(),
  vencimento: date("vencimento", { mode: "string" }).notNull(),
  observacao: varchar("observacao", { length: 500 }),
  responsavelId: uuid("responsavel_id").references(() => responsaveis.id, { onDelete: "set null" }),
  responsavelNome: varchar("responsavel_nome", { length: 80 }).notNull(),
  chaveIdempotencia: uuid("chave_idempotencia").unique(),
  excluidaEm: timestamp("excluida_em", { withTimezone: true, mode: "date" }),
  excluidaPor: varchar("excluida_por", { length: 80 }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const pagamentos = pgTable("pagamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  contaId: uuid("conta_id")
    .notNull()
    .unique()
    .references(() => contas.id, { onDelete: "cascade" }),
  dataPagamento: date("data_pagamento", { mode: "string" }).notNull(),
  valorPagoCentavos: bigint("valor_pago_centavos", { mode: "number" }).notNull(),
  registradoPorNome: varchar("registrado_por_nome", { length: 80 }),
  criadoEm: criadoEm(),
});

export const listasCompras = pgTable("listas_compras", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: date("data", { mode: "string" }).notNull(),
  status: varchar("status", { length: 12, enum: ["ativa", "arquivada"] }).notNull().default("ativa"),
  arquivadaEm: timestamp("arquivada_em", { withTimezone: true, mode: "date" }),
  criadoEm: criadoEm(),
});

export const itensLista = pgTable("itens_lista", {
  id: uuid("id").primaryKey().defaultRandom(),
  listaId: uuid("lista_id")
    .notNull()
    .references(() => listasCompras.id, { onDelete: "cascade" }),
  descricao: varchar("descricao", { length: 120 }).notNull(),
  comprado: boolean("comprado").notNull().default(false),
  compradoEm: timestamp("comprado_em", { withTimezone: true, mode: "date" }),
  adicionadoPorNome: varchar("adicionado_por_nome", { length: 80 }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const historicoAlteracoes = pgTable("historico_alteracoes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  entidade: varchar("entidade", { length: 30 }).notNull(),
  entidadeId: uuid("entidade_id"),
  acao: varchar("acao", { length: 30 }).notNull(),
  dados: jsonb("dados").$type<Record<string, unknown>>(),
  responsavelNome: varchar("responsavel_nome", { length: 80 }),
  criadoEm: criadoEm(),
});

export const tentativasAcesso = pgTable("tentativas_acesso", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tipo: varchar("tipo", { length: 10, enum: ["acesso", "admin"] }).notNull(),
  ipHash: char("ip_hash", { length: 64 }).notNull(),
  sucesso: boolean("sucesso").notNull(),
  criadoEm: criadoEm(),
});
