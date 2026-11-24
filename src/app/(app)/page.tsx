import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Cabecalho } from "@/components/layout/cabecalho";
import { ListaRapida } from "@/components/compras/lista-rapida";
import { LinhaConta } from "@/components/contas/linha-conta";
import { GraficoMensal } from "@/components/graficos/graficos";
import { BotaoPdf } from "@/components/pdf/botao-pdf";
import { BotaoLink } from "@/components/ui/botao";
import { contextoUsuario, exigirSessao } from "@/lib/contexto";
import { fimDoMes, inicioDoMes, mesDe, nomeMesLongo } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { listasDaData, produtosFrequentes } from "@/queries/compras";
import { dadosDashboard } from "@/queries/dashboard";

export default async function PaginaInicial() {
  await exigirSessao();
  const { atual, hoje, responsaveis } = await contextoUsuario();
  const mes = mesDe(hoje);
  const [dados, compras, frequentes] = await Promise.all([dadosDashboard(mes, hoje), listasDaData(hoje), produtosFrequentes(6)]);
  const saudacao = atual ? `Olá, ${atual.nome.split(" ")[0]}!` : "Olá!";
  const pdfMes = `/api/pdf/relatorio?de=${inicioDoMes(mes)}&ate=${fimDoMes(mes)}`;

  return (
    <>
      <Cabecalho titulo={saudacao} subtitulo="Aqui está o resumo das suas contas e compras." />

      {responsaveis.length === 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-cartao border border-roxo-200 bg-roxo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-roxo-600" />
            <div>
              <p className="font-bold text-marinho-900">Primeiro passo: cadastre quem usa o aplicativo</p>
              <p className="text-sm text-slate-600">Cada conta registra quem fez o lançamento. Basta o nome.</p>
            </div>
          </div>
          <BotaoLink href="/configuracoes#responsaveis" tamanho="sm">
            Cadastrar responsáveis
          </BotaoLink>
        </div>
      )}

      {/* Cartões de resumo */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <CartaoResumo
          estilo="escuro"
          icone={Wallet}
          rotulo="Total de Contas"
          valor={dados.totalMes.soma}
          detalhe={`${dados.totalMes.quantidade} ${dados.totalMes.quantidade === 1 ? "conta" : "contas"} em ${nomeMesLongo(mes).split(" ")[0]}`}
          href={`/contas?de=${inicioDoMes(mes)}&ate=${fimDoMes(mes)}`}
        />
        <CartaoResumo
          estilo="verde"
          icone={CheckCircle2}
          rotulo="Pagas no Mês"
          valor={dados.pagasMes.soma}
          detalhe={`${dados.pagasMes.quantidade} ${dados.pagasMes.quantidade === 1 ? "pagamento" : "pagamentos"}`}
          href="/contas?situacao=pagas"
        />
        <CartaoResumo
          estilo="roxo"
          icone={CalendarClock}
          rotulo="A Vencer"
          valor={dados.aVencer.soma}
          detalhe={`${dados.aVencer.quantidade} ${dados.aVencer.quantidade === 1 ? "pendente" : "pendentes"}`}
          href="/contas?situacao=a_vencer"
        />
        <CartaoResumo
          estilo="vermelho"
          icone={AlertCircle}
          rotulo="Vencidas"
          valor={dados.vencidas.soma}
          detalhe={dados.vencidas.quantidade ? `${dados.vencidas.quantidade} precisam de atenção` : "Nenhuma vencida"}
          href="/contas?situacao=vencidas"
          alerta={dados.vencidas.quantidade > 0}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Contas que precisam de atenção */}
        <section className="cartao p-4 sm:p-6 lg:col-span-7" aria-labelledby="titulo-vencer">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="titulo-vencer" className="flex items-center gap-2 text-lg font-extrabold">
              <AlertCircle className={`size-5 ${dados.vencidas.quantidade ? "text-rose-600" : "text-roxo-600"}`} />
              Contas a Vencer
            </h2>
            <Link href="/contas?situacao=pendentes" className="flex items-center text-sm font-semibold text-roxo-700 hover:underline">
              Ver todas <ChevronRight className="size-4" />
            </Link>
          </div>
          {dados.atencao.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-marinho-100 px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto size-9 text-emerald-500" />
              <p className="mt-2 font-semibold">Tudo em dia!</p>
              <p className="text-sm text-slate-500">Nenhuma conta pendente no momento.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {dados.atencao.map((c) => (
                <LinhaConta key={c.id} conta={c} hoje={hoje} />
              ))}
            </div>
          )}
          <BotaoLink href="/contas/nova" className="mt-4 w-full sm:w-auto">
            <Plus className="size-5" /> Nova Conta
          </BotaoLink>
        </section>

        {/* Lista de compras (registro rápido) */}
        <section
          className="rounded-cartao border border-roxo-100 bg-gradient-to-br from-roxo-50 via-white to-roxo-50 p-4 shadow-cartao sm:p-6 lg:col-span-5"
          aria-labelledby="titulo-compras"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-roxo-600 text-white shadow-roxo">
              <ShoppingCart className="size-6" />
            </span>
            <div>
              <h2 id="titulo-compras" className="text-lg font-extrabold">
                Lista de Compras
              </h2>
              <p className="text-sm text-slate-500">Registre o que precisa comprar assim que lembrar.</p>
            </div>
          </div>
          <ListaRapida data={hoje} hoje={hoje} itensIniciais={compras.ativa?.itens ?? []} sugestoesFrequentes={frequentes} modo="resumo" />
        </section>

        {/* Resumo mensal */}
        <section className="cartao p-4 sm:p-6 lg:col-span-7" aria-labelledby="titulo-resumo">
          <h2 id="titulo-resumo" className="text-lg font-extrabold">
            Resumo do Mês
          </h2>
          <p className="text-sm text-slate-500">Contas por mês de vencimento</p>
          <div className="mt-4 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <GraficoMensal dados={dados.resumoMeses} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-5 sm:border-l sm:border-marinho-100 sm:pl-6">
              <Legenda cor="bg-roxo-600" rotulo="Pagas" valor={dados.resumoMeses.at(-1)?.pagas ?? 0} />
              <Legenda cor="bg-roxo-300" rotulo="A pagar" valor={dados.resumoMeses.at(-1)?.aPagar ?? 0} />
            </div>
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="cartao p-4 sm:p-6 lg:col-span-5" aria-labelledby="titulo-acoes">
          <h2 id="titulo-acoes" className="mb-4 text-lg font-extrabold">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <AcaoRapida href="/contas/nova" icone={Plus} rotulo="Nova Conta" />
            <AcaoRapida href="/compras" icone={ShoppingCart} rotulo="Lista de Compras" />
            <AcaoRapida href="/relatorios" icone={BarChart3} rotulo="Relatórios" />
            <AcaoRapida href="/configuracoes" icone={Settings} rotulo="Ajustes" />
          </div>
          <BotaoPdf
            url={pdfMes}
            nomeArquivo={`relatorio-contas-${mes}.pdf`}
            rotulo="Gerar Relatório PDF do mês"
            variante="marinho"
            tamanho="lg"
            className="mt-4 w-full"
          />
        </section>
      </div>
    </>
  );
}

