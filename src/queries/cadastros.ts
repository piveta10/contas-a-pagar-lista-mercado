import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categorias, responsaveis } from "@/db/schema";

export type Responsavel = { id: string; nome: string };
export type Categoria = { id: string; nome: string; icone: string; cor: string; padrao: boolean };

export async function listarResponsaveis(): Promise<Responsavel[]> {
  return db()
    .select({ id: responsaveis.id, nome: responsaveis.nome })
    .from(responsaveis)
    .where(eq(responsaveis.ativo, true))
    .orderBy(asc(responsaveis.nome));
}

export async function listarCategorias(): Promise<Categoria[]> {
  return db()
    .select({ id: categorias.id, nome: categorias.nome, icone: categorias.icone, cor: categorias.cor, padrao: categorias.padrao })
    .from(categorias)
    .where(eq(categorias.ativa, true))
    .orderBy(asc(categorias.nome));
}
