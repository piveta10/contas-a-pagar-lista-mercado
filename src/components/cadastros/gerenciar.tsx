"use client";

import { Check, DatabaseBackup, LogOut, Pencil, Plus, RotateCcw, ShieldCheck, ShieldOff, Trash2, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sair, sairModoAdmin } from "@/actions/acesso";
import { criarResponsavel, definirResponsavelAtual, removerCategoria, removerResponsavel, renomearResponsavel } from "@/actions/cadastros";
import { restaurarConta } from "@/actions/contas";
import { Botao } from "@/components/ui/botao";
import { confirmar, solicitarPinAdmin } from "@/components/ui/dialogos";
import { executar } from "@/components/ui/executar";
import { IconeCategoria } from "@/components/ui/icone-categoria";
import { toast } from "@/components/ui/toaster";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";
import { iniciais } from "../layout/seletor-responsavel";
import { ModalCategoria, type CategoriaForm } from "./form-categoria";

// ---------------------------------------------------------------------------
export function GerenciarResponsaveis({
  responsaveis,
  atualId,
}: {
  responsaveis: { id: string; nome: string }[];
  atualId: string | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setEnviando(true);
    const r = await executar(() => criarResponsavel(nome));
    setEnviando(false);
    if (r.ok) {
      setNome("");
      router.refresh();
    }
  }

  async function salvarNome(id: string) {
    const r = await executar(() => renomearResponsavel(id, novoNome));
    if (r.ok) {
      setEditando(null);
      router.refresh();
    }
  }

  async function remover(r: { id: string; nome: string }) {
    const ok = await confirmar({
      titulo: `Remover ${r.nome}?`,
      mensagem: "Ele deixará de aparecer para novos lançamentos. As contas já cadastradas continuam mostrando quem as lançou.",
      rotuloConfirmar: "Remover",
    });
    if (!ok) return;
    const res = await executar(() => removerResponsavel(r.id));
    if (res.ok) router.refresh();
  }

  async function usar(id: string) {
    const r = await executar(() => definirResponsavelAtual(id), { mensagemSucesso: "Responsável deste aparelho atualizado." });
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <form onSubmit={adicionar} className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do responsável"
          maxLength={80}
          className="campo"
          aria-label="Nome do novo responsável"
        />
        <Botao type="submit" carregando={enviando} disabled={!nome.trim()}>
          <Plus className="size-4" /> Adicionar
        </Botao>
      </form>
      <ul className="mt-4 divide-y divide-marinho-50">
        {responsaveis.length === 0 && <li className="py-4 text-sm text-slate-500">Nenhum responsável cadastrado.</li>}
        {responsaveis.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-roxo-100 text-sm font-bold text-roxo-700">{iniciais(r.nome)}</span>
            {editando === r.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  salvarNome(r.id);
                }}
              >
                <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} maxLength={80} className="campo h-10" aria-label="Novo nome" />
                <Botao type="submit" tamanho="sm" className="h-10" aria-label="Salvar nome">
                  <Check className="size-4" />
                </Botao>
                <Botao tamanho="sm" variante="fantasma" className="h-10" onClick={() => setEditando(null)} aria-label="Cancelar">
                  <X className="size-4" />
                </Botao>
              </form>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.nome}</p>
                  {r.id === atualId && <p className="text-xs font-semibold text-roxo-600">Usando neste aparelho</p>}
                </div>
                {r.id !== atualId && (
                  <Botao variante="fantasma" tamanho="sm" onClick={() => usar(r.id)} title="Usar neste aparelho">
                    <UserCheck className="size-4" /> <span className="hidden sm:inline">Usar aqui</span>
                  </Botao>
                )}
                <button
                  type="button"
                  aria-label={`Renomear ${r.nome}`}
                  onClick={() => {
                    setNovoNome(r.nome);
                    setEditando(r.id);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-roxo-50 hover:text-roxo-700"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${r.nome}`}
                  onClick={() => remover(r)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function GerenciarCategorias({ categorias }: { categorias: CategoriaForm[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ aberto: boolean; categoria: CategoriaForm | null }>({ aberto: false, categoria: null });

  async function remover(c: CategoriaForm) {
    const ok = await confirmar({
      titulo: `Remover a categoria ${c.nome}?`,
      mensagem: "Ela não aparecerá para novas contas. As contas já cadastradas continuam com essa categoria.",
      rotuloConfirmar: "Remover",
    });
    if (!ok) return;
    const r = await executar(() => removerCategoria(c.id));
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-marinho-100 px-3 py-2.5">
            <IconeCategoria icone={c.icone} cor={c.cor} tamanho="sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">{c.nome}</span>
            <button
              type="button"
              aria-label={`Editar ${c.nome}`}
              onClick={() => setModal({ aberto: true, categoria: c })}
              className="rounded-lg p-2 text-slate-400 hover:bg-roxo-50 hover:text-roxo-700"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Remover ${c.nome}`}
              onClick={() => remover(c)}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <Botao variante="secundario" className="mt-3" onClick={() => setModal({ aberto: true, categoria: null })}>
        <Plus className="size-4" /> Nova categoria
      </Botao>
      <ModalCategoria
        aberto={modal.aberto}
        categoria={modal.categoria}
        aoFechar={() => setModal({ aberto: false, categoria: null })}
        aoSalvar={() => router.refresh()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
export function PainelSeguranca({ admin }: { admin: boolean }) {
  const router = useRouter();

  async function ativar() {
    if (await solicitarPinAdmin()) {
      toast("Modo administrador ativo por 15 minutos.");
      router.refresh();
    }
  }

  async function desativar() {
    const r = await executar(() => sairModoAdmin());
    if (r.ok) router.refresh();
  }

  async function baixarBackup() {
    if (!admin && !(await solicitarPinAdmin())) return;
    const resp = await fetch("/api/backup", { cache: "no-store" });
    if (!resp.ok) {
      toast(resp.status === 403 ? "Ative o modo administrador para baixar o backup." : "Não foi possível gerar o backup.", { tipo: "erro" });
      return;
    }
    const blob = await resp.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = resp.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    toast("Backup baixado. Guarde em local seguro.");
    router.refresh();
  }

  async function sairDoAparelho() {
    const ok = await confirmar({
      titulo: "Sair deste aparelho?",
      mensagem: "Será preciso digitar o código de acesso novamente para usar o aplicativo aqui.",
      rotuloConfirmar: "Sair",
      perigo: false,
    });
    if (ok) await sair();
  }

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${admin ? "bg-emerald-50" : "bg-marinho-50/70"}`}>
        <div className="flex items-center gap-3">
          {admin ? <ShieldCheck className="size-6 text-emerald-600" /> : <ShieldOff className="size-6 text-slate-400" />}
          <div>
            <p className="font-semibold">Modo administrador {admin ? "ativo" : "desativado"}</p>
            <p className="text-sm text-slate-500">Necessário para excluir, editar cadastros, restaurar e fazer backup.</p>
          </div>
        </div>
        {admin ? (
          <Botao variante="secundario" tamanho="sm" onClick={desativar}>
            Encerrar
          </Botao>
        ) : (
          <Botao tamanho="sm" onClick={ativar}>
            Ativar com PIN
          </Botao>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao variante="secundario" onClick={baixarBackup}>
          <DatabaseBackup className="size-4" /> Baixar backup (JSON)
        </Botao>
        <Botao variante="fantasma" onClick={sairDoAparelho}>
          <LogOut className="size-4" /> Sair deste aparelho
        </Botao>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ContasExcluidas({
  contas,
}: {
  contas: { id: string; descricao: string; valorCentavos: number; vencimento: string; categoriaNome: string; excluidaEm: string | null; excluidaPor: string | null }[];
}) {
  const router = useRouter();
  if (!contas.length) return <p className="text-sm text-slate-500">Nenhuma conta excluída.</p>;

  async function restaurar(id: string) {
    const r = await executar(() => restaurarConta(id));
    if (r.ok) router.refresh();
  }

  return (
    <ul className="divide-y divide-marinho-50">
      {contas.map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {c.descricao} <span className="font-normal text-slate-500">· {formatarMoeda(c.valorCentavos)}</span>
            </p>
            <p className="text-xs text-slate-500">
              {c.categoriaNome} · venc. {formatarData(c.vencimento)} · excluída {c.excluidaEm ? formatarDataHora(c.excluidaEm) : ""}
              {c.excluidaPor ? ` por ${c.excluidaPor}` : ""}
            </p>
          </div>
          <Botao variante="secundario" tamanho="sm" onClick={() => restaurar(c.id)}>
            <RotateCcw className="size-4" /> Restaurar
          </Botao>
        </li>
      ))}
    </ul>
  );
}
