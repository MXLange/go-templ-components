const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.GTC));
});

for (const theme of ["light", "dark"]) {
  for (const density of ["compact", "comfortable"]) {
    test(`${theme} / ${density}: acessibilidade e layout`, async ({ page }, testInfo) => {
      await page.locator("#theme-control").selectOption(theme);
      await page.locator("#density-control").selectOption(density);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });
      await expect(page.locator(".checkout-submit")).toHaveCSS("background-color", "rgb(20, 83, 45)");
      await page.setViewportSize({ width: 320, height: 740 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
    });
  }
}

test("todos os componentes e assets carregam sem erros JavaScript", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.reload();
  for (const section of ["buttons", "forms", "surfaces", "overlays", "tabs", "table", "navigation", "toast", "customization"]) {
    await expect(page.locator(`#${section}`)).toBeVisible();
  }
  for (const file of ["/assets/ui.css", "/assets/ui.js", "/static/catalog.css", "/static/catalog.js"]) {
    expect((await request.get(file)).status()).toBe(200);
  }
  expect(errors).toEqual([]);
});

test("Dialog mantém o foco, fecha por Escape e retorna ao trigger", async ({ page }) => {
  const trigger = page.locator("#overlays").getByRole("button", { name: "Abrir diálogo", exact: true });
  const dialog = page.getByRole("dialog", { name: "Detalhes do projeto" });
  await trigger.click();
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("Dropdown usa setas, ignora item desabilitado e emite seleção", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Ações do projeto" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Editar projeto" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Duplicar projeto" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dropdown-result")).toHaveText("Ação selecionada: duplicate.");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("#overlays-title").click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("Dropdown fecha por Tab e mantém navegação sequencial", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Ações do projeto" });
  await trigger.click();
  await page.keyboard.press("Tab");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});

test("Tabs usa Home, End e setas sem selecionar abas desabilitadas", async ({ page }) => {
  const overview = page.getByRole("tab", { name: "Visão geral", exact: true });
  const activity = page.getByRole("tab", { name: "Atividade", exact: true });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(activity).toBeFocused();
  await expect(activity).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Atividade" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(overview).toBeFocused();
  await page.keyboard.press("End");
  await expect(activity).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();
});

test("init é idempotente e reconhece componentes inseridos no DOM", async ({ page }) => {
  await page.evaluate(() => {
    const original = document.getElementById("project-tabs");
    const clone = original.outerHTML.replaceAll("project-tabs", "dynamic-tabs");
    document.getElementById("tabs").insertAdjacentHTML("beforeend", clone);
    GTC.init();
    GTC.init();
    window.tabEvents = 0;
    document.getElementById("dynamic-tabs").addEventListener("gtc:tabs-change", () => window.tabEvents++);
  });
  const dynamic = page.locator("#dynamic-tabs");
  await dynamic.getByRole("tab", { name: "Atividade", exact: true }).click();
  await expect(dynamic.getByRole("tabpanel", { name: "Atividade" })).toBeVisible();
  expect(await page.evaluate(() => window.tabEvents)).toBe(1);
  await expect(page.locator("#project-tabs").getByRole("tab", { name: "Visão geral", exact: true })).toHaveAttribute("aria-selected", "true");

  await page.evaluate(() => {
    const original = document.getElementById("project-actions");
    const node = document.createElement("div");
    node.innerHTML = original.outerHTML.replaceAll("project-actions", "dynamic-actions");
    document.getElementById("overlays").append(node.firstElementChild);
  });
  const dropdown = page.locator("#dynamic-actions");
  await dropdown.getByRole("button", { name: "Ações do projeto" }).click();
  await expect(dropdown.getByRole("menu")).toBeVisible();
  await expect(page.locator("#project-actions [data-gtc-dropdown-trigger]")).toHaveAttribute("aria-expanded", "false");
});

