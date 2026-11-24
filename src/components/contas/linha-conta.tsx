import { ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import { IconeCategoria } from "@/components/ui/icone-categoria";
import { COR_VALOR, SeloSituacao } from "@/components/ui/selo-situacao";
import { formatarData, rotuloVencimento } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import type { ContaLinha } from "@/queries/contas";
import { BotaoPagar } from "./botao-pagar";

/** Uma conta em lista: vencidas ficam destacadas em vermelho. */
export function LinhaConta({ conta, hoje, mostrarPagar = true }: { conta: ContaLinha; hoje: string; mostrarPagar?: boolean }) {
  const vencida = conta.situacao === "vencida";
  const paga = conta.situacao === "paga";

  return (
    <div
      data-testid="linha-conta"
      data-situacao={conta.situacao}
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition sm:px-4 ${
        vencida ? "bg-rose-50 ring-1 ring-rose-200" : "hover:bg-marinho-50/60"
      }`}
    >
      <IconeCategoria icone={conta.categoriaIcone} cor={vencida ? "#e11d48" : conta.categoriaCor} />
      <Link href={`/contas/${conta.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-bold text-marinho-900">{conta.descricao}</span>
          <SeloSituacao situacao={conta.situacao} />
        </div>
        <p className={`mt-0.5 truncate text-[13px] ${vencida ? "font-medium text-rose-700" : "text-slate-500"}`}>
          {paga
            ? `Paga em ${formatarData(conta.dataPagamento)}`
            : `${rotuloVencimento(conta.vencimento, hoje)} · ${formatarData(conta.vencimento)}`}
          <span className="hidden sm:inline">
            {" · "}
            {conta.categoriaNome}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <UserRound className="size-3" /> {conta.responsavelNome}
        </p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className={`text-base font-extrabold tabular-nums sm:text-lg ${COR_VALOR[conta.situacao]}`}>
          {formatarMoeda(paga && conta.valorPagoCentavos ? conta.valorPagoCentavos : conta.valorCentavos)}
        </span>
        {mostrarPagar && !paga ? (
          <BotaoPagar conta={conta} hoje={hoje} />
        ) : (
          <Link href={`/contas/${conta.id}`} aria-label="Ver detalhes" className="hidden rounded-lg p-1 text-slate-400 hover:text-roxo-600 sm:block">
            <ChevronRight className="size-5" />
          </Link>
        )}
      </div>
    </div>
  );
}
