import "./styles.css";
import { CONFIG as C } from "./config";
import * as D from "./detect";
import * as L from "./links";
import * as A from "./analytics";
import type { AnalyticsProps } from "./detect";
import type { WalletLink } from "./links";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const params = new URLSearchParams(location.search);
const opts: D.DecideOptions = { preview: params.has("preview"), framed: D.isFramed(window) };
const target = L.resolveTarget(location, C);
const env = D.current(window);
let decision = D.decide(env, C, opts);
let viewTracked = false;

function track(event: string, extra?: AnalyticsProps) {
  A.track(event, { ...D.props(env), reason: decision.reason, ...extra });
}

function trackView() {
  if (viewTracked) return;
  viewTracked = true;
  track("wallet_handoff_view", { action: decision.action });
}

function go(url: string) {
  document.body.classList.remove("is-checking");
  document.body.classList.add("is-redirecting");
  location.replace(url);
}

// Fast path: desktop or an already-injected wallet redirect without waiting on the provider scan.
if (decision.action === "redirect") {
  trackView();
  go(target);
} else {
  render();
}

function render() {
  let lastUsed: string | null = null;
  try { lastUsed = localStorage.getItem(C.storageKey); } catch {}

  const wallets = L.walletLinks(target, C.wallets).sort((a, b) => Number(b.id === lastUsed) - Number(a.id === lastUsed));

  const list = $("walletList");
  const statusEl = $("status");
  const chev = '<svg class="chev" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  wallets.forEach((w) => {
    // Real <a href> links: iOS reliably opens apps only from a direct tap on a link.
    const a = document.createElement("a");
    a.href = w.href;
    a.className = "wallet";
    // Inside a frame the app handoff is blocked, so open a new tab instead.
    if (opts.framed) { a.target = "_blank"; a.rel = "noopener"; }
    a.setAttribute("role", "listitem");
    a.innerHTML =
      '<span class="mark" aria-hidden="true">' + w.icon + '</span>' +
      '<span class="wallet-text">' +
        '<span class="wallet-name">' + w.name + (w.id === lastUsed ? ' <span class="tag">Last used</span>' : '') + '</span>' +
        '<span class="wallet-sub" hidden></span>' +
      '</span>' + chev;
    a.addEventListener("click", () => onWalletTap(w, a));
    list.appendChild(a);
  });

  function setRowStatus(row: HTMLElement, text: string) {
    // Inline status in the tapped row; #status mirrors it for screen readers.
    list.querySelectorAll<HTMLElement>(".wallet-sub").forEach((s) => { s.hidden = true; s.textContent = ""; });
    const sub = row.querySelector<HTMLElement>(".wallet-sub")!;
    sub.textContent = text;
    sub.hidden = false;
    statusEl.textContent = text;
  }

  function onWalletTap(w: WalletLink, row: HTMLElement) {
    try { localStorage.setItem(C.storageKey, w.id); } catch {}
    track("wallet_handoff_clicked", { wallet: w.id });
    setRowStatus(row, "Opening " + w.name + "…");

    let left = false;
    const onHide = () => { if (document.hidden) left = true; };
    const onPageHide = () => { left = true; };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      if (!left) {
        setRowStatus(row, "Nothing opened? " + w.name + " may not be installed. Try another wallet or continue in your browser.");
        track("wallet_handoff_no_open", { wallet: w.id });
      }
    }, C.noOpenTimeoutMs);
  }

  const continueBtn = $<HTMLAnchorElement>("continueBtn");
  continueBtn.href = target;
  continueBtn.addEventListener("click", () => track("wallet_handoff_continue"));

  const copyBtn = $<HTMLButtonElement>("copyBtn");
  copyBtn.addEventListener("click", () => {
    const label = copyBtn.querySelector("span")!;
    function done(ok: boolean) {
      label.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => { label.textContent = "Copy link"; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(target).then(() => done(true), () => done(false));
    } else {
      const t = document.createElement("textarea");
      t.value = target;
      document.body.appendChild(t);
      t.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      document.body.removeChild(t);
      done(ok);
    }
    track("wallet_handoff_copy");
  });

  function renderInAppNotice() {
    const n = $("inAppNotice");
    if (!env.inApp) { n.classList.remove("show"); return; }
    const ios = env.os.family === "ios";
    const how = ios ? "tap the share or ⋯ button and choose Open in Safari" : "tap ⋮ and choose Open in browser";
    n.innerHTML = "<strong>You're inside the " + env.inApp.name + " app.</strong> Wallet links sometimes get blocked here. If a wallet doesn't open, " + how + " first.";

    const escapes = L.escapeLinks(target, env.os.family).slice(0, 1);
    if (escapes.length) {
      const row = document.createElement("div");
      row.className = "escape";
      escapes.forEach((e) => {
        const a = document.createElement("a");
        a.href = e.href;
        a.textContent = e.label;
        a.addEventListener("click", () => track("wallet_handoff_escape", { escape: e.id }));
        row.appendChild(a);
      });
      n.appendChild(row);
    }
    n.classList.add("show");
  }

  function renderEnvLine() {
    const el = $("envLine");
    el.textContent = "Detected: " + D.summary(env) + " · ";
    const a = document.createElement("a");
    a.href = "/check/" + location.search;
    a.textContent = "details";
    el.appendChild(a);
  }

  if (opts.preview || opts.framed) $("previewNote").classList.add("show");
  renderInAppNotice();
  renderEnvLine();

  // ---------- Routing: wait briefly for EIP-6963 wallets, then decide ----------
  D.scanProviders(window, C.providerScanMs, (wallet) => {
    env.wallet = wallet;
    decision = D.decide(env, C, opts);
    trackView();
    if (decision.action === "redirect") return go(target);
    renderEnvLine();
    document.body.classList.remove("is-checking");
  });
}
