"use client";

import type { Resultado } from "@/lib/resultado";
import { solicitarPinAdmin } from "./dialogos";
import { toast } from "./toaster";

/**
 * Executa uma Server Action tratando o padrão do app:
 * - pede o PIN e repete quando a ação exige administrador;
 * - volta para /acesso se a sessão expirou;
 * - mostra mensagens de sucesso/erro discretas.
 */
export async function executar<T>(
  acao: () => Promise<Resultado<T>>,
  opcoes: { silencioso?: boolean; mensagemSucesso?: string } = {},
): Promise<Resultado<T>> {
  let r: Resultado<T>;
  try {
    r = await acao();
    if (!r.ok && r.codigo === "ADMIN") {
      if (!(await solicitarPinAdmin())) return r;
      r = await acao();
    }
  } catch {
    r = { ok: false, codigo: "INTERNO", mensagem: "Sem conexão com o servidor. Verifique a internet e tente novamente." };
  }

  if (!r.ok && r.codigo === "SESSAO") {
    toast(r.mensagem, { tipo: "erro" });
    window.location.assign("/acesso");
    return r;
  }
  if (!r.ok) toast(r.mensagem, { tipo: "erro" });
  else if (!opcoes.silencioso && (opcoes.mensagemSucesso ?? r.mensagem)) toast((opcoes.mensagemSucesso ?? r.mensagem)!);
  return r;
}
