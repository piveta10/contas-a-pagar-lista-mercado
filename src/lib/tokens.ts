/**
 * Tokens assinados (HMAC-SHA256) para os cookies de sessão e de administrador.
 * Usa Web Crypto — funciona no Node, no Edge e nos testes.
 * Formato: base64url(payload JSON).base64url(assinatura)
 */
export type TipoToken = "sessao" | "admin";

export interface PayloadToken {
  t: TipoToken;
  /** geração: muda quando o código de acesso muda, invalidando todos os aparelhos */
  g: string;
  /** expiração em ms desde epoch */
  exp: number;
}

const codificador = new TextEncoder();

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  try {
    const normal = texto.replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(normal + "=".repeat((4 - (normal.length % 4)) % 4));
    const bytes = new Uint8Array(new ArrayBuffer(binario.length));
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function chave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", codificador.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function sha256Hex(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", codificador.encode(texto));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante (compara os hashes, não os textos). */
export async function segredosIguais(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

export async function geracao(codigoAcesso: string, segredo: string): Promise<string> {
  return (await sha256Hex(`${segredo}::${codigoAcesso}`)).slice(0, 16);
}

export async function assinarToken(payload: PayloadToken, segredo: string): Promise<string> {
  const corpo = paraBase64Url(codificador.encode(JSON.stringify(payload)));
  const assinatura = await crypto.subtle.sign("HMAC", await chave(segredo), codificador.encode(corpo));
  return `${corpo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

export async function verificarToken(
  token: string | undefined | null,
  segredo: string,
  esperado: { tipo: TipoToken; geracao: string },
  agora: number = Date.now(),
): Promise<PayloadToken | null> {
  if (!token || token.length > 512) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [corpo, assinaturaB64] = partes;
  const assinatura = deBase64Url(assinaturaB64);
  if (!assinatura) return null;

  const valida = await crypto.subtle.verify("HMAC", await chave(segredo), assinatura, codificador.encode(corpo));
  if (!valida) return null;

  const bytes = deBase64Url(corpo);
  if (!bytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as PayloadToken;
    if (payload.t !== esperado.tipo || payload.g !== esperado.geracao) return null;
    if (typeof payload.exp !== "number" || payload.exp <= agora) return null;
    return payload;
  } catch {
    return null;
  }
}
