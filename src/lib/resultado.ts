/** Formato padrão de retorno das Server Actions (serializável). */
export type CodigoErro = "ADMIN" | "SESSAO" | "VALIDACAO" | "DUPLICADO" | "NAO_ENCONTRADO" | "BLOQUEADO" | "INTERNO";

export type Resultado<T = null> =
  | { ok: true; dados: T; mensagem?: string }
  | { ok: false; mensagem: string; codigo: CodigoErro };

export function sucesso<T>(dados: T, mensagem?: string): Resultado<T> {
  return { ok: true, dados, mensagem };
}

export function falha(mensagem: string, codigo: CodigoErro = "VALIDACAO"): Resultado<never> {
  return { ok: false, mensagem, codigo };
}
