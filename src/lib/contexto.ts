import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { listarCategorias, listarResponsaveis } from "@/queries/cadastros";
import { hojeISO } from "./datas";
import { adminAtivo, responsavelAtual, temSessaoValida } from "./sessao";

/** Dados comuns da requisição (deduplicados entre layout e páginas). */
export const contextoUsuario = cache(async () => {
  const [responsaveis, atual, admin] = await Promise.all([listarResponsaveis(), responsavelAtual(), adminAtivo()]);
  return { responsaveis, atual, admin, hoje: hojeISO() };
});

export const categoriasAtivas = cache(listarCategorias);

/** Toda página protegida chama isto antes de consultar o banco. */
export const exigirSessao = cache(async () => {
  if (!(await temSessaoValida())) redirect("/acesso");
});
