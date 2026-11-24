import { NextResponse, type NextRequest } from "next/server";
import { diasEntre, formatarData, formatarDataHora } from "@/lib/datas";
import { gerarPdfCompras, paraArrayBuffer } from "@/lib/pdf";
import { temSessaoValida } from "@/lib/sessao";
import { esquemaPeriodo } from "@/lib/validacao";
import { listasDoPeriodo } from "@/queries/compras";

export const dynamic = "force-dynamic";

const diaDaSemana = (iso: string) => {
  const d = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  return d.charAt(0).toUpperCase() + d.slice(1);
};

export async function GET(req: NextRequest) {
  if (!(await temSessaoValida())) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const periodo = esquemaPeriodo.safeParse({ de: sp.get("de"), ate: sp.get("ate") });
  if (!periodo.success) return NextResponse.json({ erro: "Período inválido." }, { status: 400 });
  const { de, ate } = periodo.data;
  if (diasEntre(de, ate) > 366) return NextResponse.json({ erro: "Escolha um período de até 1 ano." }, { status: 400 });

  try {
    const listas = await listasDoPeriodo(de, ate);
    const porData = new Map<string, typeof listas>();
    for (const l of listas) porData.set(l.data, [...(porData.get(l.data) ?? []), l]);

    const todos = listas.flatMap((l) => l.itens);
    const comprados = todos.filter((i) => i.comprado).length;
    const umDia = de === ate;

    const pdf = await gerarPdfCompras({
      titulo: umDia ? "Lista de Compras" : "Listas de Compras",
      periodo: umDia ? `${diaDaSemana(de)}, ${formatarData(de)}` : `Período: ${formatarData(de)} a ${formatarData(ate)}`,
      geradoEm: formatarDataHora(new Date()),
      resumo: `${todos.length} ${todos.length === 1 ? "item" : "itens"} · ${comprados} comprado(s) · ${todos.length - comprados} pendente(s)`,
      grupos: [...porData.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([data, ls]) => ({
          data: `${diaDaSemana(data)}, ${formatarData(data)}`,
          listas: ls.map((l) => ({
            rotulo: l.status === "ativa" ? "LISTA ATUAL" : `ARQUIVADA EM ${l.arquivadaEm ? formatarDataHora(l.arquivadaEm) : ""}`,
            itens: l.itens.map((i) => ({
              descricao: i.descricao,
              comprado: i.comprado,
              detalhe: i.adicionadoPorNome ? `por ${i.adicionadoPorNome}` : undefined,
            })),
          })),
        })),
    });

    const nome = umDia ? `lista-compras-${de}.pdf` : `listas-compras-${de}-a-${ate}.pdf`;
    return new Response(paraArrayBuffer(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[pdf/compras]", erro);
    return NextResponse.json({ erro: "Não foi possível gerar o PDF." }, { status: 500 });
  }
}
