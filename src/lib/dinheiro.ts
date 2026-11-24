/** Valores trafegam em centavos (inteiros) para evitar erros de arredondamento. */

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoNumero = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const VALOR_MAXIMO_CENTAVOS = 99_999_999_999; // R$ 999.999.999,99

/** 248350 → "R$ 2.483,50" (espaço comum, para uso em texto e PDF) */
export function formatarMoeda(centavos: number): string {
  return formatoMoeda.format(centavos / 100).replace(/ /g, " ");
}

/** 248350 → "2.483,50" */
export function formatarNumero(centavos: number): string {
  return formatoNumero.format(centavos / 100);
}

/**
 * Converte o que o usuário digitou em centavos.
 * Aceita "R$ 1.234,56", "1234,56", "1234.56", "1.234", "98,5".
 * Retorna null se for inválido, zero ou negativo.
 */
export function converterParaCentavos(entrada: string | number): number | null {
  if (typeof entrada === "number") {
    if (!Number.isFinite(entrada)) return null;
    const c = Math.round(entrada * 100);
    return c > 0 && c <= VALOR_MAXIMO_CENTAVOS ? c : null;
  }
  let texto = entrada.replace(/R\$/gi, "").replace(/[\s ]/g, "");
  if (!texto || !/^[\d.,]+$/.test(texto)) return null;

  if (texto.includes(",")) {
    // Padrão brasileiro: ponto = milhar, vírgula = decimal
    if ((texto.match(/,/g) ?? []).length > 1) return null;
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(texto)) {
    // "1234.56" → decimal com ponto
  } else {
    // "1.234" ou "1.234.567" → milhar
    texto = texto.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const [inteiro, decimal = ""] = texto.split(".");
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > VALOR_MAXIMO_CENTAVOS) return null;
  return centavos;
}

/** Máscara estilo caixa eletrônico: só dígitos → centavos. "9850" → 9850 */
export function digitosParaCentavos(digitos: string): number {
  const limpo = digitos.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  return limpo ? Number(limpo) : 0;
}
