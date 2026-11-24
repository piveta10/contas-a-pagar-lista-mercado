"use client";

import { Plus, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { criarResponsavel } from "@/actions/cadastros";
import { criarConta, editarConta } from "@/actions/contas";
import { ModalCategoria, type CategoriaForm } from "@/components/cadastros/form-categoria";
import { Botao } from "@/components/ui/botao";
import { CampoValor } from "@/components/ui/campo-valor";
import { executar } from "@/components/ui/executar";
import { IconeCategoria } from "@/components/ui/icone-categoria";

interface ContaEdicao {
  id: string;
  descricao: string;
  categoriaId: string;
  valorCentavos: number;
  vencimento: string;
  observacao: string | null;
  responsavelNome: string;
}

function novaChave() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;
}

export function FormConta({
  categorias: categoriasIniciais,
  responsaveis: responsaveisIniciais,
  responsavelAtualId,
  hoje,
  conta,
  aoConcluir,
}: {
  categorias: CategoriaForm[];
  responsaveis: { id: string; nome: string }[];
  responsavelAtualId?: string | null;
  hoje: string;
  conta?: ContaEdicao;
  aoConcluir?: () => void;
}) {
  const router = useRouter();
  const edicao = !!conta;
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [responsaveis, setResponsaveis] = useState(responsaveisIniciais);
  const [descricao, setDescricao] = useState(conta?.descricao ?? "");
  const [categoriaId, setCategoriaId] = useState(conta?.categoriaId ?? "");
  const [valor, setValor] = useState(conta?.valorCentavos ?? 0);
  const [vencimento, setVencimento] = useState(conta?.vencimento ?? hoje);
  const [observacao, setObservacao] = useState(conta?.observacao ?? "");
  const [responsavelId, setResponsavelId] = useState(
    responsavelAtualId && responsaveisIniciais.some((r) => r.id === responsavelAtualId)
      ? responsavelAtualId
      : responsaveisIniciais.length === 1
        ? responsaveisIniciais[0].id
        : "",
  );
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [modalCategoria, setModalCategoria] = useState(false);
  const [enviando, setEnviando] = useState<false | "sair" | "outra">(false);
  const [erros, setErros] = useState<Record<string, boolean>>({});
  const chave = useRef(novaChave());
  const campoDescricao = useRef<HTMLInputElement>(null);

  function escolherCategoria(c: CategoriaForm) {
    const anterior = categorias.find((x) => x.id === categoriaId);
    setCategoriaId(c.id);
    // Preenche a descrição com o nome da categoria se estiver vazia (ou ainda for a categoria anterior).
    if (!descricao.trim() || descricao === anterior?.nome) setDescricao(c.nome);
    setErros((e) => ({ ...e, categoria: false }));
  }

  async function cadastrarResponsavel() {
    const nome = novoResponsavel.trim();
    if (!nome) return;
    const r = await executar(() => criarResponsavel(nome));
    if (r.ok) {
      setResponsaveis((l) => [...l, r.dados].sort((a, b) => a.nome.localeCompare(b.nome)));
      setResponsavelId(r.dados.id);
      setNovoResponsavel("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submissor = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const modo = submissor?.value === "outra" ? "outra" : "sair";

    const faltando = {
      descricao: !descricao.trim(),
      categoria: !categoriaId,
      valor: valor <= 0,
      vencimento: !vencimento,
      responsavel: !edicao && !responsavelId,
    };
    setErros(faltando);
    if (Object.values(faltando).some(Boolean)) {
      return;
    }

    setEnviando(modo);
    const dados = { descricao, categoriaId, valor: valor / 100, vencimento, observacao: observacao || null };
    const r = edicao
      ? await executar(() => editarConta(conta!.id, dados))
      : await executar(() => criarConta({ ...dados, responsavelId, chave: chave.current }));
    setEnviando(false);
    if (!r.ok) return;

    if (edicao) {
      aoConcluir?.();
      router.refresh();
    } else if (modo === "outra") {
      chave.current = novaChave();
      setDescricao("");
      setValor(0);
      setObservacao("");
      campoDescricao.current?.focus();
      router.refresh();
    } else {
      router.push("/contas");
    }
  }

  const erroCls = "border-rose-400 ring-4 ring-rose-100";

  return (
    <>
    <form onSubmit={enviar} noValidate className="space-y-6">
      {/* Categoria */}
      <fieldset>
        <legend className="rotulo">Categoria</legend>
        <div className={`grid grid-cols-3 gap-2 rounded-2xl sm:grid-cols-4 ${erros.categoria ? erroCls : ""}`}>
          {categorias.map((c) => {
            const ok = c.id === categoriaId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={ok}
                onClick={() => escolherCategoria(c)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition ${
                  ok ? "border-roxo-500 bg-roxo-50 text-roxo-800 ring-2 ring-roxo-200" : "border-marinho-100 bg-white text-marinho-700 hover:border-roxo-200"
                }`}
              >
                <IconeCategoria icone={c.icone} cor={c.cor} tamanho="sm" />
                <span className="w-full truncate text-center">{c.nome}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setModalCategoria(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-roxo-300 px-2 py-3 text-xs font-semibold text-roxo-700 hover:bg-roxo-50"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-roxo-100">
              <Plus className="size-4" />
            </span>
            Nova
          </button>
        </div>
        {erros.categoria && <p className="mt-1.5 text-sm text-rose-600">Escolha uma categoria.</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="descricao" className="rotulo">
            Descrição
          </label>
          <input
            ref={campoDescricao}
            id="descricao"
            value={descricao}
            maxLength={120}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Conta de luz de novembro"
            className={`campo ${erros.descricao ? erroCls : ""}`}
            aria-invalid={erros.descricao}
          />
        </div>
        <div>
          <label htmlFor="valor" className="rotulo">
            Valor
          </label>
          <CampoValor id="valor" centavos={valor} aoMudar={setValor} invalido={erros.valor} />
          {erros.valor && <p className="mt-1.5 text-sm text-rose-600">Informe um valor maior que zero.</p>}
        </div>
        <div>
          <label htmlFor="vencimento" className="rotulo">
            Vencimento
          </label>
          <input
            id="vencimento"
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            className={`campo ${erros.vencimento ? erroCls : ""}`}
            aria-invalid={erros.vencimento}
          />
        </div>
      </div>

      {/* Responsável */}
      {edicao ? (
        <p className="flex items-center gap-2 rounded-2xl bg-marinho-50 px-4 py-3 text-sm text-marinho-700">
          <UserRound className="size-4" /> Cadastrada por <strong>{conta?.responsavelNome}</strong> (não muda na edição)
        </p>
      ) : (
        <fieldset>
          <legend className="rotulo">Quem está cadastrando?</legend>
          <div className={`flex flex-wrap gap-2 rounded-2xl ${erros.responsavel ? erroCls : ""}`}>
            {responsaveis.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === responsavelId}
                onClick={() => {
                  setResponsavelId(r.id);
                  setErros((e) => ({ ...e, responsavel: false }));
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  r.id === responsavelId ? "border-roxo-600 bg-roxo-600 text-white" : "border-marinho-100 bg-white text-marinho-700 hover:border-roxo-300"
                }`}
              >
                {r.nome}
              </button>
            ))}
          </div>
          <div className="mt-2 flex max-w-sm gap-2">
            <input
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  cadastrarResponsavel();
                }
              }}
              placeholder={responsaveis.length ? "Outra pessoa? Digite o nome" : "Digite seu nome para começar"}
              maxLength={80}
              className="campo h-10"
              aria-label="Nome do novo responsável"
            />
            <Botao variante="secundario" tamanho="sm" className="h-10" onClick={cadastrarResponsavel} disabled={!novoResponsavel.trim()}>
              <Plus className="size-4" /> Adicionar
            </Botao>
          </div>
          {erros.responsavel && <p className="mt-1.5 text-sm text-rose-600">Selecione quem está cadastrando.</p>}
        </fieldset>
      )}

      <div>
        <label htmlFor="observacao" className="rotulo">
          Observação <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="observacao"
          value={observacao}
          maxLength={500}
          rows={2}
          onChange={(e) => setObservacao(e.target.value)}
          className="campo h-auto py-2.5"
          placeholder="Código de barras, forma de pagamento, etc."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-marinho-100 pt-5 sm:flex-row sm:justify-end">
        {edicao ? (
          <Botao variante="fantasma" onClick={aoConcluir}>
            Cancelar
          </Botao>
        ) : (
          <Botao type="submit" value="outra" variante="secundario" carregando={enviando === "outra"} disabled={!!enviando}>
            Salvar e cadastrar outra
          </Botao>
        )}
        <Botao type="submit" value="sair" carregando={enviando === "sair"} disabled={!!enviando} tamanho="lg">
          <Save className="size-5" /> {edicao ? "Salvar alterações" : "Salvar conta"}
        </Botao>
      </div>
    </form>

      <ModalCategoria
        aberto={modalCategoria}
        aoFechar={() => setModalCategoria(false)}
        aoSalvar={(c) => {
          setCategorias((l) => [...l, c].sort((a, b) => a.nome.localeCompare(b.nome)));
          escolherCategoria(c);
        }}
      />
    </>
  );
}
