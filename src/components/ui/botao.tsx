import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "marinho" | "sucesso";
type Tamanho = "sm" | "md" | "lg";

const variantes: Record<Variante, string> = {
  primario: "bg-roxo-600 text-white shadow-roxo hover:bg-roxo-700 active:bg-roxo-800",
  secundario: "bg-roxo-50 text-roxo-700 hover:bg-roxo-100 border border-roxo-100",
  fantasma: "text-marinho-700 hover:bg-marinho-50",
  perigo: "bg-rose-600 text-white hover:bg-rose-700",
  marinho: "bg-gradient-to-r from-marinho-900 to-marinho-700 text-white hover:from-marinho-800 hover:to-marinho-600 shadow-cartao",
  sucesso: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-2xl",
};

export function classesBotao(variante: Variante = "primario", tamanho: Tamanho = "md", extra = "") {
  return `inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 select-none ${variantes[variante]} ${tamanhos[tamanho]} ${extra}`;
}

export function Botao({
  variante = "primario",
  tamanho = "md",
  carregando = false,
  className = "",
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho; carregando?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classesBotao(variante, tamanho, className)}
    >
      {carregando && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "primario",
  tamanho = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link {...props} className={classesBotao(variante, tamanho, className)} />;
}
