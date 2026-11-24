import { describe, expect, it } from "vitest";
import {
  diasEntre,
  fimDoMes,
  formatarData,
  formatarDataLonga,
  hojeISO,
  isoValida,
  rotuloVencimento,
  somarDias,
  somarMeses,
  ultimosMeses,
} from "@/lib/datas";

describe("datas", () => {
  it("formata no padrão DD/MM/AAAA", () => {
    expect(formatarData("2026-11-05")).toBe("05/11/2026");
    expect(formatarData(null)).toBe("—");
  });

  it("formata data longa em português", () => {
    expect(formatarDataLonga("2026-11-23")).toBe("23 de novembro de 2026");
  });

  it("calcula 'hoje' no fuso de São Paulo, não em UTC", () => {
    // 02:30 UTC de 24/11 ainda é 23/11 em São Paulo (UTC-3)
    expect(hojeISO("America/Sao_Paulo", new Date("2026-11-24T02:30:00Z"))).toBe("2026-11-23");
    expect(hojeISO("America/Sao_Paulo", new Date("2026-11-24T03:30:00Z"))).toBe("2026-11-24");
  });

  it("valida datas ISO reais", () => {
    expect(isoValida("2026-02-28")).toBe(true);
    expect(isoValida("2026-02-30")).toBe(false);
    expect(isoValida("2024-02-29")).toBe(true);
    expect(isoValida("24/11/2026")).toBe(false);
    expect(isoValida("2026-11-24'; DROP TABLE contas;--")).toBe(false);
  });

  it("soma dias e meses atravessando anos", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(somarMeses("2026-01", -2)).toBe("2025-11");
    expect(fimDoMes("2028-02")).toBe("2028-02-29");
    expect(ultimosMeses("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("descreve a distância até o vencimento", () => {
    expect(diasEntre("2026-11-24", "2026-11-26")).toBe(2);
    expect(rotuloVencimento("2026-11-24", "2026-11-24")).toBe("Vence hoje");
    expect(rotuloVencimento("2026-11-25", "2026-11-24")).toBe("Vence amanhã");
    expect(rotuloVencimento("2026-12-01", "2026-11-24")).toBe("Vence em 7 dias");
    expect(rotuloVencimento("2026-11-23", "2026-11-24")).toBe("Venceu ontem");
    expect(rotuloVencimento("2026-11-20", "2026-11-24")).toBe("Venceu há 4 dias");
  });
});
