import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias, contas, historicoAlteracoes, itensLista, listasCompras, pagamentos, responsaveis } from "@/db/schema";
import { registrarHistorico } from "@/lib/auditoria";
import { hojeISO } from "@/lib/datas";
import { adminAtivo, responsavelAtual, temSessaoValida } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Exporta todos os dados em JSON. Exige sessão + modo administrador. */
export async function GET() {
  if (!(await temSessaoValida())) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });
  if (!(await adminAtivo())) return NextResponse.json({ erro: "Exige PIN de administrador." }, { status: 403 });

  try {
    const banco = db();
    const [r, c, ct, p, l, i, h] = await Promise.all([
      banco.select().from(responsaveis).orderBy(asc(responsaveis.criadoEm)),
      banco.select().from(categorias).orderBy(asc(categorias.criadoEm)),
      banco.select().from(contas).orderBy(asc(contas.criadoEm)),
      banco.select().from(pagamentos).orderBy(asc(pagamentos.criadoEm)),
      banco.select().from(listasCompras).orderBy(asc(listasCompras.criadoEm)),
      banco.select().from(itensLista).orderBy(asc(itensLista.criadoEm)),
      banco.select().from(historicoAlteracoes).orderBy(asc(historicoAlteracoes.id)),
    ]);
    const quem = await responsavelAtual();
    await registrarHistorico({ entidade: "backup", acao: "exportado", responsavelNome: quem?.nome });

    const corpo = JSON.stringify(
      {
        aplicativo: "controle-de-contas",
        versao: 1,
        geradoEm: new Date().toISOString(),
        dados: {
          responsaveis: r,
          categorias: c,
          contas: ct,
          pagamentos: p,
          listas_compras: l,
          itens_lista: i,
          historico_alteracoes: h,
        },
      },
      null,
      2,
    );
    return new Response(corpo, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="backup-controle-de-contas-${hojeISO()}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[backup]", erro);
    return NextResponse.json({ erro: "Não foi possível gerar o backup." }, { status: 500 });
  }
}
