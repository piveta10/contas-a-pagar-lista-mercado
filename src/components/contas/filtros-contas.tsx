"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SITUACOES_FILTRO } from "@/lib/filtros";

export function FiltrosContas({
  categorias,
  responsaveis,
}: {
  categorias: { id: string; nome: string }[];
  responsaveis: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const [avancado, setAvancado] = useState(
    Boolean(params.get("categoria") || params.get("responsavel") || params.get("de") || params.get("ate")),
  );

  function definir(chave: string, valor: string | null) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    iniciar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  // Busca com pequeno atraso para não recarregar a cada tecla.
  useEffect(() => {
    if (busca === (params.get("busca") ?? "")) return;
    const t = setTimeout(() => definir("busca", busca.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const situacao = params.get("situacao") ?? "todas";
  const temFiltros = params.size > 0;

  return (
    <div className={`space-y-3 transition-opacity ${pendente ? "opacity-70" : ""}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição"
            aria-label="Buscar por descrição"
            className="campo pl-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setAvancado((v) => !v)}
          aria-expanded={avancado}
          className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
            avancado ? "border-roxo-300 bg-roxo-50 text-roxo-700" : "border-marinho-100 bg-white text-marinho-700"
          }`}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Situação">
        {SITUACOES_FILTRO.map((s) => (
          <button
            key={s.valor}
            type="button"
            role="tab"
            aria-selected={situacao === s.valor}
            onClick={() => definir("situacao", s.valor === "todas" ? null : s.valor)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              situacao === s.valor
                ? s.valor === "vencidas"
                  ? "bg-rose-600 text-white"
                  : "bg-marinho-900 text-white"
                : "bg-white text-marinho-700 ring-1 ring-marinho-100 hover:bg-marinho-50"
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {avancado && (
        <div className="anima-entrar grid gap-3 rounded-2xl border border-marinho-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-categoria" className="rotulo">
              Categoria
            </label>
            <select
              id="f-categoria"
              value={params.get("categoria") ?? ""}
              onChange={(e) => definir("categoria", e.target.value || null)}
              className="campo"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-responsavel" className="rotulo">
              Responsável
            </label>
            <select
              id="f-responsavel"
              value={params.get("responsavel") ?? ""}
              onChange={(e) => definir("responsavel", e.target.value || null)}
              className="campo"
            >
              <option value="">Todos</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-de" className="rotulo">
              Vencimento de
            </label>
            <input id="f-de" type="date" value={params.get("de") ?? ""} onChange={(e) => definir("de", e.target.value || null)} className="campo" />
          </div>
          <div>
            <label htmlFor="f-ate" className="rotulo">
              Vencimento até
            </label>
            <input id="f-ate" type="date" value={params.get("ate") ?? ""} onChange={(e) => definir("ate", e.target.value || null)} className="campo" />
          </div>
        </div>
      )}

      {temFiltros && (
        <button
          type="button"
          onClick={() => {
            setBusca("");
            iniciar(() => router.replace(pathname, { scroll: false }));
          }}
          className="flex items-center gap-1 text-sm font-semibold text-roxo-700 hover:underline"
        >
          <X className="size-4" /> Limpar filtros
        </button>
      )}
    </div>
  );
}
