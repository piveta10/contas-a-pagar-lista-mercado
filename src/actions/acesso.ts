"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import {
  ativarAdmin,
  criarSessao,
  desativarAdmin,
  encerrarSessao,
  registrarTentativa,
  temSessaoValida,
  tentativasEsgotadas,
} from "@/lib/sessao";
import { segredosIguais } from "@/lib/tokens";

export type EstadoAcesso = { erro?: string };

export async function entrar(_anterior: EstadoAcesso, formulario: FormData): Promise<EstadoAcesso> {
  const codigo = String(formulario.get("codigo") ?? "").trim().slice(0, 200);
  if (!codigo) return { erro: "Digite o código de acesso." };

  try {
    if (await tentativasEsgotadas("acesso")) {
      return { erro: "Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente." };
    }
    const correto = await segredosIguais(codigo, env().ACCESS_CODE);
    await registrarTentativa("acesso", correto);
    if (!correto) return { erro: "Código de acesso incorreto." };
    await criarSessao();
  } catch (erro) {
    console.error("[acesso] falha:", erro);
    return { erro: "Não foi possível validar o acesso agora. Tente novamente." };
  }
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/acesso");
}

export async function ativarModoAdmin(pin: string): Promise<Resultado<null>> {
  try {
    if (!(await temSessaoValida())) return falha("Sua sessão expirou.", "SESSAO");
    if (await tentativasEsgotadas("admin")) {
      return falha("Muitas tentativas incorretas. Aguarde 15 minutos.", "BLOQUEADO");
    }
    const limpo = String(pin ?? "").replace(/\D/g, "").slice(0, 12);
    const correto = limpo.length >= 6 && (await segredosIguais(limpo, env().ADMIN_PIN));
    await registrarTentativa("admin", correto);
    if (!correto) return falha("PIN incorreto.", "VALIDACAO");
    await ativarAdmin();
    return sucesso(null, "Modo administrador ativo por 15 minutos.");
  } catch (erro) {
    console.error("[admin] falha:", erro);
    return falha("Não foi possível validar o PIN agora.", "INTERNO");
  }
}

export async function sairModoAdmin(): Promise<Resultado<null>> {
  await desativarAdmin();
  return sucesso(null, "Modo administrador encerrado.");
}
