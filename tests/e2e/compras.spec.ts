import { expect, test } from "@playwright/test";
import { dataIsolada, esperarToast, exigirBancoDeTeste, sufixo } from "./apoio";

test.describe("lista de compras", () => {
  exigirBancoDeTeste();

  test("adição rápida com ENTER, persistência, separação por data e limpeza sem apagar histórico", async ({ page, request }) => {
    const data = dataIsolada();
    const outra = data.replace(/-(\d\d)$/, (_, d) => `-${String(((Number(d) % 27) + 1)).padStart(2, "0")}`);
    const produto = `Leite ${sufixo()}`;
    const campo = page.getByPlaceholder("Digite um produto para comprar...");

    await page.goto(`/compras?data=${data}`);
    await campo.fill(produto);
    await campo.press("Enter");

    // Aparece imediatamente, campo limpo, mesma tela, confirmação discreta
    await expect(page.getByTestId("item-compra").filter({ hasText: produto })).toBeVisible();
    await expect(campo).toHaveValue("");
    await expect(page).toHaveURL(new RegExp(`data=${data}`));
    await esperarToast(page, /adicionado/);

    // Botão + também funciona
    await campo.fill(`${produto} B`);
    await page.getByRole("button", { name: "Adicionar produto" }).click();
    await expect(page.getByTestId("item-compra").filter({ hasText: `${produto} B` })).toBeVisible();

    // Persistência após atualizar
    await page.reload();
    await expect(page.getByTestId("item-compra").filter({ hasText: produto })).toHaveCount(2);

    // Marcar / desmarcar
    await page.getByRole("checkbox", { name: `Marcar ${produto} como comprado` }).click();
    await expect(page.getByRole("checkbox", { name: `Desmarcar ${produto}` })).toBeVisible();
    await page.reload();
    await page.getByRole("checkbox", { name: `Desmarcar ${produto}` }).click();
    await expect(page.getByRole("checkbox", { name: `Marcar ${produto} como comprado` })).toBeVisible();

    // Editar descrição
    await page.getByRole("button", { name: `Editar ${produto} B` }).click();
    await page.getByLabel("Editar descrição").fill(`${produto} integral`);
    await page.getByLabel("Editar descrição").press("Enter");
    await expect(page.getByTestId("item-compra").filter({ hasText: `${produto} integral` })).toBeVisible();

    // Excluir individualmente
    await page.getByRole("button", { name: `Excluir ${produto} integral` }).click();
    await expect(page.getByTestId("item-compra").filter({ hasText: `${produto} integral` })).toHaveCount(0);

    // Datas não se misturam
    await page.goto(`/compras?data=${outra}`);
    await expect(page.getByTestId("item-compra").filter({ hasText: produto })).toHaveCount(0);

    // PDF da data
    const pdf = await request.get(`/api/pdf/compras?de=${data}&ate=${data}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    // Limpar lista atual: confirma, arquiva, mantém histórico
    await page.goto(`/compras?data=${data}`);
    await page.getByRole("button", { name: "Limpar lista atual" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Arquivar e limpar" }).click();
    await esperarToast(page, /arquivada/);
    await expect(page.getByTestId("item-compra")).toHaveCount(0);
    await expect(page.getByText(/Arquivada em/).first()).toBeVisible();
    await page.getByText(/Arquivada em/).first().click();
    await expect(page.getByText(produto, { exact: true })).toBeVisible();
  });

  test("sugestão rápida adiciona com um toque", async ({ page }) => {
    const data = dataIsolada();
    await page.goto(`/compras?data=${data}`);
    await page.getByRole("button", { name: "Arroz", exact: true }).click();
    await expect(page.getByTestId("item-compra").filter({ hasText: "Arroz" })).toBeVisible();
  });

  test("campo rápido também está na tela inicial", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("Digite um produto para comprar...")).toBeVisible();
  });
});

test.describe("responsividade @smoke", () => {
  test("navegação adequada ao tamanho da tela", async ({ page, isMobile }) => {
    await page.goto("/");
    if (page.url().includes("/acesso")) test.skip(true, "Sem sessão (execução de fumaça em produção).");
    const nav = page.getByRole("navigation", { name: "Menu principal" });
    if (isMobile) {
      await expect(nav.last()).toBeVisible();
      await expect(nav.last()).toHaveClass(/bottom-0/);
    } else {
      await expect(nav.first()).toBeVisible();
    }
    const largura = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(largura).toBeLessThanOrEqual(1);
  });
});
