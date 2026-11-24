"use client";

import { Check, ChevronRight, Loader2, Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { adicionarItem, editarItem, excluirItem, marcarItem, restaurarItem } from "@/actions/compras";
import { executar } from "@/components/ui/executar";
import { toast } from "@/components/ui/toaster";
import { formatarData } from "@/lib/datas";
import type { ItemCompra } from "@/queries/compras";

export const SUGESTOES_PADRAO = [
  "Arroz",
  "Feijão",
  "Leite",
  "Pão",
  "Café",
  "Açúcar",
  "Óleo",
  "Carne",
  "Ovos",
  "Frutas",
  "Legumes",
  "Papel higiênico",
  "Sabão em pó",
  "Detergente",
];

type ItemTela = ItemCompra & { pendente?: boolean };

function idTemporario() {
  return `tmp-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

export function ListaRapida({
  data,
  hoje,
  itensIniciais,
  sugestoesFrequentes = [],
  modo = "completo",
}: {
  data: string;
  hoje: string;
  itensIniciais: ItemCompra[];
  sugestoesFrequentes?: string[];
  modo?: "completo" | "resumo";
}) {
  const [itens, setItens] = useState<ItemTela[]>(itensIniciais);
  const [texto, setTexto] = useState("");
  const [recentes, setRecentes] = useState<Set<string>>(new Set());
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // Dados novos do servidor (após revalidação) substituem os locais, mantendo os itens ainda em envio.
  useEffect(() => {
    setItens((atuais) => [...itensIniciais, ...atuais.filter((i) => i.pendente)]);
  }, [itensIniciais]);

  const pendentes = useMemo(
    () => itens.filter((i) => !i.comprado).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [itens],
  );
  const comprados = useMemo(() => itens.filter((i) => i.comprado), [itens]);

  const sugestoes = useMemo(() => {
    const naLista = new Set(pendentes.map((i) => i.descricao.toLowerCase()));
    const vistas = new Set<string>();
    return [...sugestoesFrequentes, ...SUGESTOES_PADRAO].filter((s) => {
      const k = s.toLowerCase();
      if (naLista.has(k) || vistas.has(k)) return false;
      vistas.add(k);
      return true;
    });
  }, [pendentes, sugestoesFrequentes]);

  function destacar(id: string) {
    setRecentes((s) => new Set(s).add(id));
    setTimeout(() => setRecentes((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    }), 1300);
  }

  async function adicionar(bruto: string) {
    const descricao = bruto.replace(/\s+/g, " ").trim();
    if (!descricao) return;
    if (descricao.length > 120) {
      toast("Use no máximo 120 caracteres.", { tipo: "erro" });
      return;
    }
    const temp: ItemTela = {
      id: idTemporario(),
      descricao,
      comprado: false,
      adicionadoPorNome: null,
      criadoEm: new Date().toISOString(),
      pendente: true,
    };
    setItens((l) => [...l, temp]);
    setTexto("");
    campo.current?.focus();

    const r = await executar(() => adicionarItem({ data, descricao }), { silencioso: true });
    if (!r.ok) {
      setItens((l) => l.filter((i) => i.id !== temp.id));
      return;
    }
    const { item, duplicado } = r.dados;
    setItens((l) => {
      const sem = l.filter((i) => i.id !== temp.id && i.id !== item.id);
      return [...sem, item];
    });
    destacar(item.id);
    toast(duplicado ? `${item.descricao} já estava na lista` : `${item.descricao} adicionado`, {
      tipo: duplicado ? "info" : "sucesso",
      duracao: 1800,
    });
  }

  async function alternar(item: ItemTela) {
    if (item.pendente) return;
    const novo = !item.comprado;
    setItens((l) => l.map((i) => (i.id === item.id ? { ...i, comprado: novo } : i)));
    const r = await executar(() => marcarItem(item.id, novo), { silencioso: true });
    if (!r.ok) setItens((l) => l.map((i) => (i.id === item.id ? { ...i, comprado: !novo } : i)));
  }

  async function renomear(item: ItemTela, descricao: string) {
    const limpa = descricao.replace(/\s+/g, " ").trim();
    if (!limpa || limpa === item.descricao) return;
    setItens((l) => l.map((i) => (i.id === item.id ? { ...i, descricao: limpa } : i)));
    const r = await executar(() => editarItem(item.id, limpa), { silencioso: true });
    if (!r.ok) setItens((l) => l.map((i) => (i.id === item.id ? { ...i, descricao: item.descricao } : i)));
  }

  async function remover(item: ItemTela) {
    if (item.pendente) return;
    setItens((l) => l.filter((i) => i.id !== item.id));
    const r = await executar(() => excluirItem(item.id), { silencioso: true });
    if (!r.ok) {
      setItens((l) => [...l, item]);
      return;
    }
    toast(`${item.descricao} removido`, {
      tipo: "info",
      acao: {
        rotulo: "Desfazer",
        aoClicar: async () => {
          const d = await executar(
            () =>
              restaurarItem({
                id: item.id,
                data: r.dados.data,
                descricao: item.descricao,
                comprado: item.comprado,
                adicionadoPorNome: item.adicionadoPorNome,
              }),
            { silencioso: true },
          );
          if (d.ok) setItens((l) => [...l.filter((i) => i.id !== item.id), d.dados.item]);
        },
      },
    });
  }

  const resumo = modo === "resumo";
  const chipsVisiveis = mostrarTodas ? sugestoes : sugestoes.slice(0, resumo ? 5 : 8);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          adicionar(texto);
        }}
        className="flex overflow-hidden rounded-2xl border border-roxo-200 bg-white shadow-cartao focus-within:border-roxo-400 focus-within:ring-4 focus-within:ring-roxo-100"
      >
        <label htmlFor={`produto-${modo}`} className="sr-only">
          Produto para comprar
        </label>
        <input
          ref={campo}
          id={`produto-${modo}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite um produto para comprar..."
          autoComplete="off"
          enterKeyHint="done"
          maxLength={120}
          className="h-13 min-w-0 flex-1 bg-transparent px-4 text-base text-marinho-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          aria-label="Adicionar produto"
          className="grid w-14 shrink-0 place-items-center bg-roxo-600 text-white transition hover:bg-roxo-700 active:bg-roxo-800"
        >
          <Plus className="size-6" strokeWidth={2.6} />
        </button>
      </form>

      {/* Sugestões rápidas */}
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
        {chipsVisiveis.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => adicionar(s)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-marinho-100 bg-white px-3.5 py-1.5 text-sm font-medium text-marinho-700 shadow-sm transition hover:border-roxo-300 hover:bg-roxo-50 hover:text-roxo-700 active:scale-95"
          >
            <Plus className="size-3.5 text-roxo-500" />
            {s}
          </button>
        ))}
        {sugestoes.length > chipsVisiveis.length && (
          <button
            type="button"
            onClick={() => setMostrarTodas(true)}
            className="shrink-0 rounded-full bg-roxo-50 px-3.5 py-1.5 text-sm font-semibold text-roxo-700 hover:bg-roxo-100"
          >
            Mais +
          </button>
        )}
      </div>

      {resumo ? (
        <div className="mt-4 space-y-1.5">
          {pendentes.slice(0, 4).map((item) => (
            <LinhaItem key={item.id} item={item} destaque={recentes.has(item.id)} aoAlternar={alternar} compacta />
          ))}
          <Link
            href={`/compras${data === hoje ? "" : `?data=${data}`}`}
            className="mt-3 flex items-center justify-between rounded-2xl bg-roxo-50 px-4 py-3 text-sm font-semibold text-marinho-800 transition hover:bg-roxo-100"
          >
            <span className="flex items-center gap-2">
              <ShoppingBasket className="size-4 text-roxo-600" />
              Compra de hoje: {formatarData(data)}
              <span className="font-normal text-slate-500">
                · {pendentes.length} {pendentes.length === 1 ? "pendente" : "pendentes"}
              </span>
            </span>
            <span className="flex items-center text-roxo-700">
              Ver lista <ChevronRight className="size-4" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-marinho-800">
              Para comprar <span className="text-slate-400">({pendentes.length})</span>
            </span>
            {itens.length > 0 && (
              <span className="text-slate-500">
                {comprados.length} de {itens.length} comprados
              </span>
            )}
          </div>
          {itens.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-marinho-100 px-6 py-10 text-center">
              <ShoppingBasket className="mx-auto size-9 text-roxo-300" />
              <p className="mt-2 font-semibold text-marinho-800">Lista vazia</p>
              <p className="text-sm text-slate-500">Digite um produto acima ou toque numa sugestão.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {pendentes.map((item) => (
                <LinhaItem key={item.id} item={item} destaque={recentes.has(item.id)} aoAlternar={alternar} aoRenomear={renomear} aoRemover={remover} />
              ))}
              {comprados.length > 0 && (
                <li className="pt-4 pb-1 text-xs font-bold tracking-wide text-slate-400 uppercase">Comprados</li>
              )}
              {comprados.map((item) => (
                <LinhaItem key={item.id} item={item} destaque={false} aoAlternar={alternar} aoRenomear={renomear} aoRemover={remover} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaItem({
  item,
  destaque,
  aoAlternar,
  aoRenomear,
  aoRemover,
  compacta = false,
}: {
  item: ItemTela;
  destaque: boolean;
  aoAlternar: (i: ItemTela) => void;
  aoRenomear?: (i: ItemTela, descricao: string) => void;
  aoRemover?: (i: ItemTela) => void;
  compacta?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.descricao);

  function concluir(salvar: boolean) {
    setEditando(false);
    if (salvar) aoRenomear?.(item, valor);
    else setValor(item.descricao);
  }

  const Tag = compacta ? "div" : "li";
  return (
    <Tag
      data-testid="item-compra"
      className={`group flex items-center gap-3 rounded-2xl border px-3 ${compacta ? "py-2" : "py-2.5"} transition ${
        item.comprado ? "border-transparent bg-marinho-50/60" : "border-marinho-100/80 bg-white"
      } ${destaque ? "anima-destaque" : ""}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.comprado}
        aria-label={item.comprado ? `Desmarcar ${item.descricao}` : `Marcar ${item.descricao} como comprado`}
        onClick={() => aoAlternar(item)}
        disabled={item.pendente}
        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${
          item.comprado ? "border-emerald-500 bg-emerald-500 text-white" : "border-marinho-200 text-transparent hover:border-roxo-400"
        }`}
      >
        {item.pendente ? <Loader2 className="size-3.5 animate-spin text-roxo-400" /> : <Check className="size-4" strokeWidth={3} />}
      </button>

      {editando ? (
        <input
          autoFocus
          value={valor}
          maxLength={120}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => concluir(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") concluir(true);
            if (e.key === "Escape") concluir(false);
          }}
          aria-label="Editar descrição"
          className="campo h-9 flex-1"
        />
      ) : (
        <span
          className={`min-w-0 flex-1 truncate text-[15px] ${item.comprado ? "text-slate-400 line-through" : "font-medium text-marinho-900"}`}
          onDoubleClick={() => aoRenomear && !item.pendente && setEditando(true)}
        >
          {item.descricao}
          {item.adicionadoPorNome && !compacta && (
            <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline">por {item.adicionadoPorNome}</span>
          )}
        </span>
      )}

      {!editando && aoRenomear && aoRemover && !item.pendente && (
        <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Editar ${item.descricao}`}
            onClick={() => {
              setValor(item.descricao);
              setEditando(true);
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-roxo-50 hover:text-roxo-700"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Excluir ${item.descricao}`}
            onClick={() => aoRemover(item)}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </Tag>
  );
}
