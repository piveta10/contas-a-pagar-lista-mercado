"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { itensLista, listasCompras } from "@/db/schema";
import { registrarHistorico } from "@/lib/auditoria";
import { formatarData } from "@/lib/datas";
import { sucesso, type Resultado } from "@/lib/resultado";
import { ErroNegocio, protegerAcao, responsavelAtual } from "@/lib/sessao";
import { esquemaData, esquemaId, esquemaItem, limparTexto } from "@/lib/validacao";
import type { ItemCompra } from "@/queries/compras";
import { z } from "zod";

const MAX_ITENS_POR_LISTA = 300;

function paraItem(i: typeof itensLista.$inferSelect): ItemCompra {
  return {
    id: i.id,
    descricao: i.descricao,
    comprado: i.comprado,
    adicionadoPorNome: i.adicionadoPorNome,
    criadoEm: i.criadoEm.toISOString(),
  };
}

/** Busca (ou cria) a lista ativa da data — seguro contra cliques simultâneos. */
async function listaAtivaDaData(data: string): Promise<string> {
  await db().execute(sql`
    INSERT INTO listas_compras (data) VALUES (${data})
    ON CONFLICT (data) WHERE status = 'ativa' DO NOTHING`);
  const [lista] = await db()
    .select({ id: listasCompras.id })
    .from(listasCompras)
    .where(and(eq(listasCompras.data, data), eq(listasCompras.status, "ativa")))
    .limit(1);
  if (!lista) throw new Error("Lista ativa não encontrada após criação.");
  return lista.id;
}

/** Item só pode ser alterado se a lista dele ainda estiver ativa (histórico é preservado). */
async function itemEditavel(id: string) {
  const [linha] = await db()
    .select({ item: itensLista, status: listasCompras.status, data: listasCompras.data })
    .from(itensLista)
    .innerJoin(listasCompras, eq(listasCompras.id, itensLista.listaId))
    .where(eq(itensLista.id, id))
    .limit(1);
  if (!linha) throw new ErroNegocio("Item não encontrado.", "NAO_ENCONTRADO");
  if (linha.status !== "ativa") throw new ErroNegocio("Este item faz parte de uma lista arquivada e não pode ser alterado.");
  return linha;
}

function atualizar() {
  revalidatePath("/", "layout");
}

export async function adicionarItem(entrada: {
  data: string;
  descricao: string;
}): Promise<Resultado<{ item: ItemCompra; duplicado: boolean }>> {
  return protegerAcao(async () => {
    const d = esquemaItem.parse(entrada);
    const listaId = await listaAtivaDaData(d.data);

    const [existente] = await db()
      .select()
      .from(itensLista)
      .where(
        and(
          eq(itensLista.listaId, listaId),
          eq(itensLista.comprado, false),
          eq(sql`lower(${itensLista.descricao})`, d.descricao.toLowerCase()),
        ),
      )
      .limit(1);
    if (existente) return sucesso({ item: paraItem(existente), duplicado: true }, `${existente.descricao} já está na lista.`);

    const [{ total }] = await db().select({ total: count() }).from(itensLista).where(eq(itensLista.listaId, listaId));
    if (total >= MAX_ITENS_POR_LISTA) throw new ErroNegocio(`A lista chegou ao limite de ${MAX_ITENS_POR_LISTA} itens.`);

    const quem = await responsavelAtual();
    const [novo] = await db()
      .insert(itensLista)
      .values({ listaId, descricao: d.descricao, adicionadoPorNome: quem?.nome ?? null })
      .returning();

    atualizar();
    return sucesso({ item: paraItem(novo), duplicado: false }, `${novo.descricao} adicionado!`);
  });
}

export async function marcarItem(id: string, comprado: boolean): Promise<Resultado<null>> {
  return protegerAcao(async () => {
    const itemId = esquemaId.parse(id);
    const marcado = z.boolean().parse(comprado);
    await itemEditavel(itemId);
    await db()
      .update(itensLista)
      .set({ comprado: marcado, compradoEm: marcado ? new Date() : null, atualizadoEm: new Date() })
      .where(eq(itensLista.id, itemId));
    atualizar();
    return sucesso(null);
  });
}

