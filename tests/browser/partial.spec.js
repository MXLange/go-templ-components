const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.GTC));
});

function partialRegion(page) {
  return page.locator("#partial-projects");
}

function partialPage(page) {
  return partialRegion(page).locator('[aria-current="page"]');
}

test("paginação parcial usa o header, preserva o documento e move o foco", async ({ page }) => {
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Preservado");
  await page.evaluate(() => {
    window.originalRegion = document.getElementById("partial-projects");
    window.originalTable = document.getElementById("table");
    window.partialEvents = [];
    ["start", "success", "error"].forEach(name => document.addEventListener(`gtc:request-${name}`, event => {
      window.partialEvents.push({ name, ...event.detail });
    }));
  });
  const requestPromise = page.waitForRequest(request => request.headers()["x-gtc-partial"] === "partial-projects");
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  const request = await requestPromise;
  expect(request.headers().accept).toBe("text/html");
  await expect(partialPage(page)).toHaveText("2");
  await expect(partialRegion(page)).toHaveAttribute("aria-busy", "false");
  await expect(partialRegion(page)).toBeFocused();
  await expect(page).toHaveURL(/partialPage=2/);
  await expect(page.getByLabel("Nome do projeto", { exact: true })).toHaveValue("Preservado");
  expect(await page.evaluate(() => window.originalRegion === document.getElementById("partial-projects") && window.originalTable === document.getElementById("table"))).toBe(true);
  const events = await page.evaluate(() => window.partialEvents);
  expect(events.map(event => event.name)).toEqual(["start", "success"]);
  expect(events[1]).toMatchObject({ status: 200, targetID: "partial-projects" });
});

test("Link reutiliza o transporte e a paginação mantém os limites", async ({ page }) => {
  const region = partialRegion(page);
  await region.getByRole("link", { name: "Abrir página 4 sem recarregar" }).click();
  await expect(partialPage(page)).toHaveText("4");
  await region.getByRole("link", { name: "Última página", exact: true }).click();
  await expect(partialPage(page)).toHaveText("5");
  await expect(region.getByRole("link", { name: "Próxima página", exact: true })).toBeDisabled();
  await region.getByRole("link", { name: "Primeira página", exact: true }).click();
  await expect(partialPage(page)).toHaveText("1");
  await expect(region.getByRole("link", { name: "Página anterior", exact: true })).toBeDisabled();
});

test("History false atualiza somente a região", async ({ page }) => {
  const initial = await page.evaluate(() => ({ url: location.href, length: history.length }));
  await page.evaluate(() => {
    document.querySelectorAll('[data-gtc-partial="partial-projects"]').forEach(node => node.dataset.gtcHistory = "false");
  });
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await expect(partialPage(page)).toHaveText("2");
  expect(await page.evaluate(() => ({ url: location.href, length: history.length }))).toEqual(initial);
});

test("histórico restaura fragmentos com Voltar e Avançar e preserva state externo", async ({ page }) => {
  await page.evaluate(() => {
    history.replaceState({ ...history.state, application: { filter: "active" } }, "");
    window.documentMarker = true;
  });
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await expect(partialPage(page)).toHaveText("2");
  await partialRegion(page).getByRole("link", { name: "Abrir página 4 sem recarregar" }).click();
  await expect(partialPage(page)).toHaveText("4");
  await page.goBack();
  await expect(partialPage(page)).toHaveText("2");
  await page.goBack();
  await expect(partialPage(page)).toHaveText("1");
  await page.goForward();
  await expect(partialPage(page)).toHaveText("2");
  expect(await page.evaluate(() => window.documentMarker)).toBe(true);
  expect(await page.evaluate(() => history.state.application)).toEqual({ filter: "active" });
});

test("falha HTTP preserva conteúdo e permite tentar novamente", async ({ page }) => {
  const region = partialRegion(page);
  const original = await region.innerHTML();
  const originalURL = page.url();
  await page.route("**/*", route => route.request().headers()["x-gtc-partial"]
    ? route.fulfill({ status: 503, contentType: "text/html", body: "Indisponível" }) : route.continue());
  await region.getByRole("link", { name: "2", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Não foi possível carregar o conteúdo. Tente novamente.");
  await expect(region).toHaveAttribute("aria-busy", "false");
  expect(await region.innerHTML()).toBe(original);
  expect(page.url()).toBe(originalURL);
  await page.unroute("**/*");
  await region.getByRole("link", { name: "2", exact: true }).click();
  await expect(partialPage(page)).toHaveText("2");
  await expect(page.locator(".gtc-request-status")).not.toBeVisible();
});

for (const failure of ["network", "document", "json"]) {
  test(`resposta inválida (${failure}) não substitui a região`, async ({ page }) => {
    await page.route("**/*", route => {
      if (!route.request().headers()["x-gtc-partial"]) return route.continue();
      if (failure === "network") return route.abort("failed");
      return route.fulfill({ status: 200, contentType: failure === "json" ? "application/json" : "text/html",
        body: failure === "json" ? '{"page":2}' : "<!doctype html><html><body>Página completa</body></html>" });
    });
    await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(partialPage(page)).toHaveText("1");
    await expect(partialRegion(page)).toHaveAttribute("aria-busy", "false");
  });
}

test("cliques rápidos aplicam somente a resposta mais recente", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().headers()["x-gtc-partial"] && new URL(route.request().url()).searchParams.get("partialPage") === "2") {
      await gate;
    }
    await route.continue().catch(() => {});
  });
  const started = page.waitForRequest(request => request.headers()["x-gtc-partial"] && request.url().includes("partialPage=2"));
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await started;
  await expect(partialRegion(page)).toHaveAttribute("aria-busy", "true");
  await partialRegion(page).getByRole("link", { name: "Abrir página 4 sem recarregar" }).click();
  await expect(partialPage(page)).toHaveText("4");
  release();
  await expect(partialRegion(page)).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/partialPage=4/);
});

