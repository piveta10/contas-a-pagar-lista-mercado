import "server-only";
import { agregar, type DadosRelatorio } from "@/lib/agregacao";
import { hojeISO } from "@/lib/datas";
import { listarContas } from "./contas";

export type { DadosRelatorio };

export interface FiltrosRelatorio {
  de: string;
  ate: string;
  categoriaId?: string;
  responsavelId?: string;
}

export async function dadosRelatorio(f: FiltrosRelatorio, hoje: string = hojeISO()): Promise<DadosRelatorio> {
  const linhas = await listarContas(
    { de: f.de, ate: f.ate, categoriaId: f.categoriaId, responsavelId: f.responsavelId, situacao: "todas", limite: 5000, ordem: "vencimento" },
    hoje,
  );
  return { linhas, ...agregar(linhas) };
}
