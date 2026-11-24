"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ativarModoAdmin } from "@/actions/acesso";
import { Botao } from "./botao";
import { Modal } from "./modal";

// ---------------------------------------------------------------------------
// Pequeno "store" global para diálogos de confirmação e de PIN
// ---------------------------------------------------------------------------
interface PedidoConfirmacao {
  tipo: "confirmar";
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  perigo: boolean;
  resolver: (ok: boolean) => void;
}
interface PedidoPin {
  tipo: "pin";
  resolver: (ok: boolean) => void;
}
type Pedido = PedidoConfirmacao | PedidoPin | null;

let atual: Pedido = null;
const ouvintes = new Set<() => void>();
const definir = (p: Pedido) => {
  atual = p;
  ouvintes.forEach((o) => o());
};

/** Pede confirmação antes de ações destrutivas. */
export function confirmar(opcoes: { titulo: string; mensagem: string; rotuloConfirmar?: string; perigo?: boolean }): Promise<boolean> {
  return new Promise((resolver) =>
    definir({
      tipo: "confirmar",
      titulo: opcoes.titulo,
      mensagem: opcoes.mensagem,
      rotuloConfirmar: opcoes.rotuloConfirmar ?? "Confirmar",
      perigo: opcoes.perigo ?? true,
      resolver,
    }),
  );
}

/** Pede o PIN de administrador. Resolve true quando o modo admin foi ativado. */
export function solicitarPinAdmin(): Promise<boolean> {
  return new Promise((resolver) => definir({ tipo: "pin", resolver }));
}

export function DialogosGlobais() {
  const pedido = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    () => atual,
    () => null,
  );

  const fechar = useCallback((ok: boolean) => {
    if (atual) atual.resolver(ok);
    definir(null);
  }, []);
  const cancelar = useCallback(() => fechar(false), [fechar]);

  if (!pedido) return null;
  if (pedido.tipo === "pin") return <DialogoPin aoConcluir={fechar} aoCancelar={cancelar} />;

  return (
    <Modal aberto titulo={pedido.titulo} aoFechar={cancelar}>
      <div className="flex gap-3">
        {pedido.perigo && (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="size-5" />
          </div>
        )}
        <p className="pt-1 text-[15px] leading-relaxed text-slate-600">{pedido.mensagem}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={cancelar}>
          Cancelar
        </Botao>
        <Botao data-autofoco variante={pedido.perigo ? "perigo" : "primario"} onClick={() => fechar(true)}>
          {pedido.rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}

function DialogoPin({ aoConcluir, aoCancelar }: { aoConcluir: (ok: boolean) => void; aoCancelar: () => void }) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const r = await ativarModoAdmin(pin);
    setEnviando(false);
    if (r.ok) aoConcluir(true);
    else {
      setErro(r.mensagem);
      setPin("");
    }
  }

  return (
    <Modal aberto titulo="PIN de administrador" descricao="Esta ação é protegida. Digite o PIN para continuar." aoFechar={aoCancelar} largura="max-w-sm">
      <form onSubmit={enviar}>
        <div className="mb-4 flex justify-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-roxo-50 text-roxo-600">
            <ShieldCheck className="size-7" />
          </div>
        </div>
        <input
          data-autofoco
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="campo text-center text-2xl tracking-[0.5em]"
          aria-label="PIN"
          aria-invalid={!!erro}
        />
        {erro && <p className="mt-2 text-center text-sm font-medium text-rose-600">{erro}</p>}
        <p className="mt-3 text-center text-xs text-slate-500">O modo administrador fica ativo por 15 minutos neste aparelho.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Botao variante="fantasma" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={enviando} disabled={pin.length < 6}>
            Confirmar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
