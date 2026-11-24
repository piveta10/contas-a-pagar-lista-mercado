"use server";

import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categorias, contas, pagamentos, responsaveis } from "@/db/schema";
import { registrarHistorico } from "@/lib/auditoria";
import { formatarData, hojeISO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { sucesso, type Resultado } from "@/lib/resultado";
import { ErroNegocio, protegerAcao, responsavelAtual } from "@/lib/sessao";
import { esquemaConta, esquemaId, esquemaPagamento, type EntradaConta } from "@/lib/validacao";

const MSG_DUPLICADA = "Já existe uma conta igual (mesma categoria, descrição, valor e vencimento).";
const esquemaEdicao = esquemaConta.omit({ responsavelId: true, chave: true });

async function categoriaAtiva(id: string) {
  const [c] = await db()
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.ativa, true)))
    .limit(1);
  if (!c) throw new ErroNegocio("Categoria não encontrada.", "NAO_ENCONTRADO");
  return c;
}

async function contaAtiva(id: string) {
  const [c] = await db()
    .select()
    .from(contas)
    .where(and(eq(contas.id, id), isNull(contas.excluidaEm)))
    .limit(1);
  if (!c) throw new ErroNegocio("Conta não encontrada.", "NAO_ENCONTRADO");
  return c;
}

async function verificarDuplicidade(d: { categoriaId: string; descricao: string; valor: number; vencimento: string }, ignorarId?: string) {
  const condicoes = [
    isNull(contas.excluidaEm),
    eq(contas.categoriaId, d.categoriaId),
    eq(sql`lower(${contas.descricao})`, d.descricao.toLowerCase()),
    eq(contas.valorCentavos, d.valor),
    eq(contas.vencimento, d.vencimento),
  ];
  if (ignorarId) condicoes.push(ne(contas.id, ignorarId));
  const [existente] = await db().select({ id: contas.id }).from(contas).where(and(...condicoes)).limit(1);
  if (existente) {
    throw new ErroNegocio(
      `Já existe "${d.descricao}" de ${formatarMoeda(d.valor)} com vencimento em ${formatarData(d.vencimento)}.`,
      "DUPLICADO",
    );
  }
}

function atualizarTelas() {
  revalidatePath("/", "layout");
}

export async function criarConta(entrada: EntradaConta): Promise<Resultado<{ id: string }>> {
  return protegerAcao(
    async () => {
      const d = esquemaConta.parse(entrada);

      // Duplo clique / reenvio: devolve a conta já criada com a mesma chave.
      if (d.chave) {
        const [ja] = await db().select({ id: contas.id }).from(contas).where(eq(contas.chaveIdempotencia, d.chave)).limit(1);
        if (ja) return sucesso({ id: ja.id }, "Conta já estava registrada.");
      }

      const [responsavel] = await db()
        .select({ id: responsaveis.id, nome: responsaveis.nome })
        .from(responsaveis)
        .where(and(eq(responsaveis.id, d.responsavelId), eq(responsaveis.ativo, true)))
        .limit(1);
      if (!responsavel) throw new ErroNegocio("Selecione um responsável válido.", "NAO_ENCONTRADO");
      await categoriaAtiva(d.categoriaId);
      await verificarDuplicidade(d);

      const id = await db().transaction(async (tx) => {
        const [nova] = await tx
          .insert(contas)
          .values({
            descricao: d.descricao,
            categoriaId: d.categoriaId,
            valorCentavos: d.valor,
            vencimento: d.vencimento,
            observacao: d.observacao,
            responsavelId: responsavel.id,
            responsavelNome: responsavel.nome,
            chaveIdempotencia: d.chave ?? null,
          })
          .returning({ id: contas.id });
        await registrarHistorico(
          {
            entidade: "conta",
            entidadeId: nova.id,
            acao: "criada",
            dados: { descricao: d.descricao, valor: d.valor, vencimento: d.vencimento },
            responsavelNome: responsavel.nome,
          },
          tx,
        );
        return nova.id;
      });

      atualizarTelas();
      return sucesso({ id }, "Conta cadastrada!");
    },
    { mensagemDuplicado: MSG_DUPLICADA },
  );
}

