"use client";

import { CalendarRange, ChevronLeft, ChevronRight, Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { limparLista } from "@/actions/compras";
import { BotaoPdf } from "@/components/pdf/botao-pdf";
import { Botao } from "@/components/ui/botao";
import { confirmar } from "@/components/ui/dialogos";
import { executar } from "@/components/ui/executar";
import { Modal } from "@/components/ui/modal";
import { formatarData, somarDias } from "@/lib/datas";

export function SeletorData({ data, hoje }: { data: string; hoje: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ir = (d: string) => iniciar(() => router.push(d === hoje ? "/compras" : `/compras?data=${d}`, { scroll: false }));

  return (
    <div className={`flex items-center gap-2 ${pendente ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => ir(somarDias(data, -1))}
        aria-label="Dia anterior"
        className="grid size-11 place-items-center rounded-xl border border-marinho-100 bg-white text-marinho-700 hover:bg-marinho-50"
      >
        <ChevronLeft className="size-5" />
      </button>
      <input
        type="date"
        value={data}
        onChange={(e) => e.target.value && ir(e.target.value)}
        aria-label="Data da lista"
        className="campo w-auto min-w-0 flex-1 text-center font-semibold sm:flex-none"
      />
      <button
        type="button"
        onClick={() => ir(somarDias(data, 1))}
        aria-label="Próximo dia"
        className="grid size-11 place-items-center rounded-xl border border-marinho-100 bg-white text-marinho-700 hover:bg-marinho-50"
      >
        <ChevronRight className="size-5" />
      </button>
      {data !== hoje && (
        <Botao variante="secundario" onClick={() => ir(hoje)}>
          Hoje
        </Botao>
      )}
    </div>
  );
}

export function AcoesLista({ data, hoje, temItens }: { data: string; hoje: string; temItens: boolean }) {
  const router = useRouter();
  const [periodoAberto, setPeriodoAberto] = useState(false);
  const [de, setDe] = useState(somarDias(hoje, -30));
  const [ate, setAte] = useState(hoje);
  const [limpando, setLimpando] = useState(false);

  async function limpar() {
    const ok = await confirmar({
      titulo: "Limpar lista atual?",
      mensagem: `A lista de ${formatarData(data)} será arquivada e uma nova lista vazia começará. Os itens continuam no histórico e nos PDFs — nada de outras datas é afetado.`,
      rotuloConfirmar: "Arquivar e limpar",
    });
    if (!ok) return;
    setLimpando(true);
    const r = await executar(() => limparLista(data));
    setLimpando(false);
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <BotaoPdf url={`/api/pdf/compras?de=${data}&ate=${data}`} nomeArquivo={`lista-compras-${data}.pdf`} rotulo="PDF do dia" variante="secundario" tamanho="sm" />
      <Botao variante="secundario" tamanho="sm" onClick={() => setPeriodoAberto(true)}>
        <CalendarRange className="size-4" /> PDF por período
      </Botao>
      <Botao variante="fantasma" tamanho="sm" className="text-rose-600 hover:bg-rose-50" onClick={limpar} carregando={limpando} disabled={!temItens}>
        <Eraser className="size-4" /> Limpar lista atual
      </Botao>

      <Modal aberto={periodoAberto} aoFechar={() => setPeriodoAberto(false)} titulo="PDF de um período" descricao="Inclui listas ativas e arquivadas de cada dia.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pdf-de" className="rotulo">
              De
            </label>
            <input id="pdf-de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} className="campo" />
          </div>
          <div>
            <label htmlFor="pdf-ate" className="rotulo">
              Até
            </label>
            <input id="pdf-ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className="campo" />
          </div>
        </div>
        <div className="mt-5">
          {de && ate && de <= ate ? (
            <BotaoPdf url={`/api/pdf/compras?de=${de}&ate=${ate}`} nomeArquivo={`listas-compras-${de}-a-${ate}.pdf`} className="w-full" />
          ) : (
            <p className="text-sm text-rose-600">Escolha um período válido.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
