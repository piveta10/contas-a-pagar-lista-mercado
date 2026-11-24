import "server-only";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { ZodError } from "zod";
import { db } from "@/db";
import { responsaveis, tentativasAcesso } from "@/db/schema";
import { env } from "./env";
import { falha, type Resultado } from "./resultado";
import { assinarToken, geracao, sha256Hex, verificarToken, type TipoToken } from "./tokens";
import { primeiraMensagem } from "./validacao";

export const COOKIE_SESSAO = "cc_sessao";
export const COOKIE_ADMIN = "cc_admin";
export const COOKIE_RESPONSAVEL = "cc_responsavel";

const DIA = 86_400_000;
const DURACAO_SESSAO = 180 * DIA;
const DURACAO_ADMIN = 15 * 60_000;
const JANELA_BLOQUEIO = 15 * 60_000;
const MAX_FALHAS = 5;

const producao = process.env.NODE_ENV === "production";

async function geracaoAtual() {
  const e = env();
  return geracao(e.ACCESS_CODE, e.SESSION_SECRET);
}

async function tokenValido(nome: string, tipo: TipoToken): Promise<boolean> {
  const valor = (await cookies()).get(nome)?.value;
  if (!valor) return false;
  return (await verificarToken(valor, env().SESSION_SECRET, { tipo, geracao: await geracaoAtual() })) !== null;
}

export async function temSessaoValida(): Promise<boolean> {
  return tokenValido(COOKIE_SESSAO, "sessao");
}

export async function adminAtivo(): Promise<boolean> {
  return (await temSessaoValida()) && (await tokenValido(COOKIE_ADMIN, "admin"));
}

async function gravarToken(nome: string, tipo: TipoToken, duracao: number) {
  const token = await assinarToken({ t: tipo, g: await geracaoAtual(), exp: Date.now() + duracao }, env().SESSION_SECRET);
  (await cookies()).set(nome, token, {
    httpOnly: true,
    secure: producao,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(duracao / 1000),
  });
}

export async function criarSessao() {
  await gravarToken(COOKIE_SESSAO, "sessao", DURACAO_SESSAO);
}

export async function ativarAdmin() {
  await gravarToken(COOKIE_ADMIN, "admin", DURACAO_ADMIN);
}

export async function desativarAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
}

export async function encerrarSessao() {
  const c = await cookies();
  c.delete(COOKIE_SESSAO);
  c.delete(COOKIE_ADMIN);
}

/** Responsável escolhido neste aparelho (preferência, não é credencial). */
export async function responsavelAtual(): Promise<{ id: string; nome: string } | null> {
  const id = (await cookies()).get(COOKIE_RESPONSAVEL)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db()
    .select({ id: responsaveis.id, nome: responsaveis.nome })
    .from(responsaveis)
    .where(and(eq(responsaveis.id, id), eq(responsaveis.ativo, true)))
    .limit(1);
  return r ?? null;
}

export async function definirCookieResponsavel(id: string | null) {
  const c = await cookies();
  if (!id) c.delete(COOKIE_RESPONSAVEL);
  else c.set(COOKIE_RESPONSAVEL, id, { httpOnly: true, secure: producao, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
}

// ---------------------------------------------------------------------------
// Limite de tentativas (código de acesso e PIN)
// ---------------------------------------------------------------------------
async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  return sha256Hex(`${env().SESSION_SECRET}::ip::${ip}`);
}

export async function tentativasEsgotadas(tipo: "acesso" | "admin"): Promise<boolean> {
  const hash = await ipHash();
  const desde = new Date(Date.now() - JANELA_BLOQUEIO);
  const [r] = await db()
    .select({ total: count() })
    .from(tentativasAcesso)
    .where(
      and(
        eq(tentativasAcesso.tipo, tipo),
        eq(tentativasAcesso.ipHash, hash),
        eq(tentativasAcesso.sucesso, false),
        gte(tentativasAcesso.criadoEm, desde),
      ),
    );
  return (r?.total ?? 0) >= MAX_FALHAS;
}

export async function registrarTentativa(tipo: "acesso" | "admin", sucesso: boolean) {
  const hash = await ipHash();
  await db().insert(tentativasAcesso).values({ tipo, ipHash: hash, sucesso });
  if (sucesso) {
    // limpeza: falhas deste IP e registros com mais de 30 dias
    await db()
      .delete(tentativasAcesso)
      .where(and(eq(tentativasAcesso.tipo, tipo), eq(tentativasAcesso.ipHash, hash), eq(tentativasAcesso.sucesso, false)));
    await db().delete(tentativasAcesso).where(lt(tentativasAcesso.criadoEm, new Date(Date.now() - 30 * DIA)));
  }
}

// ---------------------------------------------------------------------------
// Envelope das Server Actions: sessão, PIN, validação e erros do banco
// ---------------------------------------------------------------------------
function codigoPg(erro: unknown): string | undefined {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

export class ErroNegocio extends Error {
  constructor(
    mensagem: string,
    public codigo: "VALIDACAO" | "DUPLICADO" | "NAO_ENCONTRADO" = "VALIDACAO",
  ) {
    super(mensagem);
  }
}

export async function protegerAcao<T>(
  fn: () => Promise<Resultado<T>>,
  opcoes: { admin?: boolean; mensagemDuplicado?: string } = {},
): Promise<Resultado<T>> {
  try {
    if (!(await temSessaoValida())) return falha("Sua sessão expirou. Digite o código de acesso novamente.", "SESSAO");
    if (opcoes.admin && !(await adminAtivo())) return falha("Esta operação exige o PIN de administrador.", "ADMIN");
    return await fn();
  } catch (erro) {
    if (erro instanceof ZodError) return falha(primeiraMensagem(erro), "VALIDACAO");
    if (erro instanceof ErroNegocio) return falha(erro.message, erro.codigo);
    if (codigoPg(erro) === "23505") {
      return falha(opcoes.mensagemDuplicado ?? "Já existe um registro igual.", "DUPLICADO");
    }
    if (codigoPg(erro) === "23503") return falha("Registro relacionado não encontrado.", "NAO_ENCONTRADO");
    console.error("[acao] erro inesperado:", erro);
    return falha("Não foi possível concluir. Tente novamente.", "INTERNO");
  }
}
