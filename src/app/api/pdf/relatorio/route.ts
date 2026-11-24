import { NextResponse, type NextRequest } from "next/server";
import { formatarData, formatarDataHora, hojeISO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { uuidOuNada } from "@/lib/filtros";
import { gerarPdfRelatorio, paraArrayBuffer, type NomeCor } from "@/lib/pdf";
import { temSessaoValida } from "@/lib/sessao";
import { ROTULO_SITUACAO, type Situacao } from "@/lib/situacao";
import { esquemaPeriodo } from "@/lib/validacao";
import { listarCategorias, listarResponsaveis } from "@/queries/cadastros";
import { dadosRelatorio } from "@/queries/relatorios";

export const dynamic = "force-dynamic";

const COR_SITUACAO: Record<Situacao, NomeCor> = { paga: "verde", vencida: "vermelho", vence_hoje: "ambar", a_vencer: "roxo" };
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export async function GET(req: NextRequest) {
  if (!(await temSessaoValida())) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const periodo = esquemaPeriodo.safeParse({ de: sp.get("de"), ate: sp.get("ate") });
  if (!periodo.success) return NextResponse.json({ erro: "Período inválido." }, { status: 400 });
  const { de, ate } = periodo.data;
  if (de < "1900-01-01" || ate > "2200-12-31") return NextResponse.json({ erro: "Período inválido." }, { status: 400 });

  const categoriaId = uuidOuNada(sp.get("categoria") ?? undefined);
  const responsavelId = uuidOuNada(sp.get("responsavel") ?? undefined);

  try {
    const hoje = hojeISO();
    const [dados, categorias, responsaveis] = await Promise.all([
      dadosRelatorio({ de, ate, categoriaId, responsavelId }, hoje),
      listarCategorias(),
      listarResponsaveis(),
    ]);

    const pdf = await gerarPdfRelatorio({
      titulo: "Relatório de Contas",
      periodo: `${formatarData(de)} a ${formatarData(ate)} (por data de vencimento)`,
      geradoEm: formatarDataHora(new Date()),
      filtros: [
        `Categoria: ${categoriaId ? (categorias.find((c) => c.id === categoriaId)?.nome ?? "—") : "Todas"}`,
        `Responsável: ${responsavelId ? (responsaveis.find((r) => r.id === responsavelId)?.nome ?? "—") : "Todos"}`,
        `Situação calculada em ${formatarData(hoje)}`,
      ],
      totais: [
        { rotulo: "Total", valor: formatarMoeda(dados.total.soma), detalhe: plural(dados.total.quantidade, "conta", "contas"), cor: "marinho" },
        { rotulo: "Pagas", valor: formatarMoeda(dados.pagas.soma), detalhe: plural(dados.pagas.quantidade, "conta", "contas"), cor: "verde" },
        { rotulo: "Pendentes", valor: formatarMoeda(dados.pendentes.soma), detalhe: plural(dados.pendentes.quantidade, "conta", "contas"), cor: "roxo" },
        { rotulo: "Vencidas", valor: formatarMoeda(dados.vencidas.soma), detalhe: plural(dados.vencidas.quantidade, "conta", "contas"), cor: "vermelho" },
      ],
      porCategoria: dados.porCategoria.map((c) => ({ nome: c.nome, quantidade: c.quantidade, total: formatarMoeda(c.soma) })),
      linhas: dados.linhas.map((c) => ({
        vencimento: formatarData(c.vencimento),
        descricao: c.descricao,
        categoria: c.categoriaNome,
        responsavel: c.responsavelNome,
        situacao: ROTULO_SITUACAO[c.situacao],
        corSituacao: COR_SITUACAO[c.situacao],
        pagamento: c.dataPagamento ? formatarData(c.dataPagamento) : "—",
        valor: formatarMoeda(c.valorCentavos),
      })),
    });

    return new Response(paraArrayBuffer(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio-contas-${de}-a-${ate}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[pdf/relatorio]", erro);
    return NextResponse.json({ erro: "Não foi possível gerar o PDF." }, { status: 500 });
  }
}
