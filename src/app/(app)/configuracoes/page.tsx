import { Archive, Shapes, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { Cabecalho } from "@/components/layout/cabecalho";
import { ContasExcluidas, GerenciarCategorias, GerenciarResponsaveis, PainelSeguranca } from "@/components/cadastros/gerenciar";
import { categoriasAtivas, contextoUsuario, exigirSessao } from "@/lib/contexto";
import { listarContasExcluidas } from "@/queries/contas";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  await exigirSessao();
  const [{ responsaveis, atual, admin }, categorias, excluidas] = await Promise.all([
    contextoUsuario(),
    categoriasAtivas(),
    listarContasExcluidas(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho titulo="Configurações" subtitulo="Responsáveis, categorias, segurança e backup." />

      <div className="space-y-6">
        <Secao id="responsaveis" icone={<Users className="size-5" />} titulo="Responsáveis" descricao="Quem faz os lançamentos. Não há senha individual: basta escolher o nome.">
          <GerenciarResponsaveis responsaveis={responsaveis} atualId={atual?.id ?? null} />
        </Secao>

        <Secao id="categorias" icone={<Shapes className="size-5" />} titulo="Categorias" descricao="Organize as contas da casa.">
          <GerenciarCategorias categorias={categorias} />
        </Secao>

        <Secao id="seguranca" icone={<Shield className="size-5" />} titulo="Segurança e backup" descricao="Este aparelho está liberado pelo código de acesso da casa.">
          <PainelSeguranca admin={admin} />
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            O banco Neon mantém restauração para um ponto no tempo (o período depende do plano). Além disso, o backup em JSON e o
            backup automático semanal do GitHub (veja o README) permitem recuperar os dados em outro banco.
          </p>
        </Secao>

        <Secao id="excluidas" icone={<Archive className="size-5" />} titulo="Contas excluídas" descricao="Contas excluídas podem ser restauradas por um administrador.">
          <ContasExcluidas contas={excluidas} />
        </Secao>
      </div>
    </div>
  );
}

function Secao({
  id,
  icone,
  titulo,
  descricao,
  children,
}: {
  id: string;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="cartao scroll-mt-24 p-5 sm:p-7" aria-labelledby={`titulo-${id}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-roxo-50 text-roxo-600">{icone}</span>
        <div>
          <h2 id={`titulo-${id}`} className="text-lg font-extrabold">
            {titulo}
          </h2>
          <p className="text-sm text-slate-500">{descricao}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
