import { expect, test, type Page } from "@playwright/test";
import { dataRelativa, esperarToast, exigirBancoDeTeste, garantirResponsavel, informarPinSePedido, sufixo } from "./apoio";

test.describe("contas", () => {
  exigirBancoDeTeste();
  const id = sufixo();
  const responsavel = `Teste E2E ${id}`;

  async function cadastrar(page: Page, descricao: string, valorDigitos: string, vencimento: string, categoria = "Luz") {
    await page.goto("/contas/nova");
    await page.getByRole("button", { name: categoria, exact: true }).click();
    await page.getByLabel("Descrição").fill(descricao);
    await page.getByLabel("Valor").fill(valorDigitos);
    await page.getByLabel("Vencimento").fill(vencimento);
    await page.getByRole("button", { name: responsavel, exact: true }).click();
    await page.getByRole("button", { name: "Salvar conta" }).click();
  }

  test.beforeEach(async ({ page }) => {
    await garantirResponsavel(page, responsavel);
  });

  test("cadastra, identifica vencida, ordena, paga, edita e exclui", async ({ page }) => {
    const vencida = `Luz vencida ${id}`;
    const futura = `Luz futura ${id}`;

    await cadastrar(page, vencida, "12345", dataRelativa(-5));
    await expect(page).toHaveURL(/\/contas$/);
    await cadastrar(page, futura, "9850", dataRelativa(3));
    await expect(page).toHaveURL(/\/contas$/);

    // Identificação automática de vencida + destaque
    await page.goto(`/contas?busca=${encodeURIComponent(id)}`);
    const linhas = page.getByTestId("linha-conta");
    await expect(linhas).toHaveCount(2);
    // Ordenação: vencida primeiro
    await expect(linhas.first()).toContainText(vencida);
    await expect(linhas.first()).toHaveAttribute("data-situacao", "vencida");
    await expect(linhas.first()).toContainText("R$ 123,45");
    await expect(linhas.nth(1)).toContainText("Vence em 3 dias");
    // Responsável salvo no registro
    await expect(linhas.first()).toContainText(responsavel);

    // Duplicação acidental é bloqueada
    await cadastrar(page, vencida, "12345", dataRelativa(-5));
    await esperarToast(page, /Já existe/);

    // Marcar como paga
    await page.goto(`/contas?busca=${encodeURIComponent(vencida)}`);
    await page.getByRole("button", { name: `Marcar ${vencida} como paga` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await esperarToast(page, /marcada como paga/);
    await expect(page.getByTestId("linha-conta").first()).toHaveAttribute("data-situacao", "paga");

    // Editar valor
    await page.getByTestId("linha-conta").first().getByRole("link").first().click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Valor").fill("20000");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await esperarToast(page, /atualizada/);
    await expect(page.getByText("R$ 200,00").first()).toBeVisible();
    await expect(page.getByText("Conta editada")).toBeVisible();

    // Excluir (exige confirmação + PIN)
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir conta" }).click();
    await informarPinSePedido(page);
    await expect(page).toHaveURL(/\/contas$/);
    await page.goto(`/contas?busca=${encodeURIComponent(vencida)}`);
    await expect(page.getByTestId("linha-conta")).toHaveCount(0);
  });

  test("dashboard mostra vencidas destacadas e em primeiro lugar", async ({ page }) => {
    const desc = `Água atrasada ${id}`;
    await cadastrar(page, desc, "4590", "2001-01-15", "Água");
    await page.goto("/");
    const primeira = page.getByTestId("linha-conta").first();
    await expect(primeira).toHaveAttribute("data-situacao", "vencida");
    await expect(primeira).toHaveClass(/bg-rose-50/);
  });

  test("filtra por situação", async ({ page }) => {
    await page.goto("/contas?situacao=vencidas");
    const situacoes = await page.getByTestId("linha-conta").evaluateAll((els) => els.map((e) => e.getAttribute("data-situacao")));
    expect(situacoes.every((s) => s === "vencida")).toBe(true);
  });

  test("relatório e PDF de relatório", async ({ page, request }) => {
    await page.goto(`/relatorios?de=2001-01-01&ate=${dataRelativa(30)}`);
    await expect(page.getByRole("heading", { name: /Detalhamento/ })).toBeVisible();
    const r = await request.get(`/api/pdf/relatorio?de=2001-01-01&ate=${dataRelativa(30)}`);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("application/pdf");
    expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
