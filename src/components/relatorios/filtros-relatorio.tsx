"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { fimDoMes, inicioDoMes, mesDe, somarMeses } from "@/lib/datas";

export function FiltrosRelatorio({
  hoje,
  inicial,
  categorias,
  responsaveis,
}: {
  hoje: string;
  inicial: { de: string; ate: string; categoria?: string; responsavel?: string };
  categorias: { id: string; nome: string }[];
  responsaveis: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendente, iniciar] = useTransition();
  const [f, setF] = useState(inicial);
  const mes = mesDe(hoje);

  const atalhos = [
    { rotulo: "Este mês", de: inicioDoMes(mes), ate: fimDoMes(mes) },
    { rotulo: "Mês passado", de: inicioDoMes(somarMeses(mes, -1)), ate: fimDoMes(somarMeses(mes, -1)) },
    { rotulo: "Últimos 3 meses", de: inicioDoMes(somarMeses(mes, -2)), ate: fimDoMes(mes) },
    { rotulo: "Este ano", de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` },
  ];

  function aplicar(novo = f) {
    if (!novo.de || !novo.ate || novo.de > novo.ate) return;
    const p = new URLSearchParams({ de: novo.de, ate: novo.ate });
    if (novo.categoria) p.set("categoria", novo.categoria);
    if (novo.responsavel) p.set("responsavel", novo.responsavel);
    iniciar(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  }

  const invalido = !f.de || !f.ate || f.de > f.ate;

  return (
    <div className={`cartao p-4 sm:p-5 ${pendente ? "opacity-70" : ""}`}>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {atalhos.map((a) => {
          const ativo = a.de === f.de && a.ate === f.ate;
          return (
            <button
              key={a.rotulo}
              type="button"
              onClick={() => {
                const novo = { ...f, de: a.de, ate: a.ate };
                setF(novo);
                aplicar(novo);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                ativo ? "bg-marinho-900 text-white" : "bg-white text-marinho-700 ring-1 ring-marinho-100 hover:bg-marinho-50"
              }`}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          aplicar();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <div>
          <label htmlFor="r-de" className="rotulo">
            Data inicial
          </label>
          <input id="r-de" type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="campo" />
        </div>
        <div>
          <label htmlFor="r-ate" className="rotulo">
            Data final
          </label>
          <input id="r-ate" type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="campo" />
        </div>
        <div>
          <label htmlFor="r-cat" className="rotulo">
            Categoria
          </label>
          <select id="r-cat" value={f.categoria ?? ""} onChange={(e) => setF({ ...f, categoria: e.target.value || undefined })} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="r-resp" className="rotulo">
            Responsável
          </label>
          <select
            id="r-resp"
            value={f.responsavel ?? ""}
            onChange={(e) => setF({ ...f, responsavel: e.target.value || undefined })}
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
        <Botao type="submit" disabled={invalido} carregando={pendente} className="sm:col-span-2 lg:col-span-1">
          Atualizar
        </Botao>
      </form>
      {invalido && <p className="mt-2 text-sm text-rose-600">A data inicial deve ser anterior ou igual à final.</p>}
      <p className="mt-3 text-xs text-slate-500">O período considera a data de vencimento das contas.</p>
    </div>
  );
}
