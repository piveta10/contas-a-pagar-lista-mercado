import type { ContaLinha } from "@/queries/contas";
import { mesDe } from "./datas";

export interface Totalizador {
  quantidade: number;
  soma: number;
}

export interface DadosRelatorio {
  linhas: ContaLinha[];
  total: Totalizador;
  pagas: Totalizador;
  pendentes: Totalizador;
  vencidas: Totalizador;
  porCategoria: { nome: string; cor: string; quantidade: number; soma: number }[];
  porMes: { mes: string; pagas: number; pendentes: number; vencidas: number }[];
  porResponsavel: { nome: string; quantidade: number; soma: number }[];
}

const zero = (): Totalizador => ({ quantidade: 0, soma: 0 });

export function agregar(linhas: ContaLinha[]): Omit<DadosRelatorio, "linhas"> {
  const total = zero();
  const pagas = zero();
  const pendentes = zero();
  const vencidas = zero();
  const categorias = new Map<string, { nome: string; cor: string; quantidade: number; soma: number }>();
  const meses = new Map<string, { mes: string; pagas: number; pendentes: number; vencidas: number }>();
  const responsaveis = new Map<string, { nome: string; quantidade: number; soma: number }>();

  for (const c of linhas) {
    total.quantidade++;
    total.soma += c.valorCentavos;
    const alvo = c.situacao === "paga" ? pagas : c.situacao === "vencida" ? vencidas : pendentes;
    alvo.quantidade++;
    alvo.soma += c.valorCentavos;

    const cat = categorias.get(c.categoriaId) ?? { nome: c.categoriaNome, cor: c.categoriaCor, quantidade: 0, soma: 0 };
    cat.quantidade++;
    cat.soma += c.valorCentavos;
    categorias.set(c.categoriaId, cat);

    const m = mesDe(c.vencimento);
    const mes = meses.get(m) ?? { mes: m, pagas: 0, pendentes: 0, vencidas: 0 };
    if (c.situacao === "paga") mes.pagas += c.valorCentavos;
    else if (c.situacao === "vencida") mes.vencidas += c.valorCentavos;
    else mes.pendentes += c.valorCentavos;
    meses.set(m, mes);

    const r = responsaveis.get(c.responsavelNome) ?? { nome: c.responsavelNome, quantidade: 0, soma: 0 };
    r.quantidade++;
    r.soma += c.valorCentavos;
    responsaveis.set(c.responsavelNome, r);
  }

  return {
    total,
    pagas,
    pendentes,
    vencidas,
    porCategoria: [...categorias.values()].sort((a, b) => b.soma - a.soma),
    porMes: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    porResponsavel: [...responsaveis.values()].sort((a, b) => b.soma - a.soma),
  };
}
