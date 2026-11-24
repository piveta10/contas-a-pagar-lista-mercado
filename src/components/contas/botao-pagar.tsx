"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { marcarComoPaga } from "@/actions/contas";
import { Botao } from "@/components/ui/botao";
import { CampoValor } from "@/components/ui/campo-valor";
import { executar } from "@/components/ui/executar";
import { Modal } from "@/components/ui/modal";
import { formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";

export function BotaoPagar({
  conta,
  hoje,
  tamanho = "sm",
  rotulo = "Pagar",
}: {
  conta: { id: string; descricao: string; valorCentavos: number; vencimento: string };
  hoje: string;
  tamanho?: "sm" | "md";
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hoje);
  const [valor, setValor] = useState(conta.valorCentavos);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await executar(() => marcarComoPaga({ contaId: conta.id, dataPagamento: data, valorPago: valor / 100 }));
    setEnviando(false);
    if (r.ok) {
      setAberto(false);
      router.refresh();
    }
  }

  return (
    <>
      <Botao
        variante="secundario"
        tamanho={tamanho}
        onClick={() => {
          setData(hoje);
          setValor(conta.valorCentavos);
          setAberto(true);
        }}
        aria-label={`Marcar ${conta.descricao} como paga`}
      >
        <CheckCircle2 className="size-4" />
        {rotulo}
      </Botao>
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Marcar como paga"
        descricao={`${conta.descricao} · ${formatarMoeda(conta.valorCentavos)} · vence ${formatarData(conta.vencimento)}`}
      >
        <form onSubmit={confirmar} className="space-y-4">
          <div>
            <label htmlFor={`data-pg-${conta.id}`} className="rotulo">
              Data do pagamento
            </label>
            <input
              id={`data-pg-${conta.id}`}
              type="date"
              value={data}
              max={hoje}
              required
              onChange={(e) => setData(e.target.value)}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor={`valor-pg-${conta.id}`} className="rotulo">
              Valor pago
            </label>
            <CampoValor id={`valor-pg-${conta.id}`} centavos={valor} aoMudar={setValor} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Botao variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="sucesso" carregando={enviando} disabled={!data || valor <= 0}>
              Confirmar
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
