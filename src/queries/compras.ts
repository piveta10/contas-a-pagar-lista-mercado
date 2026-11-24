import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { itensLista, listasCompras } from "@/db/schema";

export interface ItemCompra {
  id: string;
  descricao: string;
  comprado: boolean;
  adicionadoPorNome: string | null;
  criadoEm: string;
}

export interface ListaCompra {
  id: string;
  data: string;
  status: "ativa" | "arquivada";
  arquivadaEm: string | null;
  itens: ItemCompra[];
}

async function carregarListas(where: ReturnType<typeof and>): Promise<ListaCompra[]> {
  const listas = await db()
    .select()
    .from(listasCompras)
    .where(where)
    .orderBy(asc(listasCompras.data), desc(listasCompras.status), asc(listasCompras.criadoEm));
  if (!listas.length) return [];

  const itens = await db()
    .select()
    .from(itensLista)
    .where(
      inArray(
        itensLista.listaId,
        listas.map((l) => l.id),
      ),
    )
    .orderBy(asc(itensLista.criadoEm));

  return listas.map((l) => ({
    id: l.id,
    data: l.data,
    status: l.status,
    arquivadaEm: l.arquivadaEm ? l.arquivadaEm.toISOString() : null,
    itens: itens
      .filter((i) => i.listaId === l.id)
      .map((i) => ({
        id: i.id,
        descricao: i.descricao,
        comprado: i.comprado,
        adicionadoPorNome: i.adicionadoPorNome,
        criadoEm: i.criadoEm.toISOString(),
      })),
  }));
}

/** Lista ativa e listas arquivadas de uma data. */
export async function listasDaData(data: string) {
  const listas = await carregarListas(and(eq(listasCompras.data, data)));
  return {
    ativa: listas.find((l) => l.status === "ativa") ?? null,
    arquivadas: listas.filter((l) => l.status === "arquivada").reverse(),
  };
}

export async function listasDoPeriodo(de: string, ate: string) {
  return carregarListas(and(gte(listasCompras.data, de), lte(listasCompras.data, ate)));
}

/** Datas com listas registradas (mais recentes primeiro). */
export async function datasComListas(limite = 30) {
  return db()
    .select({
      data: listasCompras.data,
      total: count(itensLista.id),
      comprados: sql<number>`count(*) filter (where ${itensLista.comprado})`.mapWith(Number),
    })
    .from(listasCompras)
    .leftJoin(itensLista, eq(itensLista.listaId, listasCompras.id))
    .groupBy(listasCompras.data)
    .orderBy(desc(listasCompras.data))
    .limit(limite);
}

/** Produtos mais registrados nos últimos 180 dias (para sugestões rápidas). */
export async function produtosFrequentes(limite = 10): Promise<string[]> {
  const linhas = await db()
    .select({ descricao: sql<string>`min(${itensLista.descricao})`, vezes: count() })
    .from(itensLista)
    .where(gte(itensLista.criadoEm, sql`now() - interval '180 days'`))
    .groupBy(sql`lower(${itensLista.descricao})`)
    .orderBy(desc(count()))
    .limit(limite);
  return linhas.filter((l) => l.vezes >= 2).map((l) => l.descricao);
}
