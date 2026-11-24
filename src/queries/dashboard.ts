import "server-only";
import { and, count, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { contas, pagamentos } from "@/db/schema";
import { fimDoMes, inicioDoMes, ultimosMeses } from "@/lib/datas";
import { listarContas } from "./contas";

const somaValor = sql<number>`coalesce(sum(${contas.valorCentavos}), 0)`.mapWith(Number);

export async function dadosDashboard(mes: string, hoje: string) {
  const ini = inicioDoMes(mes);
  const fim = fimDoMes(mes);
  const ativas = isNull(contas.excluidaEm);
  const meses = ultimosMeses(mes, 6);
  const expMes = sql<string>`to_char(${contas.vencimento}, 'YYYY-MM')`;

  const [totalMes, pagasMes, aVencer, vencidas, atencao, resumo] = await Promise.all([
    db()
      .select({ quantidade: count(), soma: somaValor })
      .from(contas)
      .where(and(ativas, gte(contas.vencimento, ini), lte(contas.vencimento, fim))),
    db()
      .select({
        quantidade: count(),
        soma: sql<number>`coalesce(sum(${pagamentos.valorPagoCentavos}), 0)`.mapWith(Number),
      })
      .from(pagamentos)
      .innerJoin(contas, eq(contas.id, pagamentos.contaId))
      .where(and(ativas, gte(pagamentos.dataPagamento, ini), lte(pagamentos.dataPagamento, fim))),
    db()
      .select({ quantidade: count(), soma: somaValor })
      .from(contas)
      .leftJoin(pagamentos, eq(pagamentos.contaId, contas.id))
      .where(and(ativas, isNull(pagamentos.id), gte(contas.vencimento, hoje))),
    db()
      .select({ quantidade: count(), soma: somaValor })
      .from(contas)
      .leftJoin(pagamentos, eq(pagamentos.contaId, contas.id))
      .where(and(ativas, isNull(pagamentos.id), lt(contas.vencimento, hoje))),
    listarContas({ situacao: "pendentes", limite: 6 }, hoje),
    db()
      .select({
        mes: expMes,
        pagas: sql<number>`coalesce(sum(${contas.valorCentavos}) filter (where ${pagamentos.id} is not null), 0)`.mapWith(Number),
        aPagar: sql<number>`coalesce(sum(${contas.valorCentavos}) filter (where ${pagamentos.id} is null), 0)`.mapWith(Number),
      })
      .from(contas)
      .leftJoin(pagamentos, eq(pagamentos.contaId, contas.id))
      .where(and(ativas, gte(contas.vencimento, inicioDoMes(meses[0])), lte(contas.vencimento, fim)))
      .groupBy(expMes),
  ]);

  const porMes = new Map(resumo.map((r) => [r.mes, r]));
  return {
    totalMes: totalMes[0] ?? { quantidade: 0, soma: 0 },
    pagasMes: pagasMes[0] ?? { quantidade: 0, soma: 0 },
    aVencer: aVencer[0] ?? { quantidade: 0, soma: 0 },
    vencidas: vencidas[0] ?? { quantidade: 0, soma: 0 },
    atencao,
    resumoMeses: meses.map((m) => ({ mes: m, pagas: porMes.get(m)?.pagas ?? 0, aPagar: porMes.get(m)?.aPagar ?? 0 })),
  };
}
