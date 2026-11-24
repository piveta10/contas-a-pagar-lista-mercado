import { expect, test, type Page } from "@playwright/test";

/** Testes que gravam dados só rodam com autorização explícita (branch de teste do Neon). */
export function exigirBancoDeTeste() {
  test.skip(
    process.env.E2E_ALLOW_DB_WRITES !== "1",
    "Defina E2E_ALLOW_DB_WRITES=1 e aponte DATABASE_URL para uma BRANCH DE TESTE do Neon.",
  );
}

export const sufixo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

/** Data ISO deslocada de hoje (fuso de São Paulo). */
export function dataRelativa(dias: number): string {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Data isolada bem no futuro para listas de compras de teste. */
export function dataIsolada(): string {
  const dia = String(1 + Math.floor(Math.random() * 27)).padStart(2, "0");
  const mes = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  return `2099-${mes}-${dia}`;
}

export async function esperarToast(page: Page, texto: string | RegExp) {
  await expect(page.locator('[role="status"], [role="alert"]').filter({ hasText: texto }).first()).toBeVisible();
}

/** Responde ao pedido de PIN de administrador, se aparecer. */
export async function informarPinSePedido(page: Page) {
  const dialogo = page.getByRole("dialog", { name: "PIN de administrador" });
  if (await dialogo.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dialogo.getByLabel("PIN").fill(process.env.ADMIN_PIN ?? "");
    await dialogo.getByRole("button", { name: "Confirmar" }).click();
  }
}

/** Garante um responsável cadastrado e selecionado neste aparelho. */
export async function garantirResponsavel(page: Page, nome: string) {
  await page.goto("/configuracoes");
  await page.getByLabel("Nome do novo responsável").fill(nome);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();
  const usarAqui = page.locator("li").filter({ hasText: nome }).getByRole("button", { name: /Usar aqui/ });
  if (await usarAqui.isVisible().catch(() => false)) await usarAqui.click();
}