test("componentes recebidos no fragmento inicializam as interações", async ({ page }) => {
  const tabsHTML = await page.locator("#project-tabs").evaluate(node => node.outerHTML.replaceAll("project-tabs", "loaded-tabs"));
  await page.route("**/*", route => route.request().headers()["x-gtc-partial"]
    ? route.fulfill({ status: 200, contentType: "text/html", body: tabsHTML }) : route.continue());
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  const tabs = page.locator("#loaded-tabs");
  await tabs.getByRole("tab", { name: "Atividade", exact: true }).click();
  await expect(tabs.getByRole("tabpanel", { name: "Atividade" })).toBeVisible();
});

test("regiões independentes não cancelam suas requisições", async ({ page }) => {
  await page.evaluate(() => {
    const region = document.createElement("div");
    region.id = "secondary-projects";
    const link = document.querySelector("#partial-projects .gtc-link").cloneNode(true);
    link.dataset.gtcPartial = region.id;
    link.dataset.gtcHistory = "false";
    link.textContent = "Atualizar outra região";
    region.append(link);
    document.getElementById("partial-table").append(region);
  });
  await page.route("**/*", route => route.request().headers()["x-gtc-partial"] === "secondary-projects"
    ? route.fulfill({ status: 200, contentType: "text/html", body: "<p>Outra região atualizada</p>" }) : route.continue());
  await page.getByRole("link", { name: "Atualizar outra região" }).click();
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await expect(page.locator("#secondary-projects")).toHaveText("Outra região atualizada");
  await expect(partialPage(page)).toHaveText("2");
});

test("histórico restaura cada região de forma independente", async ({ page }) => {
  await page.evaluate(() => {
    const region = document.createElement("div");
    region.id = "secondary-projects";
    const link = document.querySelector("#partial-projects .gtc-link").cloneNode(true);
    link.dataset.gtcPartial = region.id;
    link.textContent = "Atualizar outra região";
    region.append(link);
    document.getElementById("partial-table").append(region);
    GTC.init(region);
  });
  await page.route("**/*", route => {
    if (route.request().headers()["x-gtc-partial"] !== "secondary-projects") return route.continue();
    const pageNumber = new URL(route.request().url()).searchParams.get("partialPage") || "1";
    return route.fulfill({ status: 200, contentType: "text/html", body: `<p>Outra região: ${pageNumber}</p>` });
  });
  await page.getByRole("link", { name: "Atualizar outra região" }).click();
  await expect(page.locator("#secondary-projects")).toHaveText("Outra região: 4");
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await expect(partialPage(page)).toHaveText("2");
  await page.goBack();
  await expect(partialPage(page)).toHaveText("1");
  await expect(page.locator("#secondary-projects")).toHaveText("Outra região: 4");
  await page.goBack();
  await expect(page.locator("#secondary-projects")).toHaveText("Outra região: 1");
  await expect(partialPage(page)).toHaveText("1");
});

test("Voltar cancela uma requisição pendente do histórico", async ({ page }) => {
  await partialRegion(page).getByRole("link", { name: "2", exact: true }).click();
  await expect(partialPage(page)).toHaveText("2");
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().headers()["x-gtc-partial"] && route.request().url().includes("partialPage=4")) await gate;
    await route.continue().catch(() => {});
  });
  const pending = page.waitForRequest(request => request.headers()["x-gtc-partial"] && request.url().includes("partialPage=4"));
  await partialRegion(page).getByRole("link", { name: "Abrir página 4 sem recarregar" }).click();
  await pending;
  await page.goBack();
  await expect(partialPage(page)).toHaveText("1");
  release();
  await expect(partialRegion(page)).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Ctrl/Cmd e target blank mantêm a navegação em outra aba", async ({ page, context }) => {
  const link = partialRegion(page).getByRole("link", { name: "Abrir página 4 sem recarregar" });
  for (const modifiers of [["ControlOrMeta"], []]) {
    if (!modifiers.length) await link.evaluate(node => node.target = "_blank");
    const popupPromise = context.waitForEvent("page");
    await link.click({ modifiers });
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await expect(popup.locator("h1")).toHaveText("Componentes para construir.");
    await expect(popup.locator("#partial-projects [aria-current=page]")).toHaveText("4");
    await popup.close();
    await expect(partialPage(page)).toHaveText("1");
  }
});

test("sem JavaScript, o link parcial abre a página completa", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:18080/");
  await partialRegion(page).getByRole("link", { name: "Abrir página 4 sem recarregar" }).click();
  await expect(page.locator("h1")).toHaveText("Componentes para construir.");
  await expect(partialPage(page)).toHaveText("4");
  await context.close();
});
