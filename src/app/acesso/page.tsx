import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/navegacao";
import { temSessaoValida } from "@/lib/sessao";
import { FormularioAcesso } from "./formulario";

export const metadata: Metadata = { title: "Acesso" };

export default async function PaginaAcesso() {
  if (await temSessaoValida()) redirect("/");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-gradient-to-br from-marinho-800 via-marinho-900 to-marinho-950 px-4 py-10">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-roxo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[26rem] rounded-full bg-roxo-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center text-white">
          <Logo />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-flutuante sm:p-8">
          <h1 className="text-xl font-extrabold text-marinho-900">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Digite o código de acesso da casa. Ele é pedido só uma vez neste aparelho.
          </p>
          <FormularioAcesso />
        </div>
        <p className="mt-6 text-center text-xs text-white/60">Aplicativo privado. O acesso é registrado.</p>
      </div>
    </div>
  );
}
