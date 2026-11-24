import { Archive, CalendarDays, Check, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/layout/cabecalho";
import { AcoesLista, SeletorData } from "@/components/compras/controles-lista";
import { ListaRapida } from "@/components/compras/lista-rapida";
import { contextoUsuario, exigirSessao } from "@/lib/contexto";
import { formatarData, formatarDataHora, formatarDataLonga } from "@/lib/datas";
import { dataOuNada, type ParametrosBusca } from "@/lib/filtros";
import { datasComListas, listasDaData, produtosFrequentes } from "@/queries/compras";

export const metadata: Metadata = { title: "Lista de compras" };

const diaDaSemana = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

export default async function PaginaCompras({ searchParams }: { searchParams: Promise<ParametrosBusca> }) {
  await exigirSessao();
  const { hoje } = await contextoUsuario();
  const data = dataOuNada((await searchParams).data) ?? hoje;
  const [listas, datas, frequentes] = await Promise.all([listasDaData(data), datasComListas(30), produtosFrequentes(8)]);
  const itens = listas.ativa?.itens ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
      <div className="min-w-0">
        <Cabecalho titulo="Lista de Compras" subtitulo="Anote na hora em que lembrar. Tudo fica salvo automaticamente." />

        <section className="cartao p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-roxo-600 uppercase">{data === hoje ? "Lista de hoje" : diaDaSemana(data)}</p>
              <p className="text-lg font-extrabold">{formatarDataLonga(data)}</p>
            </div>
            <SeletorData data={data} hoje={hoje} />
          </div>

          <ListaRapida key={data} data={data} hoje={hoje} itensIniciais={itens} sugestoesFrequentes={frequentes} />

          <div className="mt-6 border-t border-marinho-100 pt-4">
            <AcoesLista data={data} hoje={hoje} temItens={itens.length > 0} />
          </div>
        </section>

        {listas.arquivadas.length > 0 && (
          <section className="mt-6 space-y-3" aria-label="Listas arquivadas desta data">
            <h2 className="flex items-center gap-2 px-1 text-sm font-bold tracking-wide text-slate-500 uppercase">
              <Archive className="size-4" /> Arquivadas em {formatarData(data)}
            </h2>
            {listas.arquivadas.map((l) => (
              <details key={l.id} className="cartao group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  <span>
                    Arquivada em {l.arquivadaEm ? formatarDataHora(l.arquivadaEm) : "—"}
                    <span className="ml-2 font-normal text-slate-500">
                      ({l.itens.length} {l.itens.length === 1 ? "item" : "itens"})
                    </span>
                  </span>
                  <span className="text-sm text-roxo-700 group-open:hidden">Ver</span>
                </summary>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {l.itens.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`grid size-5 place-items-center rounded-full ${i.comprado ? "bg-emerald-500 text-white" : "border-2 border-marinho-200"}`}
                      >
                        {i.comprado && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className={i.comprado ? "text-slate-400 line-through" : ""}>{i.descricao}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        )}
      </div>

      <aside className="lg:pt-[84px]" aria-labelledby="titulo-historico-compras">
        <section className="cartao p-4 sm:p-5">
          <h2 id="titulo-historico-compras" className="mb-3 flex items-center gap-2 font-extrabold">
            <History className="size-5 text-roxo-600" /> Histórico de listas
          </h2>
          {datas.length === 0 ? (
            <p className="text-sm text-slate-500">As listas aparecerão aqui conforme forem criadas.</p>
          ) : (
            <ul className="-mx-2 max-h-[420px] space-y-0.5 overflow-y-auto">
              {datas.map((d) => (
                <li key={d.data}>
                  <Link
                    href={d.data === hoje ? "/compras" : `/compras?data=${d.data}`}
                    aria-current={d.data === data ? "page" : undefined}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      d.data === data ? "bg-roxo-50 font-bold text-roxo-800" : "hover:bg-marinho-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-slate-400" />
                      {formatarData(d.data)}
                      {d.data === hoje && <span className="rounded-full bg-roxo-600 px-1.5 text-[10px] font-bold text-white">HOJE</span>}
                    </span>
                    <span className="text-xs text-slate-500">
                      {d.comprados}/{d.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
