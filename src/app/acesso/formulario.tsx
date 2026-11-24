"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useActionState, useState } from "react";
import { entrar, type EstadoAcesso } from "@/actions/acesso";
import { Botao } from "@/components/ui/botao";

export function FormularioAcesso() {
  const [estado, acao, enviando] = useActionState<EstadoAcesso, FormData>(entrar, {});
  const [visivel, setVisivel] = useState(false);

  return (
    <form action={acao} className="mt-6 space-y-4">
      <div>
        <label htmlFor="codigo" className="rotulo">
          Código de acesso
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            id="codigo"
            name="codigo"
            type={visivel ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            maxLength={200}
            className="campo pr-11 pl-10"
            aria-invalid={!!estado.erro}
            aria-describedby={estado.erro ? "erro-acesso" : undefined}
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Ocultar código" : "Mostrar código"}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-marinho-700"
          >
            {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {estado.erro && (
          <p id="erro-acesso" role="alert" className="mt-2 text-sm font-medium text-rose-600">
            {estado.erro}
          </p>
        )}
      </div>
      <Botao type="submit" carregando={enviando} className="w-full" tamanho="lg">
        Entrar
      </Botao>
    </form>
  );
}