const ESTILOS = {
  escuro: { caixa: "bg-gradient-to-br from-marinho-800 to-marinho-950 text-white border-transparent", icone: "bg-roxo-600 text-white", rotulo: "text-white/70", detalhe: "text-white/60" },
  verde: { caixa: "bg-emerald-50 border-emerald-100", icone: "bg-emerald-500 text-white", rotulo: "text-emerald-800/80", detalhe: "text-emerald-700/70" },
  roxo: { caixa: "bg-roxo-50 border-roxo-100", icone: "bg-roxo-600 text-white", rotulo: "text-roxo-900/70", detalhe: "text-roxo-800/60" },
  vermelho: { caixa: "bg-rose-50 border-rose-100", icone: "bg-rose-600 text-white", rotulo: "text-rose-900/70", detalhe: "text-rose-700/80" },
} as const;

function CartaoResumo({
  estilo,
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  href,
  alerta = false,
}: {
  estilo: keyof typeof ESTILOS;
  icone: LucideIcon;
  rotulo: string;
  valor: number;
  detalhe: string;
  href: string;
  alerta?: boolean;
}) {
  const e = ESTILOS[estilo];
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-3 rounded-cartao border p-4 shadow-cartao transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-5 ${e.caixa} ${alerta ? "ring-2 ring-rose-400" : ""}`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-full sm:size-12 ${e.icone}`}>
        <Icone className="size-5 sm:size-6" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] font-semibold ${e.rotulo}`}>{rotulo}</span>
        <span className="block truncate text-lg font-extrabold tabular-nums sm:text-[22px]" data-testid={`resumo-${estilo}`}>
          {formatarMoeda(valor)}
        </span>
        <span className={`block truncate text-xs ${e.detalhe}`}>{detalhe}</span>
      </span>
    </Link>
  );
}

function Legenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <span className={`size-2.5 rounded-full ${cor}`} /> {rotulo}
      </p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums">{formatarMoeda(valor)}</p>
    </div>
  );
}

function AcaoRapida({ href, icone: Icone, rotulo }: { href: string; icone: LucideIcon; rotulo: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-marinho-100 bg-white px-1 py-3 text-center text-[11px] leading-tight font-semibold text-marinho-800 transition hover:border-roxo-300 hover:bg-roxo-50 sm:text-xs"
    >
      <span className="grid size-10 place-items-center rounded-full bg-roxo-50 text-roxo-600">
        <Icone className="size-5" />
      </span>
      {rotulo}
    </Link>
  );
}
