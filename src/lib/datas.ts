/**
 * Datas são trafegadas como texto ISO "AAAA-MM-DD" (sem horário) para
 * evitar problemas de fuso. "Hoje" é sempre calculado no fuso da casa.
 */
export const FUSO_PADRAO = "America/Sao_Paulo";

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 86_400_000;

export function fusoApp(): string {
  return (typeof process !== "undefined" && process.env?.APP_TIMEZONE) || FUSO_PADRAO;
}

/** Data de hoje (AAAA-MM-DD) no fuso informado. */
export function hojeISO(fuso: string = fusoApp(), agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function isoValida(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  const m = RE_ISO.exec(valor);
  if (!m) return false;
  const [, a, mm, d] = m.map(Number);
  const data = new Date(Date.UTC(a, mm - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === mm - 1 && data.getUTCDate() === d && a >= 1900 && a <= 2200;
}

function paraUTC(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function deUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** "2026-11-24" → "24/11/2026" */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-11-24" → "24 de novembro de 2026" */
export function formatarDataLonga(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(paraUTC(iso)),
  );
}

/** Data/hora de um timestamp em DD/MM/AAAA HH:MM no fuso da casa. */
export function formatarDataHora(valor: Date | string, fuso: string = fusoApp()): string {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
  return partes.replace(",", "");
}

/** Número de dias de `de` até `ate` (positivo se `ate` for depois). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUTC(ate) - paraUTC(de)) / DIA_MS);
}

export function somarDias(iso: string, dias: number): string {
  return deUTC(paraUTC(iso) + dias * DIA_MS);
}

/** "2026-11-24" → "2026-11" */
export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

export function mesValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

export function inicioDoMes(mes: string): string {
  return `${mes}-01`;
}

export function fimDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return deUTC(Date.UTC(a, m, 0));
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Lista de meses terminando em `mes` (inclusive), do mais antigo ao mais novo. */
export function ultimosMeses(mes: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarMeses(mes, i - quantidade + 1));
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeMesCurto(mes: string): string {
  return MESES_CURTOS[Number(mes.slice(5, 7)) - 1] ?? mes;
}

/** "2026-11" → "novembro de 2026" */
export function nomeMesLongo(mes: string): string {
  return `${MESES_LONGOS[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
}

/** Texto amigável da distância até o vencimento. */
export function rotuloVencimento(vencimento: string, hoje: string): string {
  const dias = diasEntre(hoje, vencimento);
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias > 1) return `Vence em ${dias} dias`;
  if (dias === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(dias)} dias`;
}
