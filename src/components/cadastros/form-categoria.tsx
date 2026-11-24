"use client";

import { useState } from "react";
import { criarCategoria, editarCategoria } from "@/actions/cadastros";
import { Botao } from "@/components/ui/botao";
import { executar } from "@/components/ui/executar";
import { IconeCategoria, MAPA_ICONES } from "@/components/ui/icone-categoria";
import { Modal } from "@/components/ui/modal";
import { CORES_CATEGORIA, ICONES_CATEGORIA } from "@/lib/icones";

export type CategoriaForm = { id: string; nome: string; icone: string; cor: string };

export function ModalCategoria({
  aberto,
  aoFechar,
  categoria,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categoria?: CategoriaForm | null;
  aoSalvar?: (c: CategoriaForm) => void;
}) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={categoria ? "Editar categoria" : "Nova categoria"}>
      {aberto && <Formulario key={categoria?.id ?? "nova"} categoria={categoria} aoFechar={aoFechar} aoSalvar={aoSalvar} />}
    </Modal>
  );
}

function Formulario({
  categoria,
  aoFechar,
  aoSalvar,
}: {
  categoria?: CategoriaForm | null;
  aoFechar: () => void;
  aoSalvar?: (c: CategoriaForm) => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [icone, setIcone] = useState(categoria?.icone ?? "receipt");
  const [cor, setCor] = useState(categoria?.cor ?? CORES_CATEGORIA[9]);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const entrada = { nome, icone, cor };
    if (categoria) {
      const r = await executar(() => editarCategoria(categoria.id, entrada));
      if (r.ok) {
        aoSalvar?.({ id: categoria.id, ...entrada });
        aoFechar();
      }
    } else {
      const r = await executar(() => criarCategoria(entrada));
      if (r.ok) {
        aoSalvar?.(r.dados);
        aoFechar();
      }
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="flex items-end gap-3">
        <IconeCategoria icone={icone} cor={cor} tamanho="lg" />
        <div className="flex-1">
          <label htmlFor="nome-categoria" className="rotulo">
            Nome
          </label>
          <input
            id="nome-categoria"
            data-autofoco
            value={nome}
            maxLength={60}
            required
            onChange={(e) => setNome(e.target.value)}
            className="campo"
            placeholder="Ex.: Gás, Escola, Condomínio"
          />
        </div>
      </div>
      <fieldset>
        <legend className="rotulo">Ícone</legend>
        <div className="grid grid-cols-9 gap-1.5">
          {ICONES_CATEGORIA.map((nomeIcone) => {
            const I = MAPA_ICONES[nomeIcone];
            const ok = icone === nomeIcone;
            return (
              <button
                key={nomeIcone}
                type="button"
                aria-label={nomeIcone}
                aria-pressed={ok}
                onClick={() => setIcone(nomeIcone)}
                className={`grid aspect-square place-items-center rounded-xl border transition ${
                  ok ? "border-roxo-500 bg-roxo-50 text-roxo-700" : "border-marinho-100 text-slate-500 hover:bg-marinho-50"
                }`}
              >
                <I className="size-4" />
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="rotulo">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {CORES_CATEGORIA.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
              onClick={() => setCor(c)}
              className={`size-8 rounded-full ring-offset-2 transition ${cor === c ? "ring-2 ring-marinho-900" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Botao variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando} disabled={!nome.trim()}>
          Salvar
        </Botao>
      </div>
    </form>
  );
}
