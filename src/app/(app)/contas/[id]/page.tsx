import { ArrowLeft, CalendarDays, CheckCircle2, History, StickyNote, Tag, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesConta } from "@/components/contas/detalhe-conta";
import { IconeCategoria } from "@/components/ui/icone-categoria";
import { COR_VALOR, SeloSituacao } from "@/components/ui/selo-situacao";
import { categoriasAtivas, contextoUsuario, exigirSessao } from "@/lib/contexto";
import { formatarData, formatarDataHora, rotuloVencimento } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { historicoDaConta, obterConta } from "@/queries/contas";

export const metadata: Metadata = { title: "Detalhes da conta" };

const ROTULO_ACAO: Record<string, string> = {
  criada: "Conta cadastrada",
  editada: "Conta editada",
  excluida: "Conta excluída",
  restaurada: "Conta restaurada",
  paga: "Marcada como paga",
  pagamento_desfeito: "Pagamento desfeito",
};

const ROTULO_CAMPO: Record<string, string> = {
  descricao: "descrição",
  categoria: "categoria",
  valor: "valor",
  vencimento: "vencimento",
  observacao: "observação",
};

function detalhe(acao: string, dados: Record<string, unknown> | null): string | null {
  if (!dados) return null;
  if (acao === "paga") {
    return `Pago em ${formatarData(String(dados.dataPagamento))} · ${formatarMoeda(Number(dados.valorPago))}`;
  }
  if (acao === "pagamento_desfeito") return `Pagamento de ${formatarData(String(dados.dataPagamento))} removido`;
  if (acao === "editada") {
    return Object.entries(dados)
      .map(([campo, v]) => {
        const { de, para } = v as { de: unknown; para: unknown };
        const fmt = (x: unknown) =>
          campo === "valor" ? formatarMoeda(Number(x)) : campo === "vencimento" ? formatarData(String(x)) : campo === "categoria" ? "" : String(x ?? "—");
        return campo === "categoria" ? "categoria alterada" : `${ROTULO_CAMPO[campo] ?? campo}: ${fmt(de)} → ${fmt(para)}`;
      })
      .join(" · ");
  }
  return null;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaConta({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao();
  const { id } = await params;
  if (!RE_UUID.test(id)) notFound();

  const [{ hoje, responsaveis }, categorias] = await Promise.all([contextoUsuario(), categoriasAtivas()]);
  const [conta, historico] = await Promise.all([obterConta(id, hoje), historicoDaConta(id)]);
  if (!conta) notFound();

  const vencida = conta.situacao === "vencida";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/contas" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-roxo-700 hover:underline">
        <ArrowLeft className="size-4" /> Contas
      </Link>

      <section className={`cartao overflow-hidden ${vencida ? "ring-2 ring-rose-300" : ""}`}>
        <div className={`p-5 sm:p-8 ${vencida ? "bg-rose-50" : ""}`}>
          <div className="flex items-start gap-4">
            <IconeCategoria icone={conta.categoriaIcone} cor={vencida ? "#e11d48" : conta.categoriaCor} tamanho="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold">{conta.descricao}</h1>
                <SeloSituacao situacao={conta.situacao} />
              </div>
              <p className={`mt-1 text-sm ${vencida ? "font-semibold text-rose-700" : "text-slate-500"}`}>
                {conta.situacao === "paga" ? "Conta quitada" : rotuloVencimento(conta.vencimento, hoje)}
              </p>
            </div>
          </div>
          <p className={`mt-6 text-4xl font-extrabold tabular-nums ${COR_VALOR[conta.situacao]}`}>{formatarMoeda(conta.valorCentavos)}</p>
        </div>

        <dl className="grid gap-px bg-marinho-100/70 sm:grid-cols-2">
          <Info icone={CalendarDays} rotulo="Vencimento" valor={formatarData(conta.vencimento)} />
          <Info icone={Tag} rotulo="Categoria" valor={conta.categoriaNome} />
          <Info icone={UserRound} rotulo="Cadastrada por" valor={conta.responsavelNome} />
          <Info
            icone={CheckCircle2}
            rotulo="Pagamento"
            valor={
              conta.dataPagamento
                ? `${formatarData(conta.dataPagamento)} · ${formatarMoeda(conta.valorPagoCentavos ?? conta.valorCentavos)}${
                    conta.pagamentoRegistradoPor ? ` · por ${conta.pagamentoRegistradoPor}` : ""
                  }`
                : "Pendente"
            }
          />
          {conta.observacao && (
            <div className="bg-white p-4 sm:col-span-2 sm:px-8">
              <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <StickyNote className="size-3.5" /> Observação
              </dt>
              <dd className="mt-1 text-[15px] whitespace-pre-wrap">{conta.observacao}</dd>
            </div>
          )}
        </dl>
      </section>

      <AcoesConta conta={conta} hoje={hoje} categorias={categorias} responsaveis={responsaveis} />

      <section className="cartao mt-6 p-5 sm:p-8" aria-labelledby="titulo-historico">
        <h2 id="titulo-historico" className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <History className="size-5 text-roxo-600" /> Histórico de alterações
        </h2>
        {historico.length === 0 ? (
          <p className="text-sm text-slate-500">Sem registros.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-roxo-100 pl-5">
            {historico.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1 -left-[27px] size-3 rounded-full border-2 border-white bg-roxo-500" />
                <p className="font-semibold">{ROTULO_ACAO[h.acao] ?? h.acao}</p>
                {detalhe(h.acao, h.dados) && <p className="text-sm text-slate-600">{detalhe(h.acao, h.dados)}</p>}
                <p className="text-xs text-slate-400">
                  {formatarDataHora(h.criadoEm)}
                  {h.responsavelNome ? ` · ${h.responsavelNome}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ icone: Icone, rotulo, valor }: { icone: typeof CalendarDays; rotulo: string; valor: string }) {
  return (
    <div className="bg-white p-4 sm:px-8">
      <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        <Icone className="size-3.5" /> {rotulo}
      </dt>
      <dd className="mt-1 text-[15px] font-semibold">{valor}</dd>
    </div>
  );
}
