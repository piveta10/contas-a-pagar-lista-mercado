"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Modal acessível: folha inferior no celular, janela central no computador. */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  largura = "max-w-md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  largura?: string;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(aoFechar);
  useEffect(() => {
    fecharRef.current = aoFechar;
  });

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fecharRef.current();
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const foco = painel.current?.querySelector<HTMLElement>("[data-autofoco], input, select, textarea, button:not([data-fechar])");
      foco?.focus();
    });
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      anterior?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="anima-aparecer absolute inset-0 bg-marinho-950/50 backdrop-blur-[2px]" onClick={aoFechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`anima-entrar relative max-h-[90dvh] w-full ${largura} overflow-y-auto rounded-t-3xl bg-white p-5 pb-seguro shadow-flutuante sm:rounded-3xl sm:p-6`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-marinho-100 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-titulo" className="text-lg font-bold text-marinho-900">
              {titulo}
            </h2>
            {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
          </div>
          <button
            type="button"
            data-fechar
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 rounded-full p-1.5 text-slate-400 hover:bg-marinho-50 hover:text-marinho-700"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
