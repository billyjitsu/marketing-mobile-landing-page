// Environment detection: device, OS, browser, in-app browsers, and injected wallets.
import type { HandoffConfig } from "./config";

export type OSFamily = "ios" | "android" | "chromeos" | "windows" | "macos" | "linux" | "unknown";

export interface OSInfo {
  name: string;
  family: OSFamily;
  version: string | null;
  ipadDesktopUA?: boolean;
}

export interface DeviceInfo {
  type: "mobile" | "tablet" | "desktop";
  handheld: boolean;
  model: string;
}

export interface BrowserInfo {
  id: string;
  name: string;
  version: string | null;
  engine: "WebKit" | "Gecko" | "Blink" | "Unknown";
  webview: boolean;
}

export interface InApp {
  id: string;
  name: string;
}

export interface Provider {
  source: string;
  id: string;
  name: string;
  rdns?: string;
}

export interface WalletScan {
  injected: boolean;
  providers: Provider[];
  scanned: boolean;
}

/** Non-UA signals that matter for classification. */
export interface Extras {
  maxTouchPoints?: number;
  brave?: boolean;
  uaDataMobile?: boolean;
  telegramProxy?: boolean;
  standalone?: boolean;
}

export interface ParsedEnv {
  ua: string;
  os: OSInfo;
  device: DeviceInfo;
  browser: BrowserInfo;
  inApp: InApp | null;
  walletUA: string | null;
  standalone: boolean;
}

export interface Env extends ParsedEnv {
  wallet: WalletScan;
}

export type DecideConfig = Pick<HandoffConfig, "autoRedirectDesktop" | "autoRedirectInWallet">;

export interface DecideOptions {
  preview?: boolean;
  framed?: boolean;
}

export interface Decision {
  action: "show" | "redirect";
  reason: Reason;
  text: string;
}

