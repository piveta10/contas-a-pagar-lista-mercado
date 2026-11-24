"use client";

import { digitosParaCentavos, formatarNumero } from "@/lib/dinheiro";

/** Campo de valor com máscara R$ 0,00 (digitação estilo caixa eletrônico). */
export function CampoValor({
  id,
  centavos,
  aoMudar,
  invalido,
  autoFoco,
}: {
  id: string;
  centavos: number;
  aoMudar: (centavos: number) => void;
  invalido?: boolean;
  autoFoco?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-slate-400">R$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFoco}
        value={formatarNumero(centavos)}
        onChange={(e) => aoMudar(digitosParaCentavos(e.target.value))}
        onFocus={(e) => requestAnimationFrame(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length))}
        aria-invalid={invalido}
        className="campo pl-11 text-right text-lg font-bold tabular-nums"
      />
    </div>
  );
}
