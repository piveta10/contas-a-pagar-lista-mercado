import { AlertCircle, CalendarClock, CheckCircle2, FileBarChart, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/layout/cabecalho";
import { GraficoCategorias, GraficoPorMes } from "@/components/graficos/graficos";
import { BotaoPdf } from "@/components/pdf/botao-pdf";
import { FiltrosRelatorio } from "@/components/relatorios/filtros-relatorio";
import { IconeCategoria } from "@/components/ui/icone-categoria";
import { COR_VALOR, SeloSituacao } from "@/components/ui/selo-situacao";
import { categoriasAtivas, contextoUsuario, exigirSessao } from "@/lib/contexto";
import { fimDoMes, formatarData, inicioDoMes, mesDe } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { dataOuNada, uuidOuNada, type ParametrosBusca } from "@/lib/filtros";
import { dadosRelatorio } from "@/queries/relatorios";

export const metadata: Metadata = { title: "Relatórios" };

export default async function PaginaRelatorios({ searchParams }: { searchParams: Promise<ParametrosBusca> }) {
  await exigirSessao();
  const sp = await searchParams;
  const [{ hoje, responsaveis }, categorias] = await Promise.all([contextoUsuario(), categoriasAtivas()]);
  const mes = mesDe(hoje);
  let de = dataOuNada(sp.de) ?? inicioDoMes(mes);
  let ate = dataOuNada(sp.ate) ?? fimDoMes(mes);
  if (de > ate) [de, ate] = [ate, de];
  const categoria = uuidOuNada(sp.categoria);
  const responsavel = uuidOuNada(sp.responsavel);

  const dados = await dadosRelatorio({ de, ate, categoriaId: categoria, responsavelId: responsavel }, hoje);

  const qs = new URLSearchParams({ de, ate });
  if (categoria) qs.set("categoria", categoria);
  if (responsavel) qs.set("responsavel", responsavel);

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        subtitulo={`Período: ${formatarData(de)} a ${formatarData(ate)}`}
        acoes={
          <BotaoPdf
            url={`/api/pdf/relatorio?${qs}`}
            nomeArquivo={`relatorio-contas-${de}-a-${ate}.pdf`}
            variante="marinho"
            className="hidden sm:inline-flex"
          />
        }
      />

      <FiltrosRelatorio hoje={hoje} inicial={{ de, ate, categoria, responsavel }} categorias={categorias} responsaveis={responsaveis} />

      <section aria-label="Totais" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total icone={Wallet} rotulo="Total no período" t={dados.total} classe="bg-gradient-to-br from-marinho-800 to-marinho-950 text-white" />
        <Total icone={CheckCircle2} rotulo="Pagas" t={dados.pagas} classe="bg-emerald-50 text-emerald-900" />
        <Total icone={CalendarClock} rotulo="Pendentes" t={dados.pendentes} classe="bg-roxo-50 text-roxo-900" />
        <Total icone={AlertCircle} rotulo="Vencidas" t={dados.vencidas} classe="bg-rose-50 text-rose-900" />
      </section>

      <BotaoPdf
        url={`/api/pdf/relatorio?${qs}`}
        nomeArquivo={`relatorio-contas-${de}-a-${ate}.pdf`}
        variante="marinho"
        tamanho="lg"
        className="mt-4 w-full sm:hidden"
      />

      {dados.linhas.length === 0 ? (
        <div className="cartao mt-6 px-6 py-14 text-center">
          <FileBarChart className="mx-auto size-10 text-roxo-300" />
          <p className="mt-3 font-semibold">Nenhuma conta neste período</p>
          <p className="text-sm text-slate-500">Escolha outro período ou ajuste os filtros.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <section className="cartao p-4 sm:p-6 lg:col-span-3">
              <h2 className="text-lg font-extrabold">Valores por mês</h2>
              <p className="mb-3 text-sm text-slate-500">Pagas, pendentes e vencidas</p>
              <GraficoPorMes dados={dados.porMes} />
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full bg-emerald-600" /> Pagas</span>
                <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full bg-roxo-600" /> Pendentes</span>
                <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full bg-rose-600" /> Vencidas</span>
              </div>
            </section>
            <section className="cartao p-4 sm:p-6 lg:col-span-2">
              <h2 className="text-lg font-extrabold">Por categoria</h2>
              <GraficoCategorias dados={dados.porCategoria} />
              <ul className="mt-2 space-y-2">
                {dados.porCategoria.map((c) => (
                  <li key={c.nome} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.cor }} />
                      <span className="truncate">{c.nome}</span>
                      <span className="text-slate-400">({c.quantidade})</span>
                    </span>
                    <span className="font-bold tabular-nums">{formatarMoeda(c.soma)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {dados.porResponsavel.length > 1 && (
            <section className="cartao mt-6 p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-extrabold">Por responsável</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {dados.porResponsavel.map((r) => (
                  <div key={r.nome} className="rounded-2xl bg-marinho-50/70 px-4 py-3">
                    <p className="text-sm font-semibold">{r.nome}</p>
                    <p className="text-lg font-extrabold tabular-nums">{formatarMoeda(r.soma)}</p>
                    <p className="text-xs text-slate-500">
                      {r.quantidade} {r.quantidade === 1 ? "conta" : "contas"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="cartao mt-6 overflow-hidden" aria-labelledby="titulo-detalhe">
            <h2 id="titulo-detalhe" className="px-4 pt-5 pb-3 text-lg font-extrabold sm:px-6">
              Detalhamento ({dados.linhas.length})
            </h2>
            {/* Tabela no computador */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-marinho-900 text-left text-xs tracking-wide text-white uppercase">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Vencimento</th>
                    <th className="px-3 py-3 font-semibold">Descrição</th>
                    <th className="px-3 py-3 font-semibold">Categoria</th>
                    <th className="px-3 py-3 font-semibold">Responsável</th>
                    <th className="px-3 py-3 font-semibold">Situação</th>
                    <th className="px-3 py-3 font-semibold">Pago em</th>
                    <th className="px-6 py-3 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.linhas.map((c) => (
                    <tr key={c.id} className={`border-b border-marinho-50 ${c.situacao === "vencida" ? "bg-rose-50/70" : "even:bg-marinho-50/40"}`}>
                      <td className="px-6 py-3 tabular-nums">{formatarData(c.vencimento)}</td>
                      <td className="px-3 py-3 font-semibold">
                        <Link href={`/contas/${c.id}`} className="hover:text-roxo-700 hover:underline">
                          {c.descricao}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{c.categoriaNome}</td>
                      <td className="px-3 py-3">{c.responsavelNome}</td>
                      <td className="px-3 py-3">
                        <SeloSituacao situacao={c.situacao} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">{c.dataPagamento ? formatarData(c.dataPagamento) : "—"}</td>
                      <td className={`px-6 py-3 text-right font-bold tabular-nums ${COR_VALOR[c.situacao]}`}>{formatarMoeda(c.valorCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cartões no celular */}
            <ul className="divide-y divide-marinho-50 md:hidden">
              {dados.linhas.map((c) => (
                <li key={c.id}>
                  <Link href={`/contas/${c.id}`} className={`flex items-center gap-3 px-4 py-3 ${c.situacao === "vencida" ? "bg-rose-50" : ""}`}>
                    <IconeCategoria icone={c.categoriaIcone} cor={c.categoriaCor} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {formatarData(c.vencimento)} · {c.responsavelNome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold tabular-nums ${COR_VALOR[c.situacao]}`}>{formatarMoeda(c.valorCentavos)}</p>
                      <SeloSituacao situacao={c.situacao} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function Total({ icone: Icone, rotulo, t, classe }: { icone: LucideIcon; rotulo: string; t: { quantidade: number; soma: number }; classe: string }) {
  return (
    <div className={`rounded-cartao p-4 shadow-cartao sm:p-5 ${classe}`}>
      <Icone className="size-5 opacity-80" />
      <p className="mt-2 text-[13px] font-semibold opacity-75">{rotulo}</p>
      <p className="truncate text-lg font-extrabold tabular-nums sm:text-2xl">{formatarMoeda(t.soma)}</p>
      <p className="text-xs opacity-70">
        {t.quantidade} {t.quantidade === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}
