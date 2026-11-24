import { Inbox, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecalho } from "@/components/layout/cabecalho";
import { FiltrosContas } from "@/components/contas/filtros-contas";
import { LinhaConta } from "@/components/contas/linha-conta";
import { BotaoLink } from "@/components/ui/botao";
import { categoriasAtivas, contextoUsuario, exigirSessao } from "@/lib/contexto";
import { formatarMoeda } from "@/lib/dinheiro";
import { lerFiltrosContas, type ParametrosBusca } from "@/lib/filtros";
import { listarContas } from "@/queries/contas";

export const metadata: Metadata = { title: "Contas" };

export default async function PaginaContas({ searchParams }: { searchParams: Promise<ParametrosBusca> }) {
  await exigirSessao();
  const filtros = lerFiltrosContas(await searchParams);
  const [{ hoje, responsaveis }, categorias] = await Promise.all([contextoUsuario(), categoriasAtivas()]);
  const contas = await listarContas({ ...filtros, limite: 500 }, hoje);
  const total = contas.reduce((s, c) => s + c.valorCentavos, 0);
  const vencidas = contas.filter((c) => c.situacao === "vencida").length;

  return (
    <>
      <Cabecalho
        titulo="Contas"
        subtitulo="Cadastre, pague e acompanhe o histórico."
        acoes={
          <BotaoLink href="/contas/nova" className="hidden sm:inline-flex">
            <Plus className="size-5" /> Nova Conta
          </BotaoLink>
        }
      />

      <Suspense>
        <FiltrosContas categorias={categorias} responsaveis={responsaveis} />
      </Suspense>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 px-1 text-sm text-slate-500">
        <span>
          <strong className="text-marinho-900">{contas.length}</strong> {contas.length === 1 ? "conta" : "contas"}
          {vencidas > 0 && <span className="ml-2 font-semibold text-rose-600">· {vencidas} vencida(s)</span>}
        </span>
        <span>
          Total: <strong className="text-base text-marinho-900">{formatarMoeda(total)}</strong>
        </span>
      </div>

      <section className="cartao mt-3 p-2 sm:p-3">
        {contas.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox className="mx-auto size-10 text-roxo-300" />
            <p className="mt-3 font-semibold">Nenhuma conta encontrada</p>
            <p className="text-sm text-slate-500">Ajuste os filtros ou cadastre uma nova conta.</p>
            <BotaoLink href="/contas/nova" className="mt-5">
              <Plus className="size-5" /> Nova Conta
            </BotaoLink>
          </div>
        ) : (
          <div className="space-y-1">
            {contas.map((c) => (
              <LinhaConta key={c.id} conta={c} hoje={hoje} />
            ))}
          </div>
        )}
        {contas.length >= 500 && (
          <p className="p-3 text-center text-xs text-slate-500">Mostrando as 500 primeiras. Use os filtros de período para refinar.</p>
        )}
      </section>

      {/* Botão flutuante no celular */}
      <BotaoLink
        href="/contas/nova"
        aria-label="Nova conta"
        className="fixed right-4 bottom-24 z-30 size-14! rounded-full px-0! shadow-flutuante sm:hidden"
      >
        <Plus className="size-7" />
      </BotaoLink>
    </>
  );
}
