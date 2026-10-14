// ---------- Edit these before deploying ----------

export interface HandoffConfig {
  appName: string;
  /** Where visitors end up. */
  defaultTarget: string;
  /** Hosts (and their subdomains) accepted as ?to= destinations, so the page can't be used as an open redirect. */
  allowedHosts: string[];
  /** go.example.com/trade/ETH  ->  <defaultTarget>/trade/ETH */
  pathPassthrough: boolean;
  /** Desktop can use extensions or the WalletConnect QR, so skip the picker. */
  autoRedirectDesktop: boolean;
  /** Already inside a wallet's browser (wallet injected), so skip the picker. */
  autoRedirectInWallet: boolean;
  /** Wallets shown in the picker, in order. Definitions live in links.ts. */
  wallets: string[];
  /** How long to wait for the wallet app to take over before showing the fallback message. */
  noOpenTimeoutMs: number;
  /** How long to listen for EIP-6963 wallet announcements before deciding. */
  providerScanMs: number;
  storageKey: string;
  /** Optional analytics. Leave key empty to disable. */
  posthog: { key: string; host: string };
}

export const CONFIG: HandoffConfig = {
  appName: "Katana Perps",

  defaultTarget: "https://perps.katana.network",

  allowedHosts: ["katana.network"],

  pathPassthrough: true,

  autoRedirectDesktop: true,
  autoRedirectInWallet: true,

  // "okx" is the standalone OKX Wallet app. "okxapp" (the main OKX exchange app) is available but off.
  // "phantom" is available but off by default: it can't add custom chains like Katana.
  wallets: ["metamask", "coinbase", "trust", "okx"],

  noOpenTimeoutMs: 2000,

  providerScanMs: 300,

  storageKey: "kp-last-wallet",

  posthog: {
    key: "",
    host: "https://us.i.posthog.com"
  }
};
