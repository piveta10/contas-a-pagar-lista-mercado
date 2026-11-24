"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { desfazerPagamento, excluirConta } from "@/actions/contas";
import type { CategoriaForm } from "@/components/cadastros/form-categoria";
import { Botao } from "@/components/ui/botao";
import { confirmar } from "@/components/ui/dialogos";
import { executar } from "@/components/ui/executar";
import { formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import type { ContaLinha } from "@/queries/contas";
import { BotaoPagar } from "./botao-pagar";
import { FormConta } from "./form-conta";

export function AcoesConta({
  conta,
  hoje,
  categorias,
  responsaveis,
}: {
  conta: ContaLinha;
  hoje: string;
  categorias: CategoriaForm[];
  responsaveis: { id: string; nome: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();

  async function desfazer() {
    const ok = await confirmar({
      titulo: "Desfazer pagamento?",
      mensagem: `"${conta.descricao}" voltará a ficar pendente. O pagamento de ${formatarData(conta.dataPagamento)} ficará registrado no histórico.`,
      rotuloConfirmar: "Desfazer pagamento",
    });
    if (!ok) return;
    setOcupado(true);
    const r = await executar(() => desfazerPagamento(conta.id));
    setOcupado(false);
    if (r.ok) router.refresh();
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir esta conta?",
      mensagem: `"${conta.descricao}" de ${formatarMoeda(conta.valorCentavos)} sairá das listas e relatórios. Um administrador pode restaurá-la em Configurações.`,
      rotuloConfirmar: "Excluir conta",
    });
    if (!ok) return;
    setOcupado(true);
    const r = await executar(() => excluirConta(conta.id));
    setOcupado(false);
    if (r.ok) router.push("/contas");
  }

  if (editando) {
    return (
      <div className="cartao mt-6 p-5 sm:p-8">
        <h2 className="mb-5 text-lg font-extrabold">Editar conta</h2>
        <FormConta
          categorias={categorias}
          responsaveis={responsaveis}
          hoje={hoje}
          conta={{
            id: conta.id,
            descricao: conta.descricao,
            categoriaId: conta.categoriaId,
            valorCentavos: conta.valorCentavos,
            vencimento: conta.vencimento,
            observacao: conta.observacao,
            responsavelNome: conta.responsavelNome,
          }}
          aoConcluir={() => setEditando(false)}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {conta.situacao === "paga" ? (
        <Botao variante="secundario" onClick={desfazer} carregando={ocupado}>
          <RotateCcw className="size-4" /> Desfazer pagamento
        </Botao>
      ) : (
        <BotaoPagar conta={conta} hoje={hoje} tamanho="md" rotulo="Marcar como paga" />
      )}
      <Botao variante="secundario" onClick={() => setEditando(true)}>
        <Pencil className="size-4" /> Editar
      </Botao>
      <Botao variante="fantasma" className="text-rose-600 hover:bg-rose-50" onClick={excluir} disabled={ocupado}>
        <Trash2 className="size-4" /> Excluir
      </Botao>
    </div>
  );
}
