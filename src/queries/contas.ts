import "server-only";
import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lt, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categorias, contas, historicoAlteracoes, pagamentos } from "@/db/schema";
import { hojeISO } from "@/lib/datas";
import { escaparLike, type FiltrosContas } from "@/lib/filtros";
import { calcularSituacao, ordenarPorUrgencia, type Situacao } from "@/lib/situacao";

export interface ContaLinha {
  id: string;
  descricao: string;
  valorCentavos: number;
  vencimento: string;
  observacao: string | null;
  responsavelId: string | null;
  responsavelNome: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaIcone: string;
  categoriaCor: string;
  dataPagamento: string | null;
  valorPagoCentavos: number | null;
  pagamentoRegistradoPor: string | null;
  situacao: Situacao;
}

const colunas = {
  id: contas.id,
  descricao: contas.descricao,
  valorCentavos: contas.valorCentavos,
  vencimento: contas.vencimento,
  observacao: contas.observacao,
  responsavelId: contas.responsavelId,
  responsavelNome: contas.responsavelNome,
  categoriaId: contas.categoriaId,
  categoriaNome: categorias.nome,
  categoriaIcone: categorias.icone,
  categoriaCor: categorias.cor,
  dataPagamento: pagamentos.dataPagamento,
  valorPagoCentavos: pagamentos.valorPagoCentavos,
  pagamentoRegistradoPor: pagamentos.registradoPorNome,
};

function consultaBase() {
  return db()
    .select(colunas)
    .from(contas)
    .innerJoin(categorias, eq(categorias.id, contas.categoriaId))
    .leftJoin(pagamentos, eq(pagamentos.contaId, contas.id));
}

export async function listarContas(
  f: Partial<FiltrosContas> & { limite?: number; ordem?: "urgencia" | "vencimento" },
  hoje: string = hojeISO(),
): Promise<ContaLinha[]> {
  const condicoes: SQL[] = [isNull(contas.excluidaEm)];
  if (f.categoriaId) condicoes.push(eq(contas.categoriaId, f.categoriaId));
  if (f.responsavelId) condicoes.push(eq(contas.responsavelId, f.responsavelId));
  if (f.de) condicoes.push(gte(contas.vencimento, f.de));
  if (f.ate) condicoes.push(lte(contas.vencimento, f.ate));
  if (f.busca) condicoes.push(ilike(contas.descricao, `%${escaparLike(f.busca)}%`));
  switch (f.situacao) {
    case "pagas":
      condicoes.push(isNotNull(pagamentos.id));
      break;
    case "pendentes":
      condicoes.push(isNull(pagamentos.id));
      break;
    case "vencidas":
      condicoes.push(isNull(pagamentos.id), lt(contas.vencimento, hoje));
      break;
    case "a_vencer":
      condicoes.push(isNull(pagamentos.id), gte(contas.vencimento, hoje));
      break;
  }

  const linhas = await consultaBase()
    .where(and(...condicoes))
    .orderBy(asc(contas.vencimento), asc(contas.descricao))
    .limit(Math.min(f.limite ?? 500, 5000));

  const comSituacao = linhas.map((l) => ({ ...l, situacao: calcularSituacao(l.vencimento, l.dataPagamento, hoje) }));
  return f.ordem === "vencimento" ? comSituacao : ordenarPorUrgencia(comSituacao);
}

export async function obterConta(id: string, hoje: string = hojeISO()): Promise<ContaLinha | null> {
  const [l] = await consultaBase()
    .where(and(eq(contas.id, id), isNull(contas.excluidaEm)))
    .limit(1);
  return l ? { ...l, situacao: calcularSituacao(l.vencimento, l.dataPagamento, hoje) } : null;
}

export async function historicoDaConta(id: string) {
  const linhas = await db()
    .select({
      id: historicoAlteracoes.id,
      acao: historicoAlteracoes.acao,
      dados: historicoAlteracoes.dados,
      responsavelNome: historicoAlteracoes.responsavelNome,
      criadoEm: historicoAlteracoes.criadoEm,
    })
    .from(historicoAlteracoes)
    .where(eq(historicoAlteracoes.entidadeId, id))
    .orderBy(desc(historicoAlteracoes.criadoEm))
    .limit(50);
  return linhas.map((l) => ({ ...l, criadoEm: l.criadoEm.toISOString() }));
}

export async function listarContasExcluidas() {
  const linhas = await db()
    .select({
      id: contas.id,
      descricao: contas.descricao,
      valorCentavos: contas.valorCentavos,
      vencimento: contas.vencimento,
      categoriaNome: categorias.nome,
      excluidaEm: contas.excluidaEm,
      excluidaPor: contas.excluidaPor,
    })
    .from(contas)
    .innerJoin(categorias, eq(categorias.id, contas.categoriaId))
    .where(isNotNull(contas.excluidaEm))
    .orderBy(desc(contas.excluidaEm))
    .limit(30);
  return linhas.map((l) => ({ ...l, excluidaEm: l.excluidaEm ? l.excluidaEm.toISOString() : null }));
}
