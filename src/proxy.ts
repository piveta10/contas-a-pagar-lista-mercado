/**
 * Barreira de acesso (Next.js 16 "proxy", antigo middleware).
 * Camada extra: páginas, Server Actions e APIs também verificam a sessão
 * por conta própria no servidor.
 */
import { NextResponse, type NextRequest } from "next/server";
import { geracao, verificarToken } from "@/lib/tokens";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/acesso") return NextResponse.next();

  const segredo = process.env.SESSION_SECRET;
  const codigo = process.env.ACCESS_CODE;
  if (!segredo || !codigo) {
    return new NextResponse("Aplicação sem configuração de segurança (SESSION_SECRET / ACCESS_CODE).", { status: 503 });
  }

  const valido = await verificarToken(req.cookies.get("cc_sessao")?.value, segredo, {
    tipo: "sessao",
    geracao: await geracao(codigo, segredo),
  });
  if (valido) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });
  }
  // Server Actions respondem com código "SESSAO" e o cliente redireciona.
  if (req.method === "POST" && req.headers.has("next-action")) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/acesso";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt|sw.js).*)"],
};
