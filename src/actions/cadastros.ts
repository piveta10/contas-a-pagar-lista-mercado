"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categorias, responsaveis } from "@/db/schema";
import { registrarHistorico } from "@/lib/auditoria";
import { sucesso, type Resultado } from "@/lib/resultado";
import {
  COOKIE_RESPONSAVEL,
  definirCookieResponsavel,
  ErroNegocio,
  protegerAcao,
  responsavelAtual,
} from "@/lib/sessao";
import { esquemaCategoria, esquemaId, esquemaResponsavel } from "@/lib/validacao";

function atualizar() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Responsáveis
// ---------------------------------------------------------------------------
export async function criarResponsavel(nome: string): Promise<Resultado<{ id: string; nome: string }>> {
  return protegerAcao(
    async () => {
      const d = esquemaResponsavel.parse({ nome });
      const [novo] = await db().insert(responsaveis).values({ nome: d.nome }).returning({ id: responsaveis.id, nome: responsaveis.nome });
      await registrarHistorico({ entidade: "responsavel", entidadeId: novo.id, acao: "criado", dados: { nome: novo.nome } });
      // Se este aparelho ainda não escolheu quem está usando, assume o recém-criado.
      if (!(await responsavelAtual())) await definirCookieResponsavel(novo.id);
      atualizar();
      return sucesso(novo, `${novo.nome} cadastrado!`);
    },
    { mensagemDuplicado: "Já existe um responsável com esse nome." },
  );
}

export async function renomearResponsavel(id: string, nome: string): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const rid = esquemaId.parse(id);
      const d = esquemaResponsavel.parse({ nome });
      const [antes] = await db().select().from(responsaveis).where(and(eq(responsaveis.id, rid), eq(responsaveis.ativo, true)));
      if (!antes) throw new ErroNegocio("Responsável não encontrado.", "NAO_ENCONTRADO");
      await db().update(responsaveis).set({ nome: d.nome, atualizadoEm: new Date() }).where(eq(responsaveis.id, rid));
      await registrarHistorico({ entidade: "responsavel", entidadeId: rid, acao: "renomeado", dados: { de: antes.nome, para: d.nome } });
      atualizar();
      return sucesso(null, "Nome atualizado. As contas já lançadas mantêm o nome original.");
    },
    { admin: true, mensagemDuplicado: "Já existe um responsável com esse nome." },
  );
}

export async function removerResponsavel(id: string): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const rid = esquemaId.parse(id);
      const [r] = await db()
        .update(responsaveis)
        .set({ ativo: false, atualizadoEm: new Date() })
        .where(and(eq(responsaveis.id, rid), eq(responsaveis.ativo, true)))
        .returning({ nome: responsaveis.nome });
      if (!r) throw new ErroNegocio("Responsável não encontrado.", "NAO_ENCONTRADO");
      await registrarHistorico({ entidade: "responsavel", entidadeId: rid, acao: "removido", dados: { nome: r.nome } });
      if ((await cookies()).get(COOKIE_RESPONSAVEL)?.value === rid) await definirCookieResponsavel(null);
      atualizar();
      return sucesso(null, `${r.nome} removido. As contas lançadas continuam identificadas.`);
    },
    { admin: true },
  );
}

/** Define quem está usando este aparelho (preferência local, não é login). */
export async function definirResponsavelAtual(id: string | null): Promise<Resultado<null>> {
  return protegerAcao(async () => {
    if (id === null) {
      await definirCookieResponsavel(null);
    } else {
      const rid = esquemaId.parse(id);
      const [r] = await db()
        .select({ id: responsaveis.id })
        .from(responsaveis)
        .where(and(eq(responsaveis.id, rid), eq(responsaveis.ativo, true)));
      if (!r) throw new ErroNegocio("Responsável não encontrado.", "NAO_ENCONTRADO");
      await definirCookieResponsavel(r.id);
    }
    atualizar();
    return sucesso(null);
  });
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
type EntradaCategoria = { nome: string; icone: string; cor: string };

export async function criarCategoria(entrada: EntradaCategoria): Promise<Resultado<{ id: string; nome: string; icone: string; cor: string }>> {
  return protegerAcao(
    async () => {
      const d = esquemaCategoria.parse(entrada);
      const [nova] = await db()
        .insert(categorias)
        .values(d)
        .returning({ id: categorias.id, nome: categorias.nome, icone: categorias.icone, cor: categorias.cor });
      const quem = await responsavelAtual();
      await registrarHistorico({ entidade: "categoria", entidadeId: nova.id, acao: "criada", dados: d, responsavelNome: quem?.nome });
      atualizar();
      return sucesso(nova, `Categoria ${nova.nome} criada!`);
    },
    { mensagemDuplicado: "Já existe uma categoria com esse nome." },
  );
}

export async function editarCategoria(id: string, entrada: EntradaCategoria): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const cid = esquemaId.parse(id);
      const d = esquemaCategoria.parse(entrada);
      const [r] = await db()
        .update(categorias)
        .set({ ...d, atualizadoEm: new Date() })
        .where(and(eq(categorias.id, cid), eq(categorias.ativa, true)))
        .returning({ id: categorias.id });
      if (!r) throw new ErroNegocio("Categoria não encontrada.", "NAO_ENCONTRADO");
      await registrarHistorico({ entidade: "categoria", entidadeId: cid, acao: "editada", dados: d });
      atualizar();
      return sucesso(null, "Categoria atualizada!");
    },
    { admin: true, mensagemDuplicado: "Já existe uma categoria com esse nome." },
  );
}

export async function removerCategoria(id: string): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const cid = esquemaId.parse(id);
      const [{ restantes }] = await db()
        .select({ restantes: count() })
        .from(categorias)
        .where(and(eq(categorias.ativa, true), ne(categorias.id, cid)));
      if (restantes === 0) throw new ErroNegocio("Mantenha pelo menos uma categoria.");
      const [r] = await db()
        .update(categorias)
        .set({ ativa: false, atualizadoEm: new Date() })
        .where(and(eq(categorias.id, cid), eq(categorias.ativa, true)))
        .returning({ nome: categorias.nome });
      if (!r) throw new ErroNegocio("Categoria não encontrada.", "NAO_ENCONTRADO");
      await registrarHistorico({ entidade: "categoria", entidadeId: cid, acao: "removida", dados: { nome: r.nome } });
      atualizar();
      return sucesso(null, `Categoria ${r.nome} removida. Contas antigas continuam com ela.`);
    },
    { admin: true },
  );
}
