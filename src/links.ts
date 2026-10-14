// Target URL resolution and deep link builders.
import type { HandoffConfig } from "./config";
import type { OSFamily } from "./detect";
import { WALLET_ICONS } from "./wallet-icons";

export type TargetConfig = Pick<HandoffConfig, "defaultTarget" | "allowedHosts" | "pathPassthrough">;

/** Anything with `search` and `pathname` (window.location, or a plain object in tests). */
export interface LocationLike {
  search?: string;
  pathname?: string;
}

export interface WalletDef {
  name: string;
  /** "confirmed" = verified on a real device; "untested" = widely used format, needs device testing. */
  status: "confirmed" | "untested";
  build: (target: string) => string;
}

export interface WalletLink {
  id: string;
  name: string;
  icon: string;
  status: WalletDef["status"];
  href: string;
}

export interface VariantLink {
  id: string;
  wallet: string;
  label: string;
  note: string;
  href: string;
}

export interface EscapeLink {
  id: string;
  os: "ios" | "android";
  label: string;
  note: string;
  href: string;
}

// Query params used by this site that should not be forwarded to the app.
const RESERVED = ["to", "preview", "ua"];

export function isAllowed(u: URL, cfg: Pick<HandoffConfig, "allowedHosts">): boolean {
  const host = u.hostname;
  return u.protocol === "https:" && cfg.allowedHosts.some((h) => host === h || host.slice(-(h.length + 1)) === "." + h);
}

/** Resolve where the visitor should end up, keeping UTMs and referral codes. */
export function resolveTarget(loc: LocationLike, cfg: TargetConfig): string {
  const params = new URLSearchParams(loc.search || "");
  const def = new URL(cfg.defaultTarget);
  let u: URL | null = null;

  const to = params.get("to");
  if (to) {
    try { u = new URL(to); } catch { u = null; }
    if (u && !isAllowed(u, cfg)) u = null;
  }

  if (!u) {
    u = new URL(def.toString());
    const path = loc.pathname || "/";
    if (cfg.pathPassthrough && path !== "/" && path !== "/index.html") {
      u.pathname = def.pathname.replace(/\/$/, "") + path;
    }
  }

  // Params already on the target win; everything else (including repeated keys) is appended.
  const out = u;
  const existing = new Set(out.searchParams.keys());
  params.forEach((v, k) => {
    if (RESERVED.indexOf(k) === -1 && !existing.has(k)) out.searchParams.append(k, v);
  });
  return out.toString();
}

const enc = (t: string) => encodeURIComponent(t);
const bare = (t: string) => t.replace(/^https?:\/\//, "");
function noHash(t: string): string { const u = new URL(t); u.hash = ""; return u.toString(); }

export const WALLETS: Record<string, WalletDef> = {
  metamask: {
    name: "MetaMask", status: "confirmed",
    build: (t) => "https://link.metamask.io/dapp/" + bare(t)
  },
  coinbase: {
    name: "Coinbase Wallet", status: "untested",
    build: (t) => "https://go.cb-w.com/dapp?cb_url=" + enc(t)
  },
  trust: {
    name: "Trust Wallet", status: "untested",
    build: (t) => "https://link.trustwallet.com/open_url?coin_id=60&url=" + enc(t)
  },
  okx: {
    // Standalone self-custody OKX Wallet app (com.okx.wallet). web3link.okx.com is claimed only by
    // this app, so it opens here if installed, otherwise the wallet download page.
    name: "OKX Wallet", status: "untested",
    build: (t) => "https://web3link.okx.com/download?deeplink=" + enc("okxwallet://wallet/dapp/url?dappUrl=" + enc(t))
  },
  okxapp: {
    // Main OKX exchange app, which still has a built-in wallet that OKX is phasing out.
    // www.okx.com is claimed only by the exchange app.
    name: "OKX app", status: "untested",
    build: (t) => "https://www.okx.com/download?deeplink=" + enc("okx://wallet/dapp/url?dappUrl=" + enc(t))
  },
  phantom: {
    // Phantom supports only a fixed set of EVM chains, so it's off by default in config.
    name: "Phantom", status: "untested",
    build: (t) => "https://phantom.app/ul/browse/" + enc(t) + "?ref=" + enc(new URL(t).origin)
  }
};

// Alternate formats, shown only on the diagnostics page for comparison testing.
const VARIANTS: (Omit<VariantLink, "href"> & { build: (t: string) => string })[] = [
  { id: "okx-wallet-scheme", wallet: "okx", label: "OKX Wallet (raw okxwallet:// scheme)", note: "Fails silently if the app isn't installed.",
    build: (t) => "okxwallet://wallet/dapp/url?dappUrl=" + enc(t) },
  { id: "okx-common", wallet: "okx", label: "OKX, either app (web3.okx.com + okxweb3://)", note: "Claimed by both apps. Should prefer the Wallet app, then the exchange app.",
    build: (t) => "https://web3.okx.com/download?deeplink=" + enc("okxweb3://wallet/dapp/url?dappUrl=" + enc(t)) },
  { id: "okx-app-scheme", wallet: "okxapp", label: "OKX app (raw okx:// scheme)", note: "Fails silently if the app isn't installed.",
    build: (t) => "okx://wallet/dapp/url?dappUrl=" + enc(t) },
  { id: "metamask-legacy", wallet: "metamask", label: "MetaMask (legacy metamask.app.link)", note: "Older format. Prefer link.metamask.io.",
    build: (t) => "https://metamask.app.link/dapp/" + bare(t) }
];

export function walletLinks(target: string, ids?: string[]): WalletLink[] {
  return (ids || Object.keys(WALLETS)).filter((id) => WALLETS[id]).map((id) => {
    const w = WALLETS[id];
    return { id, name: w.name, icon: WALLET_ICONS[id] || "", status: w.status, href: w.build(target) };
  });
}

export function variantLinks(target: string): VariantLink[] {
  return VARIANTS.map((v) => ({ id: v.id, wallet: v.wallet, label: v.label, note: v.note, href: v.build(target) }));
}

/** Links that try to break out of an in-app browser into the system browser. Best effort. */
export function escapeLinks(target: string, osFamily: OSFamily | null): EscapeLink[] {
  const clean = noHash(target);
  const android: EscapeLink = {
    id: "android-chrome", os: "android", label: "Open in Chrome",
    note: "Android intent. Falls back to loading the page in place if Chrome isn't available.",
    href: "intent://" + bare(clean) + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + enc(clean) + ";end"
  };
  const safari: EscapeLink = {
    id: "ios-safari", os: "ios", label: "Open in Safari",
    note: "x-safari-https scheme, iOS 17+. Some in-app browsers block it.",
    href: "x-safari-" + clean
  };
  const chromeIOS: EscapeLink = {
    id: "ios-chrome", os: "ios", label: "Open in Chrome (iOS)",
    note: "Only works if Chrome is installed.",
    href: "googlechromes://" + bare(clean)
  };
  if (osFamily === "android") return [android];
  if (osFamily === "ios") return [safari, chromeIOS];
  return [android, safari, chromeIOS];
}