// Order matters: Messenger before Facebook, Threads before Instagram.
const IN_APP: { id: string; name: string; re: RegExp }[] = [
  { id: "x", name: "X", re: /Twitter/i },
  { id: "threads", name: "Threads", re: /Barcelona/ },
  { id: "instagram", name: "Instagram", re: /Instagram/i },
  { id: "messenger", name: "Messenger", re: /FBAN\/Messenger|MessengerForiOS|FB_IAB\/MESSENGER|Orca-Android/i },
  { id: "facebook", name: "Facebook", re: /FBAN|FBAV|FB_IAB|FBIOS/ },
  { id: "linkedin", name: "LinkedIn", re: /LinkedInApp/i },
  { id: "telegram", name: "Telegram", re: /Telegram/i },
  { id: "tiktok", name: "TikTok", re: /musical_ly|BytedanceWebview|TikTok|trill_/i },
  { id: "snapchat", name: "Snapchat", re: /Snapchat/i },
  { id: "discord", name: "Discord", re: /Discord/i },
  { id: "reddit", name: "Reddit", re: /Reddit/i },
  { id: "pinterest", name: "Pinterest", re: /Pinterest/i },
  { id: "line", name: "LINE", re: /\sLine\//i },
  { id: "wechat", name: "WeChat", re: /MicroMessenger/i },
  { id: "kakaotalk", name: "KakaoTalk", re: /KAKAOTALK/i },
  { id: "google", name: "Google app", re: /\sGSA\//i }
];

export const WALLET_NAMES: Record<string, string> = {
  metamask: "MetaMask", coinbase: "Coinbase Wallet", trust: "Trust Wallet", okx: "OKX Wallet",
  phantom: "Phantom", rabby: "Rabby", rainbow: "Rainbow", zerion: "Zerion", brave: "Brave Wallet",
  bitget: "Bitget Wallet", tokenpocket: "TokenPocket", imtoken: "imToken", unknown: "Unknown wallet"
};

// Wallet dapp browsers that identify themselves in the user agent.
const WALLET_UA: { id: string; re: RegExp }[] = [
  { id: "metamask", re: /MetaMaskMobile/i },
  { id: "coinbase", re: /CoinbaseWallet|CoinbaseBrowser/i },
  { id: "trust", re: /TrustWallet|\sTrust\/\d/i },
  { id: "okx", re: /OKApp|OKEx/i },
  { id: "phantom", re: /Phantom/i },
  { id: "rabby", re: /Rabby/i },
  { id: "rainbow", re: /Rainbow\//i },
  { id: "zerion", re: /Zerion/i },
  { id: "bitget", re: /BitKeep|Bitget/i },
  { id: "tokenpocket", re: /TokenPocket/i },
  { id: "imtoken", re: /imToken/i }
];

const RDNS: Record<string, string> = {
  "io.metamask": "metamask", "com.coinbase.wallet": "coinbase", "com.trustwallet.app": "trust",
  "com.okex.wallet": "okx", "app.phantom": "phantom", "io.rabby": "rabby", "me.rainbow": "rainbow",
  "io.zerion.wallet": "zerion", "com.brave.wallet": "brave", "com.bitget.web3": "bitget",
  "pro.tokenpocket": "tokenpocket", "token.im": "imtoken"
};

// Order matters: brands that also carry "Chrome/" or "Safari/" tokens come first.
const BROWSERS: [id: string, name: string, re: RegExp][] = [
  ["edge", "Edge", /(?:EdgiOS|EdgA|Edg|Edge)\/([\d.]+)/],
  ["samsung", "Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["opera", "Opera", /(?:OPR|OPiOS|OPT|OPX)\/([\d.]+)/],
  ["yandex", "Yandex", /YaBrowser\/([\d.]+)/],
  ["ucbrowser", "UC Browser", /UCBrowser\/([\d.]+)/],
  ["duckduckgo", "DuckDuckGo", /(?:DuckDuckGo|Ddg)\/([\d.]+)/],
  ["firefox", "Firefox", /(?:FxiOS|Firefox)\/([\d.]+)/],
  ["chrome", "Chrome", /(?:CriOS|Chrome)\/([\d.]+)/],
  ["safari", "Safari", /Version\/([\d.]+).*Safari\//]
];

export const REASONS = {
  "preview": "Preview mode (?preview=1): picker shown, no redirect.",
  "framed": "Page is inside a frame: picker shown, no redirect. iOS won't open apps from a frame.",
  "desktop": "Desktop: goes straight to the app, where extensions and the WalletConnect QR work.",
  "desktop-show": "Desktop, but autoRedirectDesktop is off: picker shown.",
  "wallet-browser": "Already inside a wallet browser: goes straight to the app.",
  "wallet-browser-show": "Inside a wallet browser, but autoRedirectInWallet is off: picker shown.",
  "in-app": "Inside a social app's browser: picker shown with a note on opening the real browser.",
  "mobile-no-wallet": "Phone browser with no wallet: picker shown."
} as const;

export type Reason = keyof typeof REASONS;

function match(re: RegExp, ua: string): string | null {
  const m = ua.match(re);
  return m ? m[1] : null;
}

function parseOS(ua: string, touchPoints: number): OSInfo {
  // iPadOS 13+ Safari sends a Mac user agent; touch support gives it away.
  const ipadDesktopUA = /Macintosh/.test(ua) && touchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || ipadDesktopUA) {
    const v = ua.match(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
    const version = v ? v.slice(1).filter(Boolean).join(".") : match(/Version\/([\d.]+)/, ua);
    const ipad = /iPad/.test(ua) || ipadDesktopUA;
    return { name: ipad ? "iPadOS" : "iOS", family: "ios", version, ipadDesktopUA };
  }
  if (/Android/.test(ua)) return { name: "Android", family: "android", version: match(/Android ([\d.]+)/, ua) };
  if (/CrOS/.test(ua)) return { name: "ChromeOS", family: "chromeos", version: null };
  if (/Windows NT/.test(ua)) return { name: "Windows", family: "windows", version: match(/Windows NT ([\d.]+)/, ua) };
  if (/Macintosh|Mac OS X/.test(ua)) {
    const mac = match(/Mac OS X ([\d_.]+)/, ua);
    return { name: "macOS", family: "macos", version: mac ? mac.replace(/_/g, ".") : null };
  }
  if (/Linux/.test(ua)) return { name: "Linux", family: "linux", version: null };
  return { name: "Unknown", family: "unknown", version: null };
}

function parseDevice(ua: string, os: OSInfo, uaDataMobile: boolean | undefined): DeviceInfo {
  let type: DeviceInfo["type"];
  if (os.family === "ios") type = /iPad/.test(ua) || os.ipadDesktopUA ? "tablet" : "mobile";
  else if (os.family === "android") type = /Mobile/.test(ua) ? "mobile" : "tablet";
  else if (uaDataMobile === true || /Mobi|Opera Mini|IEMobile|BlackBerry|webOS/i.test(ua)) type = "mobile";
  else type = "desktop";
  const model = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || os.ipadDesktopUA ? "iPad" : /iPod/.test(ua) ? "iPod"
              : os.family === "android" ? (type === "tablet" ? "Android tablet" : "Android phone")
              : type === "desktop" ? "Desktop" : "Phone";
  return { type, handheld: type !== "desktop", model };
}

function parseBrowser(ua: string, os: OSInfo, extras: Extras, inApp: InApp | null, walletUA: string | null): BrowserInfo {
  let b: { id: string; name: string; version: string | null } = { id: "unknown", name: "Unknown", version: null };
  for (const [id, name, re] of BROWSERS) {
    const v = match(re, ua);
    if (v) { b = { id, name, version: v }; break; }
  }
  if (b.id === "chrome" && extras.brave) b = { id: "brave", name: "Brave", version: b.version };

  let webview = !!(inApp || walletUA);
  if (os.family === "android" && /; wv\)/.test(ua)) webview = true;
  // Every real iOS browser (Safari, Chrome, Firefox, Edge...) keeps the "Safari/" token; app webviews drop it.
  if (os.family === "ios" && !/Safari\//.test(ua)) webview = true;

  if (walletUA) b = { id: "wallet", name: WALLET_NAMES[walletUA] + " browser", version: null };
  else if (webview && (b.id === "chrome" || b.id === "safari" || b.id === "unknown")) {
    b = { id: "webview", name: os.family === "ios" ? "iOS WebView" : os.family === "android" ? "Android WebView" : "WebView", version: b.version };
  }

  // All iOS browsers are required to use WebKit.
  const engine: BrowserInfo["engine"] = os.family === "ios" ? "WebKit"
             : b.id === "firefox" ? "Gecko"
             : b.id === "safari" ? "WebKit"
             : b.id === "unknown" ? "Unknown" : "Blink";

  return { ...b, engine, webview };
}

function walletFromUA(ua: string): string | null {
  for (const w of WALLET_UA) if (w.re.test(ua)) return w.id;
  return null;
}

function findInApp(ua: string, extras: Extras): InApp | null {
  for (const a of IN_APP) if (a.re.test(ua)) return { id: a.id, name: a.name };
  if (extras.telegramProxy) return { id: "telegram", name: "Telegram" };
  return null;
}

/** Pure user-agent parse. `extras` carries the few non-UA signals that matter. */
export function parse(ua?: string | null, extras: Extras = {}): ParsedEnv {
  ua = ua || "";
  const os = parseOS(ua, extras.maxTouchPoints || 0);
  const device = parseDevice(ua, os, extras.uaDataMobile);
  const walletUA = walletFromUA(ua);
  const inApp = walletUA ? null : findInApp(ua, extras);
  const browser = parseBrowser(ua, os, extras, inApp, walletUA);
  return { ua, os, device, browser, inApp, walletUA, standalone: !!extras.standalone };
}

// ---------- Injected wallet detection ----------

/** The subset of EIP-1193 provider flags wallets set to identify themselves. */
export type InjectedProvider = Partial<Record<
  | "isRabby" | "isOkxWallet" | "isOKExWallet" | "isPhantom" | "isTrust" | "isTrustWallet"
  | "isCoinbaseWallet" | "isCoinbaseBrowser" | "isRainbow" | "isZerion" | "isBraveWallet"
  | "isBitKeep" | "isTokenPocket" | "isImToken" | "isMetaMask",
  boolean
>> & { providers?: InjectedProvider[] };

interface WalletWindow extends Window {
  ethereum?: InjectedProvider;
  okxwallet?: unknown;
  phantom?: { ethereum?: unknown };
  trustwallet?: unknown;
  coinbaseWalletExtension?: unknown;
  TelegramWebviewProxy?: unknown;
}

interface EIP6963AnnounceEvent extends Event {
  detail?: { info?: { uuid?: string; name: string; rdns: string } };
}

export function walletFromProvider(p: InjectedProvider | null | undefined): string | null {
  if (!p) return null;
  // Many wallets also set isMetaMask for compatibility, so MetaMask is checked last.
  if (p.isRabby) return "rabby";
  if (p.isOkxWallet || p.isOKExWallet) return "okx";
  if (p.isPhantom) return "phantom";
  if (p.isTrust || p.isTrustWallet) return "trust";
  if (p.isCoinbaseWallet || p.isCoinbaseBrowser) return "coinbase";
  if (p.isRainbow) return "rainbow";
  if (p.isZerion) return "zerion";
  if (p.isBraveWallet) return "brave";
  if (p.isBitKeep) return "bitget";
  if (p.isTokenPocket) return "tokenpocket";
  if (p.isImToken) return "imtoken";
  if (p.isMetaMask) return "metamask";
  return "unknown";
}

export function walletFromRdns(rdns: string | null | undefined): string {
  if (!rdns) return "unknown";
  for (const key in RDNS) if (rdns === key || rdns.indexOf(key + ".") === 0) return RDNS[key];
  return "unknown";
}

function syncProviders(win: WalletWindow): Provider[] {
  const found: Provider[] = [];
  const eth = win.ethereum;
  if (eth) {
    const list = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth];
    list.forEach((p) => {
      const id = walletFromProvider(p) as string;
      found.push({ source: "window.ethereum", id, name: WALLET_NAMES[id] });
    });
  }
  if (win.okxwallet) found.push({ source: "window.okxwallet", id: "okx", name: WALLET_NAMES.okx });
  if (win.phantom && win.phantom.ethereum) found.push({ source: "window.phantom", id: "phantom", name: WALLET_NAMES.phantom });
  if (win.trustwallet) found.push({ source: "window.trustwallet", id: "trust", name: WALLET_NAMES.trust });
  if (win.coinbaseWalletExtension) found.push({ source: "window.coinbaseWalletExtension", id: "coinbase", name: WALLET_NAMES.coinbase });
  return found;
}

/** Checks window globals, then listens for EIP-6963 announcements for `wait` ms. */
export function scanProviders(win: Window, wait: number, cb: (wallet: WalletScan) => void): void {
  const found = syncProviders(win);
  const seen: Record<string, boolean> = {};
  function onAnnounce(e: Event) {
    const info = (e as EIP6963AnnounceEvent).detail?.info;
    if (!info) return;
    const key = info.uuid || info.rdns;
    if (seen[key]) return;
    seen[key] = true;
    const id = walletFromRdns(info.rdns);
    // The same wallet often shows up both as a window global and via EIP-6963; keep one entry.
    const dup = id !== "unknown" ? found.find((p) => p.id === id) : undefined;
    if (dup) { dup.rdns = dup.rdns || info.rdns; return; }
    found.push({ source: "eip6963", id, name: info.name, rdns: info.rdns });
  }
  try {
    win.addEventListener("eip6963:announceProvider", onAnnounce);
    win.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}
  setTimeout(() => {
    try { win.removeEventListener("eip6963:announceProvider", onAnnounce); } catch {}
    cb({ injected: found.length > 0, providers: found, scanned: true });
  }, wait);
}

function extrasFrom(win: WalletWindow): Extras {
  const nav = (win.navigator || {}) as Navigator & { standalone?: boolean; brave?: unknown; userAgentData?: { mobile: boolean } };
  let standalone = !!nav.standalone;
  try { standalone = standalone || win.matchMedia("(display-mode: standalone)").matches; } catch {}
  return {
    maxTouchPoints: nav.maxTouchPoints || 0,
    brave: !!nav.brave,
    uaDataMobile: nav.userAgentData ? nav.userAgentData.mobile : undefined,
    telegramProxy: !!win.TelegramWebviewProxy,
    standalone
  };
}

/** Synchronous snapshot of the current browser. Wallet info is refined later by scanProviders. */
export function current(win: Window, uaOverride?: string | null): Env {
  const parsed = parse(uaOverride || (win.navigator && win.navigator.userAgent) || "", extrasFrom(win));
  const providers = syncProviders(win);
  return { ...parsed, wallet: { injected: providers.length > 0, providers, scanned: false } };
}

export function isFramed(win: Window): boolean {
  try { return win.self !== win.top; } catch { return true; }
}

// Providers that don't mean the visitor is inside a wallet app: Brave's built-in wallet is
// injected whether or not it has been set up, and unrecognised providers are too uncertain.
const NOT_A_WALLET_APP = ["brave", "unknown"];

/** True when the visitor is already inside a wallet's browser, so the picker can be skipped. */
export function hasWallet(env: Pick<Env, "wallet" | "walletUA">): boolean {
  if (env.walletUA) return true;
  return !!(env.wallet && env.wallet.providers.some((p) => NOT_A_WALLET_APP.indexOf(p.id) === -1));
}

/** What should the handoff page do for this visitor? */
export function decide(env: Env, cfg: DecideConfig, opts: DecideOptions = {}): Decision {
  const r = (action: Decision["action"], reason: Reason): Decision => ({ action, reason, text: REASONS[reason] });
  if (opts.preview) return r("show", "preview");
  if (opts.framed) return r("show", "framed");
  if (!env.device.handheld) return cfg.autoRedirectDesktop ? r("redirect", "desktop") : r("show", "desktop-show");
  if (hasWallet(env)) return cfg.autoRedirectInWallet ? r("redirect", "wallet-browser") : r("show", "wallet-browser-show");
  if (env.inApp) return r("show", "in-app");
  return r("show", "mobile-no-wallet");
}

export function summary(env: Env): string {
  const parts = [env.device.model];
  parts.push(env.os.name + (env.os.version ? " " + env.os.version : ""));
  parts.push(env.inApp ? env.inApp.name + " in-app browser" : env.browser.name);
  parts.push(hasWallet(env) ? "wallet detected" : "no wallet");
  return parts.join(" · ");
}

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Flat properties for analytics. */
export function props(env: Env): AnalyticsProps {
  return {
    device: env.device.type,
    mobile: env.device.handheld,
    os: env.os.name,
    os_version: env.os.version,
    browser: env.browser.id,
    browser_version: env.browser.version,
    webview: env.browser.webview,
    in_app: env.inApp ? env.inApp.id : null,
    has_wallet: hasWallet(env),
    wallet_browser: env.walletUA || (env.device.handheld && env.wallet && env.wallet.providers[0] ? env.wallet.providers[0].id : null)
  };
}
