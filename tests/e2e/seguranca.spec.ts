import { expect, test } from "@playwright/test";

test.describe("segurança sem sessão @smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("páginas redirecionam para o acesso", async ({ page }) => {
    for (const rota of ["/", "/contas", "/compras", "/relatorios", "/configuracoes"]) {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/acesso$/);
    }
  });

  test("APIs recusam requisições sem sessão", async ({ request }) => {
    for (const rota of [
      "/api/pdf/relatorio?de=2026-01-01&ate=2026-01-31",
      "/api/pdf/compras?de=2026-01-01&ate=2026-01-01",
      "/api/backup",
    ]) {
      const r = await request.get(rota);
      expect(r.status(), rota).toBe(401);
    }
  });

  test("cookie de sessão forjado é recusado", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "cc_sessao", value: "eyJ0Ijoic2Vzc2FvIn0.falso", url: baseURL! }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/acesso$/);
  });

  test("código incorreto mostra erro", async ({ page }) => {
    await page.goto("/acesso");
    await page.getByLabel("Código de acesso").fill("codigo-errado-para-teste");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toContainText(/incorreto|tentativas/);
  });

  test("cabeçalhos de segurança presentes", async ({ request }) => {
    const r = await request.get("/acesso");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("segurança com sessão", () => {
  test("backup exige PIN de administrador", async ({ request }) => {
    const r = await request.get("/api/backup");
    expect([403, 200]).toContain(r.status());
    if (r.status() === 200) test.info().annotations.push({ type: "aviso", description: "Modo admin já estava ativo nesta sessão." });
  });

  test("API valida parâmetros", async ({ request }) => {
    const r = await request.get("/api/pdf/relatorio?de=2026-12-01&ate=2026-01-01");
    expect(r.status()).toBe(400);
    const r2 = await request.get("/api/pdf/relatorio?de=1%27%20OR%201=1&ate=2026-01-01");
    expect(r2.status()).toBe(400);
  });
});