export async function editarConta(id: string, entrada: Omit<EntradaConta, "responsavelId" | "chave">): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const contaId = esquemaId.parse(id);
      const d = esquemaEdicao.parse(entrada);
      const antes = await contaAtiva(contaId);
      await categoriaAtiva(d.categoriaId);
      await verificarDuplicidade(d, contaId);
      const quem = await responsavelAtual();

      const mudancas: Record<string, { de: unknown; para: unknown }> = {};
      if (antes.descricao !== d.descricao) mudancas.descricao = { de: antes.descricao, para: d.descricao };
      if (antes.categoriaId !== d.categoriaId) mudancas.categoria = { de: antes.categoriaId, para: d.categoriaId };
      if (antes.valorCentavos !== d.valor) mudancas.valor = { de: antes.valorCentavos, para: d.valor };
      if (antes.vencimento !== d.vencimento) mudancas.vencimento = { de: antes.vencimento, para: d.vencimento };
      if ((antes.observacao ?? null) !== d.observacao) mudancas.observacao = { de: antes.observacao, para: d.observacao };
      if (!Object.keys(mudancas).length) return sucesso(null, "Nenhuma alteração.");

      await db().transaction(async (tx) => {
        await tx
          .update(contas)
          .set({
            descricao: d.descricao,
            categoriaId: d.categoriaId,
            valorCentavos: d.valor,
            vencimento: d.vencimento,
            observacao: d.observacao,
            atualizadoEm: new Date(),
          })
          .where(eq(contas.id, contaId));
        await registrarHistorico(
          { entidade: "conta", entidadeId: contaId, acao: "editada", dados: mudancas, responsavelNome: quem?.nome },
          tx,
        );
      });

      atualizarTelas();
      return sucesso(null, "Conta atualizada!");
    },
    { mensagemDuplicado: MSG_DUPLICADA },
  );
}

export async function excluirConta(id: string): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const contaId = esquemaId.parse(id);
      const conta = await contaAtiva(contaId);
      const quem = await responsavelAtual();
      await db().transaction(async (tx) => {
        await tx
          .update(contas)
          .set({ excluidaEm: new Date(), excluidaPor: quem?.nome ?? "Administrador" })
          .where(eq(contas.id, contaId));
        await registrarHistorico(
          {
            entidade: "conta",
            entidadeId: contaId,
            acao: "excluida",
            dados: { descricao: conta.descricao, valor: conta.valorCentavos, vencimento: conta.vencimento },
            responsavelNome: quem?.nome,
          },
          tx,
        );
      });
      atualizarTelas();
      return sucesso(null, "Conta excluída. Ela pode ser restaurada em Configurações.");
    },
    { admin: true },
  );
}

export async function restaurarConta(id: string): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const contaId = esquemaId.parse(id);
      const quem = await responsavelAtual();
      const [restaurada] = await db()
        .update(contas)
        .set({ excluidaEm: null, excluidaPor: null, atualizadoEm: new Date() })
        .where(and(eq(contas.id, contaId), isNotNull(contas.excluidaEm)))
        .returning({ id: contas.id });
      if (!restaurada) throw new ErroNegocio("Conta não encontrada na lixeira.", "NAO_ENCONTRADO");
      await registrarHistorico({ entidade: "conta", entidadeId: contaId, acao: "restaurada", responsavelNome: quem?.nome });
      atualizarTelas();
      return sucesso(null, "Conta restaurada!");
    },
    { admin: true, mensagemDuplicado: "Não é possível restaurar: já existe uma conta igual ativa." },
  );
}

export async function marcarComoPaga(entrada: {
  contaId: string;
  dataPagamento: string;
  valorPago?: string | number;
}): Promise<Resultado<null>> {
  return protegerAcao(
    async () => {
      const d = esquemaPagamento.parse(entrada);
      if (d.dataPagamento > hojeISO()) throw new ErroNegocio("A data do pagamento não pode ser no futuro.");
      const conta = await contaAtiva(d.contaId);
      const quem = await responsavelAtual();
      const valor = d.valorPago ?? conta.valorCentavos;

      await db().transaction(async (tx) => {
        await tx.insert(pagamentos).values({
          contaId: conta.id,
          dataPagamento: d.dataPagamento,
          valorPagoCentavos: valor,
          registradoPorNome: quem?.nome ?? null,
        });
        await registrarHistorico(
          {
            entidade: "pagamento",
            entidadeId: conta.id,
            acao: "paga",
            dados: { dataPagamento: d.dataPagamento, valorPago: valor },
            responsavelNome: quem?.nome,
          },
          tx,
        );
      });
      atualizarTelas();
      return sucesso(null, `${conta.descricao} marcada como paga!`);
    },
    { mensagemDuplicado: "Esta conta já está marcada como paga." },
  );
}

export async function desfazerPagamento(contaId: string): Promise<Resultado<null>> {
  return protegerAcao(async () => {
    const id = esquemaId.parse(contaId);
    await contaAtiva(id);
    const quem = await responsavelAtual();
    const removido = await db().transaction(async (tx) => {
      const [p] = await tx.delete(pagamentos).where(eq(pagamentos.contaId, id)).returning();
      if (p) {
        await registrarHistorico(
          {
            entidade: "pagamento",
            entidadeId: id,
            acao: "pagamento_desfeito",
            dados: { dataPagamento: p.dataPagamento, valorPago: p.valorPagoCentavos, registradoPor: p.registradoPorNome },
            responsavelNome: quem?.nome,
          },
          tx,
        );
      }
      return p;
    });
    if (!removido) throw new ErroNegocio("Esta conta não estava paga.");
    atualizarTelas();
    return sucesso(null, "Pagamento desfeito. A conta voltou a ficar pendente.");
  });
}
