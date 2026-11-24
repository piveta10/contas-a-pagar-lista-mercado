import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraLateral, Logo, NavegacaoInferior } from "@/components/layout/navegacao";
import { SeletorResponsavel } from "@/components/layout/seletor-responsavel";
import { contextoUsuario } from "@/lib/contexto";
import { temSessaoValida } from "@/lib/sessao";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  // Verificação no servidor (além do proxy).
  if (!(await temSessaoValida())) redirect("/acesso");
  const { responsaveis, atual } = await contextoUsuario();

  return (
    <div className="min-h-dvh overflow-x-clip lg:pl-64">
      <BarraLateral />

      {/* Barra superior (celular/tablet) */}
      <div className="sticky top-0 z-30 border-b border-marinho-100/70 bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 text-marinho-900">
          <Link href="/" aria-label="Início">
            <Logo />
          </Link>
          <SeletorResponsavel responsaveis={responsaveis} atual={atual} />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
      <NavegacaoInferior />
    </div>
  );
}
