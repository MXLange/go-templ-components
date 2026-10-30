(() => {
  "use strict";
  const html = document.documentElement;
  const theme = document.getElementById("theme-control");
  const density = document.getElementById("density-control");
  function applyTheme(value) {
    if (value === "system") html.removeAttribute("data-gtc-theme");
    else html.dataset.gtcTheme = value;
  }
  try {
    const savedTheme = localStorage.getItem("gtc-catalog-theme");
    const savedDensity = localStorage.getItem("gtc-catalog-density");
    if (["light", "dark", "system"].includes(savedTheme)) theme.value = savedTheme;
    if (["compact", "comfortable"].includes(savedDensity)) density.value = savedDensity;
  } catch { /* O catálogo funciona quando o storage está indisponível. */ }
  applyTheme(theme.value);
  html.dataset.gtcDensity = density.value;
  theme.addEventListener("change", () => {
    applyTheme(theme.value);
    try { localStorage.setItem("gtc-catalog-theme", theme.value); } catch {}
  });
  density.addEventListener("change", () => {
    html.dataset.gtcDensity = density.value;
    try { localStorage.setItem("gtc-catalog-density", density.value); } catch {}
  });
  const cssEditor = document.getElementById("css-editor");
  const previewStyle = document.createElement("style");
  previewStyle.id = "catalog-custom-css";
  document.head.append(previewStyle);
  function applyCSS() {
    previewStyle.textContent = cssEditor.value;
  }
  cssEditor.addEventListener("input", applyCSS);
  document.getElementById("css-reset").addEventListener("click", () => {
    cssEditor.value = cssEditor.defaultValue;
    applyCSS();
  });
  applyCSS();
  document.querySelectorAll("[data-demo-email]").forEach(input => {
    const feedback = document.getElementById(`${input.id}-error`);
    feedback.setAttribute("aria-live", "polite");
    input.addEventListener("input", () => {
      const valid = input.validity.valid;
      input.setAttribute("aria-invalid", String(!valid));
      input.dataset.gtcValid = String(valid);
      feedback.className = valid ? "gtc-field-success" : "gtc-field-error";
      const message = valid ? "E-mail válido." : input.validity.valueMissing
        ? "Informe um endereço de e-mail." : "Informe um endereço de e-mail válido.";
      if (feedback.textContent !== message) feedback.textContent = message;
    });
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-demo-toast]");
    if (!button) return;
    const tone = button.dataset.demoToast;
    window.GTC.toast(tone === "success" ? "As alterações foram salvas." : "Falha ao salvar. Tente novamente.", { tone });
  });
  document.addEventListener("gtc:dropdown-select", event => {
    document.getElementById("dropdown-result").textContent = `Ação selecionada: ${event.detail.value}.`;
  });
})();
