import { describe, expect, it } from "vitest";
import { assinarToken, geracao, segredosIguais, verificarToken } from "@/lib/tokens";

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres!!";

describe("tokens de sessão", () => {
  it("aceita token válido e recusa adulterado", async () => {
    const g = await geracao("codigo-da-casa", SEGREDO);
    const token = await assinarToken({ t: "sessao", g, exp: Date.now() + 60_000 }, SEGREDO);
    expect(await verificarToken(token, SEGREDO, { tipo: "sessao", geracao: g })).not.toBeNull();

    const [corpo, assinatura] = token.split(".");
    const adulterado = JSON.parse(atob(corpo.replace(/-/g, "+").replace(/_/g, "/")));
    adulterado.exp = Date.now() + 10 ** 12;
    const corpoFalso = btoa(JSON.stringify(adulterado)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verificarToken(`${corpoFalso}.${assinatura}`, SEGREDO, { tipo: "sessao", geracao: g })).toBeNull();
  });

  it("recusa token expirado, de outro tipo ou de outro segredo", async () => {
    const g = await geracao("codigo", SEGREDO);
    const expirado = await assinarToken({ t: "sessao", g, exp: Date.now() - 1 }, SEGREDO);
    expect(await verificarToken(expirado, SEGREDO, { tipo: "sessao", geracao: g })).toBeNull();

    const admin = await assinarToken({ t: "admin", g, exp: Date.now() + 60_000 }, SEGREDO);
    expect(await verificarToken(admin, SEGREDO, { tipo: "sessao", geracao: g })).toBeNull();
    expect(await verificarToken(admin, "outro-segredo-qualquer-com-32-caracteres", { tipo: "admin", geracao: g })).toBeNull();
  });

  it("trocar o código de acesso invalida as sessões existentes", async () => {
    const g1 = await geracao("codigo-antigo", SEGREDO);
    const g2 = await geracao("codigo-novo", SEGREDO);
    const token = await assinarToken({ t: "sessao", g: g1, exp: Date.now() + 60_000 }, SEGREDO);
    expect(await verificarToken(token, SEGREDO, { tipo: "sessao", geracao: g2 })).toBeNull();
  });

  it("recusa lixo sem lançar exceção", async () => {
    for (const lixo of ["", "abc", "a.b.c", "!!!.???", "x".repeat(600), null, undefined]) {
      expect(await verificarToken(lixo, SEGREDO, { tipo: "sessao", geracao: "x" })).toBeNull();
    }
  });

  it("compara segredos corretamente", async () => {
    expect(await segredosIguais("123456", "123456")).toBe(true);
    expect(await segredosIguais("123456", "123457")).toBe(false);
  });
});
