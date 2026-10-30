const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.GTC));
});

test("mensagens inglesas chegam ao Dialog e ao Toast", async ({ page }) => {
  const example = page.locator("#locale-en");
  await example.getByRole("button", { name: "Open dialog", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Localized dialog", exact: true });
  await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await example.getByRole("button", { name: "Show notification", exact: true }).click();
  const notifications = page.locator("#locale-toast-en");
  await notifications.getByRole("button", { name: "Dismiss notification", exact: true }).click();
  await page.evaluate(() => GTC.toast("Message", { region: "locale-toast-en", closeLabel: "Close this message" }));
  await notifications.getByRole("button", { name: "Close this message", exact: true }).click();
});

test("atualização parcial mantém idioma e inicializa as abas recebidas", async ({ page }) => {
  const region = page.locator("#locale-en-result");
  await region.getByRole("link", { name: "2", exact: true }).click();
  await expect(region.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(region.getByRole("link", { name: "First page", exact: true })).toHaveCount(1);
  await region.getByRole("tab", { name: "Details", exact: true }).click();
  await expect(region.getByRole("tabpanel", { name: "Details", exact: true })).toBeVisible();
  await page.route("**/demo/locale?*", route => route.fulfill({ status: 503, contentType: "text/html", body: "Unavailable" }));
  await region.getByRole("link", { name: "1", exact: true }).click();
  await expect(page.locator('[data-gtc-request-status="locale-en-result"]')).toHaveText("Unable to load the content. Please try again.");
  await expect(page.locator("#locale-pt-BR").getByRole("link", { name: "Primeira página", exact: true })).toHaveCount(1);
});

test("exemplo dinâmico suporta remoção e init idempotente", async ({ page }) => {
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.getByRole("button", { name: "Inserir componente", exact: true }).click();
    await page.getByRole("button", { name: "Executar GTC.init", exact: true }).click();
    await page.getByRole("button", { name: "Executar GTC.init", exact: true }).click();
    await page.locator("#dynamic-host").getByRole("tab", { name: "Detalhes", exact: true }).click();
    await expect(page.locator("#dynamic-events")).toHaveAttribute("data-event-count", "1");
    await expect(page.locator("#dynamic-events")).toHaveText("Aba selecionada: 2.");
    await page.getByRole("button", { name: "Remover componente", exact: true }).click();
    await expect(page.locator("#dynamic-example-tabs")).toHaveCount(0);
  }
});

test("Sidebar modal fecha por Escape, botão e backdrop com retorno do foco", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const trigger = page.getByRole("button", { name: "Componentes", exact: true });
  const dialog = page.getByRole("dialog", { name: "Componentes do catálogo", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Fechar navegação", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(385, 100);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("html")).not.toHaveAttribute("data-gtc-sidebar-modal-open");
});

test("Sidebar fecha ao selecionar um link e preserva nós após mudar viewport", async ({ page }) => {
  await page.evaluate(() => window.sidebarNode = document.getElementById("catalog-sidebar"));
  await page.setViewportSize({ width: 390, height: 800 });
  const trigger = page.getByRole("button", { name: "Componentes", exact: true });
  const dialog = page.getByRole("dialog", { name: "Componentes do catálogo", exact: true });
  await trigger.click();
  await dialog.getByRole("link", { name: "CSS personalizado", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#catalog-sidebar")).toBeVisible();
  expect(await page.evaluate(() => window.sidebarNode === document.getElementById("catalog-sidebar"))).toBe(true);
  expect(await page.locator("#catalog-sidebar").evaluate(node => node.closest("dialog") === null)).toBe(true);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 800 });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("#catalog-sidebar")).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("remover Sidebar aberta libera o bloqueio e remove o wrapper", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole("button", { name: "Componentes", exact: true }).click();
  await expect(page.locator(".gtc-sidebar-modal[open]")).toHaveCount(1);
  await page.evaluate(() => document.querySelector(".catalog-navigation").remove());
  await expect(page.locator(".gtc-sidebar-modal")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-gtc-sidebar-modal-open");
  await page.getByRole("button", { name: "Criar projeto", exact: true }).click();
});

test("Sidebar removida e reinserida inicializa o modal novamente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const trigger = page.getByRole("button", { name: "Componentes", exact: true });
  await trigger.click();
  await page.evaluate(() => {
    window.detachedSidebar = document.getElementById("catalog-sidebar");
    window.detachedSidebar.remove();
  });
  await expect(page.locator(".gtc-sidebar-modal")).toHaveCount(0);
  await page.evaluate(() => document.querySelector(".catalog-navigation").append(window.detachedSidebar));
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Componentes do catálogo", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar navegação", exact: true }).click();
  await expect(trigger).toBeFocused();
});
