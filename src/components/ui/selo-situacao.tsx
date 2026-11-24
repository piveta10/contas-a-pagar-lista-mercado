import { ROTULO_SITUACAO, type Situacao } from "@/lib/situacao";

const estilos: Record<Situacao, string> = {
  paga: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  vencida: "bg-rose-600 text-white ring-rose-600",
  vence_hoje: "bg-amber-50 text-amber-700 ring-amber-200",
  a_vencer: "bg-roxo-50 text-roxo-700 ring-roxo-100",
};

export function SeloSituacao({ situacao }: { situacao: Situacao }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${estilos[situacao]}`}>
      {ROTULO_SITUACAO[situacao]}
    </span>
  );
}

export const COR_VALOR: Record<Situacao, string> = {
  paga: "text-emerald-600",
  vencida: "text-rose-600",
  vence_hoje: "text-amber-600",
  a_vencer: "text-marinho-900",
};
