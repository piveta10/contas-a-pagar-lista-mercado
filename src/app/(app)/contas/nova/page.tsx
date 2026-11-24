import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/layout/cabecalho";
import { FormConta } from "@/components/contas/form-conta";
import { categoriasAtivas, contextoUsuario, exigirSessao } from "@/lib/contexto";

export const metadata: Metadata = { title: "Nova conta" };

export default async function PaginaNovaConta() {
  await exigirSessao();
  const [{ responsaveis, atual, hoje }, categorias] = await Promise.all([contextoUsuario(), categoriasAtivas()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/contas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-roxo-700 hover:underline">
        <ArrowLeft className="size-4" /> Contas
      </Link>
      <Cabecalho titulo="Nova conta" subtitulo="Preencha o essencial — leva menos de um minuto." />
      <div className="cartao p-5 sm:p-8">
        <FormConta categorias={categorias} responsaveis={responsaveis} responsavelAtualId={atual?.id} hoje={hoje} />
      </div>
    </div>
  );
}
