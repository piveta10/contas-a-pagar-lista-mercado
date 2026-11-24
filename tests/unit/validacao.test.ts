import { describe, expect, it } from "vitest";
import { agregar } from "@/lib/agregacao";
import { escaparLike, lerFiltrosContas } from "@/lib/filtros";
import { esquemaConta, esquemaItem, esquemaPeriodo, limparTexto } from "@/lib/validacao";
import type { ContaLinha } from "@/queries/contas";

const ID = "3f1c2b8e-1d2a-4c3b-9e8f-1a2b3c4d5e6f";

describe("validação no servidor", () => {
  it("aceita uma conta válida e converte o valor", () => {
    const r = esquemaConta.parse({
      descricao: "  Conta   de luz ",
      categoriaId: ID,
      valor: "287,90",
      vencimento: "2026-11-20",
      responsavelId: ID,
      observacao: "",
    });
    expect(r.descricao).toBe("Conta de luz");
    expect(r.valor).toBe(28790);
    expect(r.observacao).toBeNull();
  });

  it("recusa valor zero, data inválida, descrição vazia e ids falsos", () => {
    const base = { descricao: "Água", categoriaId: ID, valor: "10", vencimento: "2026-11-20", responsavelId: ID };
    expect(esquemaConta.safeParse({ ...base, valor: "0" }).success).toBe(false);
    expect(esquemaConta.safeParse({ ...base, vencimento: "2026-02-31" }).success).toBe(false);
    expect(esquemaConta.safeParse({ ...base, descricao: "   " }).success).toBe(false);
    expect(esquemaConta.safeParse({ ...base, categoriaId: "1 OR 1=1" }).success).toBe(false);
    expect(esquemaConta.safeParse({ ...base, descricao: "x".repeat(121) }).success).toBe(false);
  });

  it("remove caracteres de controle", () => {
    expect(limparTexto("Lei\u0000te\n\n")).toBe("Lei te");
  });

  it("mantém texto com < > como texto (o React escapa na tela)", () => {
    expect(esquemaItem.parse({ data: "2026-11-24", descricao: "<script>alert(1)</script>" }).descricao).toBe(
      "<script>alert(1)</script>",
    );
  });

  it("valida período", () => {
    expect(esquemaPeriodo.safeParse({ de: "2026-11-01", ate: "2026-11-30" }).success).toBe(true);
    expect(esquemaPeriodo.safeParse({ de: "2026-12-01", ate: "2026-11-30" }).success).toBe(false);
  });

  it("ignora filtros malformados vindos da URL", () => {
    const f = lerFiltrosContas({ categoria: "'; drop table contas; --", situacao: "hackeada", de: "ontem", busca: "luz" });
    expect(f).toEqual({ busca: "luz", categoriaId: undefined, responsavelId: undefined, situacao: "todas", de: undefined, ate: undefined });
  });

  it("escapa curingas do LIKE", () => {
    expect(escaparLike("100%_x\\")).toBe("100\\%\\_x\\\\");
  });
});

describe("agregação do relatório", () => {
  const conta = (p: Partial<ContaLinha>): ContaLinha => ({
    id: Math.random().toString(),
    descricao: "x",
    valorCentavos: 1000,
    vencimento: "2026-11-10",
    observacao: null,
    responsavelId: null,
    responsavelNome: "Ana",
    categoriaId: "c1",
    categoriaNome: "Luz",
    categoriaIcone: "zap",
    categoriaCor: "#f59e0b",
    dataPagamento: null,
    valorPagoCentavos: null,
    pagamentoRegistradoPor: null,
    situacao: "a_vencer",
    ...p,
  });

  it("soma pagas, pendentes e vencidas separadamente", () => {
    const r = agregar([
      conta({ valorCentavos: 10000, situacao: "paga" }),
      conta({ valorCentavos: 2500, situacao: "vencida", categoriaId: "c2", categoriaNome: "Água" }),
      conta({ valorCentavos: 1500, situacao: "vence_hoje", vencimento: "2026-12-01", responsavelNome: "Beto" }),
    ]);
    expect(r.total).toEqual({ quantidade: 3, soma: 14000 });
    expect(r.pagas.soma).toBe(10000);
    expect(r.vencidas.soma).toBe(2500);
    expect(r.pendentes.soma).toBe(1500);
    expect(r.porCategoria[0]).toMatchObject({ nome: "Luz", soma: 11500 });
    expect(r.porMes.map((m) => m.mes)).toEqual(["2026-11", "2026-12"]);
    expect(r.porResponsavel).toHaveLength(2);
  });
});
