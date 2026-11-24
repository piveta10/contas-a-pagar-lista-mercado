"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useSyncExternalStore } from "react";

type TipoToast = "sucesso" | "erro" | "info";
interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
  acao?: { rotulo: string; aoClicar: () => void };
}

let toasts: Toast[] = [];
let proximoId = 1;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((o) => o());

function remover(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
}

/** Mostra uma confirmação discreta. Pode ser chamado de qualquer componente cliente. */
export function toast(
  mensagem: string,
  opcoes: { tipo?: TipoToast; acao?: Toast["acao"]; duracao?: number } = {},
) {
  const id = proximoId++;
  toasts = [...toasts.slice(-3), { id, tipo: opcoes.tipo ?? "sucesso", mensagem, acao: opcoes.acao }];
  emitir();
  setTimeout(() => remover(id), opcoes.duracao ?? (opcoes.acao ? 6000 : opcoes.tipo === "erro" ? 5000 : 2600));
}

const vazio: Toast[] = [];

export function Toaster() {
  const lista = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    () => toasts,
    () => vazio,
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
    >
      {lista.map((t) => {
        const Icone = t.tipo === "erro" ? XCircle : t.tipo === "info" ? Info : CheckCircle2;
        return (
          <div
            key={t.id}
            role={t.tipo === "erro" ? "alert" : "status"}
            className="anima-entrar pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-marinho-900 px-4 py-3 text-sm text-white shadow-flutuante"
          >
            <Icone
              className={`size-5 shrink-0 ${t.tipo === "erro" ? "text-rose-400" : t.tipo === "info" ? "text-roxo-300" : "text-emerald-400"}`}
            />
            <span className="flex-1 leading-snug">{t.mensagem}</span>
            {t.acao && (
              <button
                type="button"
                onClick={() => {
                  t.acao?.aoClicar();
                  remover(t.id);
                }}
                className="rounded-lg px-2 py-1 font-semibold text-roxo-300 hover:bg-white/10"
              >
                {t.acao.rotulo}
              </button>
            )}
            <button type="button" aria-label="Fechar" onClick={() => remover(t.id)} className="rounded-md p-1 text-white/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
