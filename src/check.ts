import "./styles.css";
import { CONFIG as C } from "./config";
import * as D from "./detect";
import * as L from "./links";
import { $, copyWithFeedback } from "./dom";

type Cell = string | number | null | undefined | Node;
type Row = [label: string, value: Cell, cls?: string];

interface UAData {
  mobile: boolean;
  platform: string;
  brands?: { brand: string; version: string }[];
}


const params = new URLSearchParams(location.search);
const uaOverride = params.get("ua");
const framed = D.isFramed(window);
let env: D.Env;

// The handoff page lives at "/", so resolve as if we were there (keeps ?to= and UTMs).
let target = L.resolveTarget({ search: location.search, pathname: "/" }, C);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, text?: string | null): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function yn(v: boolean): HTMLSpanElement { return el("span", v ? "yes" : "no", v ? "Yes" : "No"); }

function fillTable(id: string, rows: Row[]) {
  const t = $(id);
  t.innerHTML = "";
  rows.forEach((r) => {
    const tr = el("tr");
    tr.appendChild(el("th", null, r[0]));
    const td = el("td", r[2] || null);
    const v = r[1];
    if (v instanceof Node) td.appendChild(v);
    else td.textContent = v == null || v === "" ? "—" : String(v);
    tr.appendChild(td);
    t.appendChild(tr);
  });
}

function storageOk(): boolean {
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return true; } catch { return false; }
}

function uaData() {
  const d = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (!d) return null;
  return {
    mobile: d.mobile,
    platform: d.platform,
    brands: (d.brands || []).map((b) => b.brand + " " + b.version).join(", ")
  };
}

function renderVerdict() {
  const d = D.decide(env, C, { preview: false, framed });
  const box = $("verdict");
  box.className = "verdict " + d.action;
  $("verdictValue").textContent = d.action === "redirect" ? "Redirect straight to the app" : "Show the wallet picker";
  $("verdictWhy").textContent = d.text + (uaOverride ? " (Simulated user agent.)" : "");
}

function renderEnv() {
  fillTable("envTable", [
    ["Summary", D.summary(env)],
    ["Device type", env.device.type + " (" + env.device.model + ")"],
    ["Phone or tablet", yn(env.device.handheld)],
    ["OS", env.os.name + (env.os.version ? " " + env.os.version : "")],
    ["Browser", env.browser.name + (env.browser.version ? " " + env.browser.version : "")],
    ["Engine", env.browser.engine],
    ["Embedded webview", yn(env.browser.webview)],
    ["In-app browser", env.inApp ? env.inApp.name : "None detected"],
    ["Wallet browser (from UA)", env.walletUA ? D.WALLET_NAMES[env.walletUA] : "None"],
    ["Installed as app (PWA)", yn(env.standalone)],
    ["Inside a frame", yn(framed)],
    ["iPad with desktop UA", yn(!!env.os.ipadDesktopUA)]
  ]);
}

function renderWallets() {
  const w = env.wallet;
  const rows: Row[] = [["Injected wallet", yn(w.injected)]];
  if (!w.providers.length) rows.push(["Providers", w.scanned ? "None found" : "Scanning…"]);
  w.providers.forEach((p) => {
    rows.push([p.source, p.name + (p.rdns ? " (" + p.rdns + ")" : "")]);
  });
  fillTable("walletTable", rows);
}