export async function editarItem(id: string, descricao: string): Promise<Resultado<{ descricao: string }>> {
  return protegerAcao(async () => {
    const itemId = esquemaId.parse(id);
    const nova = z
      .string()
      .transform(limparTexto)
      .pipe(z.string().min(1, "Digite o nome do produto.").max(120, "Use no máximo 120 caracteres."))
      .parse(descricao);
    await itemEditavel(itemId);
    await db().update(itensLista).set({ descricao: nova, atualizadoEm: new Date() }).where(eq(itensLista.id, itemId));
    atualizar();
    return sucesso({ descricao: nova }, "Item atualizado.");
  });
}

export async function excluirItem(
  id: string,
): Promise<Resultado<{ item: ItemCompra; data: string }>> {
  return protegerAcao(async () => {
    const itemId = esquemaId.parse(id);
    const { item, data } = await itemEditavel(itemId);
    await db().delete(itensLista).where(eq(itensLista.id, itemId));
    atualizar();
    return sucesso({ item: paraItem(item), data }, `${item.descricao} removido.`);
  });
}

/** Desfaz a exclusão de um item (botão "Desfazer"). */
export async function restaurarItem(entrada: {
  id: string;
  data: string;
  descricao: string;
  comprado: boolean;
  adicionadoPorNome: string | null;
}): Promise<Resultado<{ item: ItemCompra }>> {
  return protegerAcao(async () => {
    const id = esquemaId.parse(entrada.id);
    const d = esquemaItem.parse({ data: entrada.data, descricao: entrada.descricao });
    const listaId = await listaAtivaDaData(d.data);
    const [item] = await db()
      .insert(itensLista)
      .values({
        id,
        listaId,
        descricao: d.descricao,
        comprado: Boolean(entrada.comprado),
        compradoEm: entrada.comprado ? new Date() : null,
        adicionadoPorNome: entrada.adicionadoPorNome ? limparTexto(entrada.adicionadoPorNome).slice(0, 80) : null,
      })
      .onConflictDoNothing()
      .returning();
    atualizar();
    if (!item) throw new ErroNegocio("O item já havia sido restaurado.");
    return sucesso({ item: paraItem(item) }, "Item restaurado.");
  });
}

/** "Limpar lista atual": arquiva a lista da data (nada é apagado). */
export async function limparLista(data: string): Promise<Resultado<{ arquivados: number }>> {
  return protegerAcao(async () => {
    const dia = esquemaData.parse(data);
    const quem = await responsavelAtual();
    const [lista] = await db()
      .select({ id: listasCompras.id })
      .from(listasCompras)
      .where(and(eq(listasCompras.data, dia), eq(listasCompras.status, "ativa")))
      .limit(1);
    if (!lista) throw new ErroNegocio("Não há lista ativa nesta data.");

    const [{ total }] = await db().select({ total: count() }).from(itensLista).where(eq(itensLista.listaId, lista.id));
    if (total === 0) throw new ErroNegocio("A lista já está vazia.");

    await db().transaction(async (tx) => {
      await tx
        .update(listasCompras)
        .set({ status: "arquivada", arquivadaEm: new Date() })
        .where(and(eq(listasCompras.id, lista.id), eq(listasCompras.status, "ativa")));
      await registrarHistorico(
        { entidade: "lista_compras", entidadeId: lista.id, acao: "arquivada", dados: { data: dia, itens: total }, responsavelNome: quem?.nome },
        tx,
      );
    });
    atualizar();
    return sucesso(
      { arquivados: total },
      `Lista de ${formatarData(dia)} arquivada (${total} ${total === 1 ? "item" : "itens"}). Ela continua no histórico.`,
    );
  });
}
