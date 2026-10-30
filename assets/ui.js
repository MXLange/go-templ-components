/* API pública: window.GTC.init(root), toast(message, options), dismissToast(id). */
(() => {
  "use strict";
  if (window.GTC) return;
  const initialized = new WeakSet();
  const dialogs = new WeakMap();
  const toastTimers = new Map();
  const toastReturns = new WeakMap();
  let toastSequence = 0;
  const partialRequests = new Map();
  const requestStatuses = new WeakMap();
  const historyRegions = new Map();
  const sidebarModals = new Map();
  const mobileSidebar = window.matchMedia("(max-width: 800px)");

  function historyState() {
    return {
      ...history.state,
      gtcPartial: { regions: Object.fromEntries([...historyRegions].map(([id, region]) => [id, region.currentURL])) },
    };
  }

  function registerHistory(root) {
    const selector = '[data-gtc-partial][data-gtc-history="true"]';
    const nodes = [...root.querySelectorAll(selector)];
    if (root instanceof Element && root.matches(selector)) nodes.unshift(root);
    let changed = false;
    nodes.forEach(config => {
      const id = config.dataset.gtcPartial;
      if (historyRegions.has(id) || !document.getElementById(id)) return;
      historyRegions.set(id, { initialURL: location.href, currentURL: location.href });
      changed = true;
    });
    if (changed) history.replaceState(historyState(), "", location.href);
  }

  function requestStatus(target, message) {
    let status = requestStatuses.get(target);
    if (!status && message) {
      status = document.createElement("p");
      status.className = "gtc-request-status";
      status.setAttribute("role", "alert");
      status.dataset.gtcRequestStatus = target.id;
      target.after(status);
      requestStatuses.set(target, status);
    }
    if (status) {
      status.hidden = !message;
      status.textContent = message;
    }
  }

  async function requestPartial(target, url, historyAction = null) {
    partialRequests.get(target)?.controller.abort();
    const request = { controller: new AbortController(), historyAction };
    partialRequests.set(target, request);
    target.setAttribute("aria-busy", "true");
    target.setAttribute("data-gtc-partial-region", "");
    requestStatus(target, "");
    const detail = { url, targetID: target.id };
    emit(target, "request-start", detail);
    let status = 0;
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/html", "X-GTC-Partial": target.id },
        mode: "same-origin", credentials: "same-origin", signal: request.controller.signal,
      });
      status = response.status;
      if (!response.ok) throw new Error(`HTTP ${status}`);
      if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
        throw new Error("O servidor não retornou HTML.");
      }
      const source = await response.text();
      if (partialRequests.get(target) !== request || request.controller.signal.aborted || !target.isConnected) return;
      if (/<(?:!doctype|html|head|body)(?:\s|>)/i.test(source)) {
        throw new Error("O servidor retornou uma página completa em vez de um fragmento.");
      }
      const fragment = document.createElement("template");
      fragment.innerHTML = source;
      target.replaceChildren(fragment.content);
      if (historyAction && historyRegions.has(target.id)) {
        historyRegions.get(target.id).currentURL = url;
        if (historyAction === "push") history.pushState(historyState(), "", url);
      }
      init(target);
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      emit(target, "request-success", { ...detail, status });
    } catch (error) {
      if (request.controller.signal.aborted || partialRequests.get(target) !== request || !target.isConnected) return;
      const message = target.dataset.gtcRequestErrorMessage || "Não foi possível carregar o conteúdo. Tente novamente.";
      requestStatus(target, message);
      emit(target, "request-error", { ...detail, status, message, error: error.message });
    } finally {
      if (partialRequests.get(target) === request) {
        partialRequests.delete(target);
        target.setAttribute("aria-busy", "false");
      }
    }
  }

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    const config = link?.closest("[data-gtc-partial]");
    if (!config || link.hasAttribute("download") || link.getAttribute("aria-disabled") === "true") return;
    const linkTarget = link.getAttribute("target") || document.querySelector("base[target]")?.getAttribute("target");
    if (linkTarget && linkTarget.toLowerCase() !== "_self") return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !["http:", "https:"].includes(url.protocol)) return;
    if (link.getAttribute("href").startsWith("#")) return;
    const target = document.getElementById(config.dataset.gtcPartial);
    if (!target) return;
    event.preventDefault();
    target.dataset.gtcRequestErrorMessage = config.dataset.gtcRequestErrorMessage || "Não foi possível carregar o conteúdo. Tente novamente.";
    registerHistory(config);
    void requestPartial(target, url.href, config.dataset.gtcHistory === "true" ? "push" : null);
  });

  window.addEventListener("popstate", event => {
    const regions = event.state?.gtcPartial?.regions;
    if (!regions) return;
    historyRegions.forEach((region, id) => {
      const target = document.getElementById(id);
      if (!target) return;
      const pending = partialRequests.get(target);
      if (pending?.historyAction) pending.controller.abort();
      const url = regions[id] || region.initialURL;
      if (url !== region.currentURL) void requestPartial(target, url, "restore");
    });
  });

  function emit(element, name, detail) {
    element.dispatchEvent(new CustomEvent(`gtc:${name}`, { bubbles: true, detail }));
  }

  function menuItems(root) {
    return [...root.querySelectorAll('[role="menuitem"]')].filter(item => !item.disabled);
  }

  function closeMenu(root, restore = false) {
    const trigger = root.querySelector("[data-gtc-dropdown-trigger]");
    const menu = root.querySelector("[data-gtc-dropdown-menu]");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restore) trigger.focus();
    emit(root, "dropdown-change", { open: false });
  }

  function openMenu(root, last = false) {
    document.querySelectorAll("[data-gtc-dropdown]").forEach(other => {
      if (other !== root) closeMenu(other);
    });
    const trigger = root.querySelector("[data-gtc-dropdown-trigger]");
    if (trigger.disabled) return;
    root.querySelector("[data-gtc-dropdown-menu]").hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const items = menuItems(root);
    (last ? items.at(-1) : items[0])?.focus();
    emit(root, "dropdown-change", { open: true });
  }

  function initDropdown(root) {
    const trigger = root.querySelector("[data-gtc-dropdown-trigger]");
    trigger.addEventListener("click", () => {
      if (trigger.getAttribute("aria-expanded") === "true") closeMenu(root, true);
      else openMenu(root);
    });
    root.addEventListener("keydown", event => {
      const keys = ["ArrowDown", "ArrowUp", "Home", "End", "Escape"];
      if (event.key === "Tab") { closeMenu(root, true); return; }
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") { closeMenu(root, true); return; }
      if (trigger.getAttribute("aria-expanded") !== "true") {
        openMenu(root, event.key === "ArrowUp" || event.key === "End");
        return;
      }
      const items = menuItems(root);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    });
    root.addEventListener("click", event => {
      const item = event.target.closest("[data-gtc-dropdown-item]");
      if (!item || item.disabled) return;
      emit(root, "dropdown-select", { value: item.dataset.gtcDropdownItem });
      closeMenu(root, true);
    });
    root.addEventListener("focusout", event => {
      if (!root.contains(event.relatedTarget)) closeMenu(root);
    });
  }

  function initTabs(root) {
    const tabs = [...root.querySelectorAll('[role="tab"]')].filter(tab => tab.closest("[data-gtc-tabs]") === root);
    function activate(tab, focus = true) {
      if (tab.disabled) return;
      tabs.forEach(other => {
        const selected = other === tab;
        other.setAttribute("aria-selected", String(selected));
        other.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(other.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
      emit(root, "tabs-change", { index: tabs.indexOf(tab), id: tab.id });
    }
    tabs.forEach(tab => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const available = tabs.filter(item => !item.disabled);
        const index = available.indexOf(tab);
        const rtl = getComputedStyle(root).direction === "rtl";
        const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const next = event.key === "Home" ? 0 : event.key === "End" ? available.length - 1
          : (index + (forward ? 1 : -1) + available.length) % available.length;
        activate(available[next]);
      });
    });
  }

  function syncSidebar(sidebar) {
    const expanded = sidebar.dataset.gtcCollapsed !== "true";
    sidebar.inert = !expanded;
    document.querySelectorAll("[data-gtc-sidebar-toggle]").forEach(trigger => {
      if (trigger.dataset.gtcSidebarToggle === sidebar.id) trigger.setAttribute("aria-expanded", String(expanded));
    });
  }

  function trapFocus(event, element) {
    if (event.key !== "Tab") return;
    const focusable = [...element.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && !node.closest("[inert]"));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  function syncScrollLock() {
    document.documentElement.toggleAttribute("data-gtc-sidebar-modal-open", Boolean(document.querySelector(".gtc-sidebar-modal[open]")));
  }

  function initSidebar(sidebar) {
    if (sidebar.dataset.gtcMobileModal !== "true") { syncSidebar(sidebar); return; }
    const marker = document.createComment("gtc-sidebar-position");
    sidebar.before(marker);
    const dialog = document.createElement("dialog");
    dialog.className = "gtc-sidebar-modal";
    dialog.setAttribute("aria-label", sidebar.getAttribute("aria-label"));
    const header = document.createElement("div");
    header.className = "gtc-sidebar-modal-header";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "gtc-button";
    close.dataset.gtcVariant = "ghost";
    close.setAttribute("aria-label", sidebar.dataset.gtcSidebarCloseLabel || "Fechar navegação");
    close.textContent = "×";
    header.append(close);
    dialog.append(header);
    marker.after(dialog);
    const state = { dialog, marker, mobile: null, trigger: null, ignoreClose: 0, desktopCollapsed: sidebar.dataset.gtcCollapsed };
    sidebarModals.set(sidebar, state);
    dialog.addEventListener("keydown", event => trapFocus(event, dialog));
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      syncScrollLock();
      if (state.ignoreClose > 0) { state.ignoreClose--; return; }
      sidebar.dataset.gtcCollapsed = "true";
      syncSidebar(sidebar);
      requestAnimationFrame(() => {
        if (!dialog.open && state.trigger?.isConnected) state.trigger.focus({ preventScroll: true });
      });
      emit(sidebar, "sidebar-change", { expanded: false });
    });
    state.onNavigate = event => {
      if (state.mobile && dialog.open && event.target instanceof Element && event.target.closest("a[href]")
        && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) dialog.close();
    };
    sidebar.addEventListener("click", state.onNavigate);
    state.updateViewport = () => {
      if (state.mobile === mobileSidebar.matches) return;
      state.mobile = mobileSidebar.matches;
      if (state.mobile) {
        state.desktopCollapsed = sidebar.dataset.gtcCollapsed;
        dialog.append(sidebar);
        sidebar.dataset.gtcCollapsed = "true";
      } else {
        if (dialog.open) { state.ignoreClose++; dialog.close(); }
        marker.after(sidebar);
        sidebar.dataset.gtcCollapsed = state.desktopCollapsed;
      }
      syncSidebar(sidebar);
      syncScrollLock();
    };
    mobileSidebar.addEventListener("change", state.updateViewport);
    state.updateViewport();
  }

  function toggleSidebar(sidebar, trigger) {
    const state = sidebarModals.get(sidebar);
    if (state?.mobile) {
      if (state.dialog.open) { state.dialog.close(); return; }
      state.trigger = trigger;
      sidebar.dataset.gtcCollapsed = "false";
      syncSidebar(sidebar);
      state.dialog.showModal();
      syncScrollLock();
      emit(sidebar, "sidebar-change", { expanded: true });
      return;
    }
    sidebar.dataset.gtcCollapsed = String(sidebar.dataset.gtcCollapsed !== "true");
    syncSidebar(sidebar);
    emit(sidebar, "sidebar-change", { expanded: sidebar.dataset.gtcCollapsed !== "true" });
  }

  function init(root = document) {
    const selector = "[data-gtc-dropdown], [data-gtc-tabs], [data-gtc-dialog], [data-gtc-sidebar], [data-gtc-sidebar-toggle]";
    const nodes = [...root.querySelectorAll(selector)];
    if (root instanceof Element && root.matches(selector)) nodes.unshift(root);
    nodes.forEach(element => {
      if (initialized.has(element)) return;
      initialized.add(element);
      if (element.hasAttribute("data-gtc-dropdown")) initDropdown(element);
      if (element.hasAttribute("data-gtc-tabs")) initTabs(element);
      if (element.hasAttribute("data-gtc-sidebar")) initSidebar(element);
      if (element.hasAttribute("data-gtc-sidebar-toggle")) {
        const sidebar = document.getElementById(element.dataset.gtcSidebarToggle);
        if (sidebar) syncSidebar(sidebar);
      }
      if (element.hasAttribute("data-gtc-dialog")) {
        element.addEventListener("keydown", event => trapFocus(event, element));
        element.addEventListener("close", () => {
          const trigger = dialogs.get(element);
          if (trigger?.isConnected) trigger.focus();
          dialogs.delete(element);
          emit(element, "dialog-change", { open: false });
        });
      }
    });
    registerHistory(root);
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const opener = event.target.closest("[data-gtc-dialog-open]");
    if (opener && !opener.disabled) {
      const dialog = document.getElementById(opener.dataset.gtcDialogOpen);
      if (dialog?.matches("dialog[data-gtc-dialog]") && !dialog.open) {
        dialogs.set(dialog, opener);
        dialog.showModal();
        emit(dialog, "dialog-change", { open: true });
      }
    }
    const closer = event.target.closest("[data-gtc-dialog-close]");
    if (closer) closer.closest("dialog")?.close();
    const toggle = event.target.closest("[data-gtc-sidebar-toggle]");
    if (toggle && !toggle.disabled) {
      const sidebar = document.getElementById(toggle.dataset.gtcSidebarToggle);
      if (sidebar) toggleSidebar(sidebar, toggle);
    }
    document.querySelectorAll("[data-gtc-dropdown]").forEach(root => {
      if (!root.contains(event.target)) closeMenu(root);
    });
    const closeToast = event.target.closest("[data-gtc-toast-close]");
    if (closeToast) dismissToast(closeToast.closest("[data-gtc-toast]")?.id);
  });

  function toast(message, { tone = "neutral", duration = 0, region, closeLabel } = {}) {
    const target = region ? document.getElementById(region) : document.querySelector("[data-gtc-toasts]");
    if (!target?.matches("[data-gtc-toasts]")) throw new Error("GTC: região Toast não encontrada");
    const node = document.createElement("div");
    node.id = `gtc-toast-${++toastSequence}`;
    node.className = "gtc-toast";
    node.dataset.gtcToast = "";
    node.dataset.gtcTone = tone;
    const text = document.createElement("span");
    text.textContent = String(message);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "gtc-toast-close";
    close.dataset.gtcToastClose = "";
    close.setAttribute("aria-label", closeLabel || target.dataset.gtcToastCloseLabel || "Dispensar notificação");
    close.textContent = "×";
    node.append(text, close);
    toastReturns.set(node, document.activeElement);
    target.querySelector("[data-gtc-toast-list]").append(node);
    const announcer = target.querySelector("[data-gtc-toast-announcer]");
    announcer.textContent = "";
    requestAnimationFrame(() => { announcer.textContent = String(message); });
    if (duration > 0) {
      const schedule = () => {
        clearTimeout(toastTimers.get(node.id));
        toastTimers.set(node.id, setTimeout(() => dismissToast(node.id), duration));
      };
      const pause = () => clearTimeout(toastTimers.get(node.id));
      node.addEventListener("mouseenter", pause);
      node.addEventListener("focusin", pause);
      node.addEventListener("mouseleave", () => { if (!node.contains(document.activeElement)) schedule(); });
      node.addEventListener("focusout", () => { if (!node.matches(":hover")) schedule(); });
      schedule();
    }
    emit(target, "toast-show", { id: node.id, message: String(message), tone });
    return node.id;
  }

  function dismissToast(id) {
    const node = document.getElementById(id);
    if (!node?.hasAttribute("data-gtc-toast")) return;
    if (node.contains(document.activeElement)) {
      const origin = toastReturns.get(node);
      if (origin?.isConnected) origin.focus();
    }
    clearTimeout(toastTimers.get(id));
    toastTimers.delete(id);
    emit(node, "toast-dismiss", { id });
    node.remove();
  }

  window.GTC = Object.freeze({ init, toast, dismissToast });
  function start() {
    init();
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof Element) init(node);
      }));
      for (const id of toastTimers.keys()) {
        if (!document.getElementById(id)) {
          clearTimeout(toastTimers.get(id));
          toastTimers.delete(id);
        }
      }
      for (const [target, request] of partialRequests) {
        if (!target.isConnected) {
          request.controller.abort();
          partialRequests.delete(target);
        }
      }
      for (const [sidebar, state] of sidebarModals) {
        if (!sidebar.isConnected) {
          mobileSidebar.removeEventListener("change", state.updateViewport);
          sidebar.removeEventListener("click", state.onNavigate);
          state.dialog.remove();
          state.marker.remove();
          sidebarModals.delete(sidebar);
          initialized.delete(sidebar);
          syncScrollLock();
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
