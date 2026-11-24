import { describe, expect, it } from "vitest";
import { calcularSituacao, ordenarPorUrgencia, type Situacao } from "@/lib/situacao";

const HOJE = "2026-11-24";

describe("situação das contas", () => {
  it("identifica vencidas automaticamente pela data atual", () => {
    expect(calcularSituacao("2026-11-20", null, HOJE)).toBe("vencida");
    expect(calcularSituacao("2026-11-24", null, HOJE)).toBe("vence_hoje");
    expect(calcularSituacao("2026-11-25", null, HOJE)).toBe("a_vencer");
  });

  it("conta paga nunca é vencida", () => {
    expect(calcularSituacao("2026-01-01", "2026-01-10", HOJE)).toBe("paga");
  });

  it("ordena: vencidas → hoje → a vencer (mais próxima primeiro) → pagas", () => {
    const contas: { id: string; vencimento: string; situacao: Situacao }[] = [
      { id: "futura-longe", vencimento: "2026-12-20", situacao: "a_vencer" },
      { id: "paga", vencimento: "2026-11-10", situacao: "paga" },
      { id: "vencida-recente", vencimento: "2026-11-20", situacao: "vencida" },
      { id: "hoje", vencimento: "2026-11-24", situacao: "vence_hoje" },
      { id: "futura-perto", vencimento: "2026-11-26", situacao: "a_vencer" },
      { id: "vencida-antiga", vencimento: "2026-10-05", situacao: "vencida" },
    ];
    expect(ordenarPorUrgencia(contas).map((c) => c.id)).toEqual([
      "vencida-antiga",
      "vencida-recente",
      "hoje",
      "futura-perto",
      "futura-longe",
      "paga",
    ]);
  });
});
