import { diasEntre } from "./datas";

export type Situacao = "paga" | "vencida" | "vence_hoje" | "a_vencer";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  paga: "Paga",
  vencida: "Vencida",
  vence_hoje: "Vence hoje",
  a_vencer: "A vencer",
};

/** Situação calculada a partir da data atual — nunca fica desatualizada. */
export function calcularSituacao(vencimento: string, dataPagamento: string | null, hoje: string): Situacao {
  if (dataPagamento) return "paga";
  const dias = diasEntre(hoje, vencimento);
  if (dias < 0) return "vencida";
  if (dias === 0) return "vence_hoje";
  return "a_vencer";
}

const PESO: Record<Situacao, number> = { vencida: 0, vence_hoje: 1, a_vencer: 2, paga: 3 };

/**
 * Ordena pelo que precisa de atenção:
 * vencidas (mais antigas primeiro) → vence hoje → a vencer (mais próximas primeiro) → pagas (mais recentes primeiro).
 */
export function ordenarPorUrgencia<T extends { vencimento: string; situacao: Situacao }>(contas: T[]): T[] {
  return [...contas].sort((a, b) => {
    const p = PESO[a.situacao] - PESO[b.situacao];
    if (p !== 0) return p;
    if (a.situacao === "paga") return b.vencimento.localeCompare(a.vencimento);
    return a.vencimento.localeCompare(b.vencimento);
  });
}
