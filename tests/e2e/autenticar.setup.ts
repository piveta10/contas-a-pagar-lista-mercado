import { expect, test as setup } from "@playwright/test";

const ARQUIVO = "tests/e2e/.auth/estado.json";

setup("entrar com o código de acesso", async ({ page }) => {
  const codigo = process.env.ACCESS_CODE;
  if (!codigo) throw new Error("Defina ACCESS_CODE para os testes E2E.");

  await page.goto("/");
  await expect(page).toHaveURL(/\/acesso$/);
  await page.getByLabel("Código de acesso").fill(codigo);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.context().storageState({ path: ARQUIVO });
});
