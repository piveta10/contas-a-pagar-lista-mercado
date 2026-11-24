"use client";

import { Check, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { definirResponsavelAtual } from "@/actions/cadastros";
import { executar } from "@/components/ui/executar";

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function SeletorResponsavel({
  responsaveis,
  atual,
}: {
  responsaveis: { id: string; nome: string }[];
  atual: { id: string; nome: string } | null;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  async function escolher(id: string) {
    setAberto(false);
    const r = await executar(() => definirResponsavelAtual(id), { silencioso: true });
    if (r.ok) router.refresh();
  }

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={atual ? `Usando como ${atual.nome}. Trocar responsável` : "Escolher responsável"}
        className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-roxo-500 to-roxo-700 text-sm font-bold text-white shadow-roxo ring-4 ring-white transition hover:scale-105"
      >
        {atual ? iniciais(atual.nome) : <UserRound className="size-5" />}
      </button>
      {aberto && (
        <div role="menu" className="anima-entrar absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-marinho-100 bg-white p-2 shadow-flutuante">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Quem está usando?</p>
          {responsaveis.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Nenhum responsável cadastrado ainda.</p>}
          {responsaveis.map((r) => (
            <button
              key={r.id}
              role="menuitemradio"
              aria-checked={atual?.id === r.id}
              type="button"
              onClick={() => escolher(r.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-roxo-50"
            >
              <span className="grid size-8 place-items-center rounded-full bg-roxo-100 text-xs font-bold text-roxo-700">{iniciais(r.nome)}</span>
              <span className="flex-1 truncate">{r.nome}</span>
              {atual?.id === r.id && <Check className="size-4 text-roxo-600" />}
            </button>
          ))}
          <Link
            href="/configuracoes#responsaveis"
            onClick={() => setAberto(false)}
            className="mt-1 flex items-center gap-2 rounded-xl border-t border-marinho-50 px-3 py-2.5 text-sm font-semibold text-roxo-700 hover:bg-roxo-50"
          >
            <Users className="size-4" /> Gerenciar responsáveis
          </Link>
        </div>
      )}
    </div>
  );
}
