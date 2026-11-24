"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Botao } from "@/components/ui/botao";

export default function ErroPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cartao mx-auto mt-10 max-w-md p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold">Algo deu errado</h1>
      <p className="mt-1 text-sm text-slate-500">
        Não conseguimos carregar esta tela. Verifique a conexão e tente novamente.
        {error.digest && <span className="mt-2 block text-xs text-slate-400">Código: {error.digest}</span>}
      </p>
      <Botao className="mt-6" onClick={reset}>
        <RotateCcw className="size-4" /> Tentar novamente
      </Botao>
    </div>
  );
}
