import { describe, expect, it } from "vitest";
import { converterParaCentavos, digitosParaCentavos, formatarMoeda } from "@/lib/dinheiro";

describe("dinheiro", () => {
  it("formata no padrão R$ 0,00", () => {
    expect(formatarMoeda(248350)).toBe("R$ 2.483,50");
    expect(formatarMoeda(5)).toBe("R$ 0,05");
    expect(formatarMoeda(100000000)).toBe("R$ 1.000.000,00");
  });

  it.each([
    ["R$ 1.234,56", 123456],
    ["1234,56", 123456],
    ["98,5", 9850],
    ["1234.56", 123456],
    ["1.234", 123400],
    ["287,90", 28790],
    [42.1, 4210],
  ])("converte %s para centavos", (entrada, esperado) => {
    expect(converterParaCentavos(entrada)).toBe(esperado);
  });

  it.each(["", "0", "0,00", "-10", "abc", "1,2,3", "12,345", "1e5"])("rejeita %s", (entrada) => {
    expect(converterParaCentavos(entrada)).toBeNull();
  });

  it("máscara de digitação estilo caixa eletrônico", () => {
    expect(digitosParaCentavos("9850")).toBe(9850);
    expect(digitosParaCentavos("R$ 98,50")).toBe(9850);
    expect(digitosParaCentavos("")).toBe(0);
  });
});