test("Sidebar sincroniza estado, aria-expanded e inert", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Alternar navegação", exact: true });
  const sidebar = page.locator("#demo-sidebar");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(sidebar).not.toBeVisible();
  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(sidebar).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test("Toast escapa conteúdo, anuncia mensagem e retorna foco ao dispensar", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Notificar sucesso" });
  await trigger.click();
  const region = page.getByRole("region", { name: "Notificações", exact: true });
  await expect(region.locator(".gtc-toast")).toContainText("As alterações foram salvas.");
  await expect(region.locator("[role=status]")).toHaveText("As alterações foram salvas.");
  const close = region.getByRole("button", { name: "Dispensar notificação" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(region.locator(".gtc-toast")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.evaluate(() => GTC.toast('<img src=x onerror="alert(1)">', { tone: "error" }));
  await expect(region.locator("img")).toHaveCount(0);
  await expect(region.locator(".gtc-toast")).toContainText("<img");
});

test("Toast temporário pausa durante foco e limpa o timer ao remover", async ({ page }) => {
  const id = await page.evaluate(() => GTC.toast("Temporário", { duration: 400 }));
  const toast = page.locator(`#${id}`);
  await toast.getByRole("button").focus();
  await page.waitForTimeout(550);
  await expect(toast).toBeVisible();
  await page.locator("#theme-control").focus();
  await expect(toast).toHaveCount(0);
});

test("CSS do consumidor substitui estilos globais e estados", async ({ page }) => {
  const customized = page.locator(".checkout-submit");
  await expect(customized).toHaveCSS("border-radius", "0px");
  await customized.hover();
  await expect(customized).toHaveCSS("background-color", "rgb(22, 101, 52)");
  await page.addStyleTag({ content: `
    :root { --gtc-color-primary: rgb(120, 20, 20); }
    .gtc-button { border-radius: 12px; }
    .gtc-button:hover { background: rgb(10, 40, 80); }
  ` });
  const native = page.getByRole("button", { name: "Estilo nativo", exact: true });
  await expect(native).toHaveCSS("border-radius", "12px");
  await expect(native).toHaveCSS("background-color", "rgb(120, 20, 20)");
  await native.hover();
  await expect(native).toHaveCSS("background-color", "rgb(10, 40, 80)");
  await expect(page.locator(".catalog-custom-theme .gtc-button")).toHaveCSS("background-color", "rgb(107, 33, 168)");
});

test("tema do sistema e preferência explícita funcionam", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator("#theme-control").selectOption("system");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.locator("#theme-control").selectOption("light");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.locator("#density-control").selectOption("compact");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-gtc-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-gtc-density", "compact");
});

test("editor CSS aplica alterações durante a digitação e restaura o exemplo", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "CSS personalizado", exact: true });
  const button = page.locator(".checkout-submit");
  const original = await editor.inputValue();
  await editor.fill(".checkout-submit { background: rgb(20, 40, 120); border-radius: 16px; }");
  await expect(button).toHaveCSS("background-color", "rgb(20, 40, 120)");
  await expect(button).toHaveCSS("border-radius", "16px");
  await editor.fill("");
  await expect(button).not.toHaveCSS("background-color", "rgb(20, 40, 120)");
  await page.getByRole("button", { name: "Restaurar CSS", exact: true }).click();
  await expect(editor).toHaveValue(original);
  await expect(button).toHaveCSS("background-color", "rgb(20, 83, 45)");
  await expect(button).toHaveCSS("border-radius", "0px");
});

test("formulário e paginação executam requisições no servidor", async ({ page }) => {
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Projeto de teste");
  await page.getByLabel("E-mail", { exact: true }).fill("equipe@exemplo.com");
  await page.getByRole("button", { name: "Enviar formulário" }).click();
  await expect(page.getByText("Formulário recebido", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nome do projeto", { exact: true })).toHaveValue("Projeto de teste");
  await page.getByRole("navigation", { name: "Paginação", exact: true }).getByRole("link", { name: "2", exact: true }).click();
  await expect(page.locator(".gtc-table caption").first()).toHaveText("Projetos da equipe · página 2 de 3");
  await expect(page.getByText("PRJ-0005", { exact: true })).toBeVisible();
});

test("paginação centraliza setas e respeita primeira e última página", async ({ page }, testInfo) => {
  const pagination = page.getByRole("navigation", { name: "Paginação", exact: true });
  const first = pagination.getByRole("link", { name: "Primeira página", exact: true });
  const previous = pagination.getByRole("link", { name: "Página anterior", exact: true });
  const next = pagination.getByRole("link", { name: "Próxima página", exact: true });
  const last = pagination.getByRole("link", { name: "Última página", exact: true });
  await expect(first).toBeDisabled();
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText("2");
  await expect(first).not.toBeDisabled();
  await next.click();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText("3");
  await expect(next).toBeDisabled();
  await expect(last).toBeDisabled();
  await first.click();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText("1");
  await last.click();
  await previous.click();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText("2");
  expect(await pagination.locator('[aria-current="page"]').evaluate(link => {
    const style = getComputedStyle(link);
    return style.color !== style.backgroundColor;
  })).toBe(true);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const bounds = await pagination.evaluate(nav => {
      const box = nav.getBoundingClientRect();
      const start = nav.firstElementChild.getBoundingClientRect();
      const end = nav.lastElementChild.getBoundingClientRect();
      return { offset: Math.abs((start.left + end.right - box.left - box.right) / 2), wrapped: start.top !== end.top };
    });
    expect(bounds.offset).toBeLessThan(1);
    expect(bounds.wrapped).toBe(false);
  }
  await page.locator("#table").screenshot({ path: testInfo.outputPath("pagination-mobile.png") });
});

test("e-mail atualiza erro, sucesso e borda durante a digitação", async ({ page }) => {
  const input = page.getByLabel("Exemplo de erro", { exact: true });
  const feedback = page.locator("#validation-email-error");
  const stateColor = async (token) => page.evaluate(token => {
    const probe = document.createElement("span");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
  for (const theme of ["light", "dark"]) {
    await page.locator("#theme-control").selectOption(theme);
    await input.fill("email-inválido");
    await input.hover();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(feedback).toHaveText("Informe um endereço de e-mail válido.");
    await expect(input).toHaveCSS("border-top-color", await stateColor("--gtc-color-error"));
    await input.fill("pessoa@exemplo.com");
    await expect(input).toHaveAttribute("aria-invalid", "false");
    await expect(input).toHaveAttribute("data-gtc-valid", "true");
    await expect(feedback).toHaveText("E-mail válido.");
    await expect(input).toHaveCSS("border-top-color", await stateColor("--gtc-color-success"));
    await input.fill("");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(feedback).toHaveText("Informe um endereço de e-mail.");
  }
});

test("reduced motion desativa animação do Toast", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Notificar sucesso" }).click();
  await expect(page.locator(".gtc-toast")).toHaveCSS("animation-name", "none");
});