function renderRaw() {
  const d = uaData();
  fillTable("rawTable", [
    ["User agent", navigator.userAgent, "mono"],
    ["Simulated UA", uaOverride || "—", "mono"],
    ["UA-CH platform", d ? d.platform : "Not supported"],
    ["UA-CH mobile", d ? String(d.mobile) : "Not supported"],
    ["UA-CH brands", d ? d.brands : "Not supported"],
    ["Touch points", navigator.maxTouchPoints || 0],
    ["Screen", screen.width + " × " + screen.height + " @" + (window.devicePixelRatio || 1) + "x"],
    ["Viewport", window.innerWidth + " × " + window.innerHeight],
    ["Language", navigator.language],
    ["Time zone", (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone],
    ["localStorage", yn(storageOk())],
    ["Clipboard API", yn(!!(navigator.clipboard && navigator.clipboard.writeText))],
    ["Referrer", document.referrer || "—", "mono"]
  ]);
}

interface LinkRowOpts {
  tag?: string;
  tagWarn?: boolean;
  note?: string | null;
}

function linkRow(name: string, href: string, opts: LinkRowOpts = {}): HTMLDivElement {
  const row = el("div", "link-row");
  const top = el("div", "top");
  const n = el("span", "name", name);
  if (opts.tag) n.appendChild(el("span", "tag" + (opts.tagWarn ? " warn" : ""), opts.tag));
  top.appendChild(n);

  const copy = el("button", "btn btn-subtle btn-sm", "Copy");
  copy.type = "button";
  copy.addEventListener("click", () => { copyWithFeedback(href, copy, "Copy", 1500); });
  top.appendChild(copy);

  const open = el("a", "btn btn-subtle btn-sm", "Open");
  open.href = href;
  if (framed) { open.target = "_blank"; open.rel = "noopener"; }
  top.appendChild(open);

  row.appendChild(top);
  if (opts.note) row.appendChild(el("div", "note", opts.note));
  row.appendChild(el("div", "href", href));
  return row;
}

function renderLinks() {
  const box = $("walletLinks");
  box.innerHTML = "";
  L.walletLinks(target).forEach((w) => {
    const inPicker = C.wallets.indexOf(w.id) !== -1;
    box.appendChild(linkRow(w.name, w.href, {
      tag: w.status === "confirmed" ? "Confirmed" : "Needs testing",
      tagWarn: w.status !== "confirmed",
      note: inPicker ? null : "Not shown in the picker (not in config.wallets)."
    }));
  });
  L.variantLinks(target).forEach((v) => {
    box.appendChild(linkRow(v.label, v.href, { tag: "Variant", tagWarn: true, note: v.note }));
  });

  const esc = $("escapeLinks");
  esc.innerHTML = "";
  L.escapeLinks(target, null).forEach((e) => {
    const relevant = e.os === env.os.family;
    esc.appendChild(linkRow(e.label, e.href, {
      tag: relevant ? "This device" : e.os === "ios" ? "iOS only" : "Android only",
      tagWarn: !relevant,
      note: e.note
    }));
  });

  $<HTMLInputElement>("targetInput").value = target;
  $<HTMLAnchorElement>("previewLink").href = "/" + location.search.replace(/^\?/, "?preview=1&").replace(/^$/, "?preview=1");
}

function report(): string {
  return JSON.stringify({
    at: new Date().toISOString(),
    page: location.href,
    target,
    decision: D.decide(env, C, { framed }),
    env,
    framed,
    uaData: uaData(),
    screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio, vw: window.innerWidth, vh: window.innerHeight },
    touchPoints: navigator.maxTouchPoints || 0
  }, null, 2);
}

$("copyReport").addEventListener("click", function (this: HTMLElement) {
  copyWithFeedback(report(), this.querySelector("span")!, "Copy report");
});

$("targetApply").addEventListener("click", () => {
  const note = $("targetNote");
  let u: URL | null;
  try { u = new URL($<HTMLInputElement>("targetInput").value.trim()); } catch { u = null; }
  if (!u) { note.textContent = "That isn't a valid URL."; return; }
  target = u.toString();
  note.textContent = L.isAllowed(u, C)
    ? "Links rebuilt for this URL."
    : "Links rebuilt, but this host isn't in allowedHosts, so ?to= would reject it on the handoff page.";
  renderLinks();
});

function run() {
  env = D.current(window, uaOverride);
  renderVerdict();
  renderEnv();
  renderWallets();
  renderRaw();
  D.scanProviders(window, C.providerScanMs, (wallet) => {
    env.wallet = wallet;
    renderVerdict();
    renderWallets();
  });
}

$("rescan").addEventListener("click", run);
run();
renderLinks();
