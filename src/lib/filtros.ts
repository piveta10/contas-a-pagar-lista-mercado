import { isoValida } from "./datas";

export type FiltroSituacao = "todas" | "pendentes" | "vencidas" | "a_vencer" | "pagas";
export const SITUACOES_FILTRO: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "pendentes", rotulo: "Pendentes" },
  { valor: "vencidas", rotulo: "Vencidas" },
  { valor: "a_vencer", rotulo: "A vencer" },
  { valor: "pagas", rotulo: "Pagas" },
];

export interface FiltrosContas {
  busca?: string;
  categoriaId?: string;
  responsavelId?: string;
  situacao: FiltroSituacao;
  de?: string;
  ate?: string;
}

export type ParametrosBusca = Record<string, string | string[] | undefined>;

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function primeiro(valor: string | string[] | undefined): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && v.length <= 200 ? v : undefined;
}

export function uuidOuNada(valor: string | string[] | undefined): string | undefined {
  const v = primeiro(valor);
  return v && RE_UUID.test(v) ? v : undefined;
}

export function dataOuNada(valor: string | string[] | undefined): string | undefined {
  const v = primeiro(valor);
  return isoValida(v) ? v : undefined;
}

/** Lê filtros da URL ignorando qualquer valor inválido. */
export function lerFiltrosContas(sp: ParametrosBusca): FiltrosContas {
  const situacao = primeiro(sp.situacao);
  const busca = primeiro(sp.busca)?.trim().slice(0, 80);
  return {
    busca: busca || undefined,
    categoriaId: uuidOuNada(sp.categoria),
    responsavelId: uuidOuNada(sp.responsavel),
    situacao: SITUACOES_FILTRO.some((s) => s.valor === situacao) ? (situacao as FiltroSituacao) : "todas",
    de: dataOuNada(sp.de),
    ate: dataOuNada(sp.ate),
  };
}

/** Escapa curingas do LIKE (%, _ e \) para busca literal. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
