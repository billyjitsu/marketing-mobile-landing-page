// Optional PostHog analytics. Does nothing unless CONFIG.posthog.key is set
// or a PostHog snippet is already on the page.
import { CONFIG } from "./config";
import type { AnalyticsProps } from "./detect";

interface CaptureOptions {
  transport?: "XHR" | "fetch" | "sendBeacon";
  send_instantly?: boolean;
}

interface PostHogLike {
  capture: (event: string, props?: AnalyticsProps, options?: CaptureOptions) => void;
  __loaded?: boolean;
}

type PostHogStub = unknown[] & Record<string, unknown> & {
  _i: unknown[];
  init: (key: string, opts: Record<string, unknown>, name?: string) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike | PostHogStub;
  }
}

const cfg = CONFIG.posthog;

// Resolves once array.js has loaded (or failed), so queued events can actually be sent.
let loaded: Promise<void> = Promise.resolve();

// Minimal PostHog loader stub: queues calls until array.js loads and takes over.
if (cfg.key && !window.posthog) {
  const ph = [] as unknown as PostHogStub;
  ph._i = [];
  ph.__SV = 1;
  ["capture", "register", "identify", "reset"].forEach((m) => {
    ph[m] = (...args: unknown[]) => { ph.push([m, ...args]); };
  });
  ph.init = (key, opts, name) => { ph._i.push([key, opts, name]); };
  window.posthog = ph;

  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = cfg.host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
  loaded = new Promise((resolve) => {
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => resolve());
  });
  document.head.appendChild(s);

  ph.init(cfg.key, { api_host: cfg.host, autocapture: false, capture_pageview: true, persistence: "localStorage" });
}

export function track(event: string, props?: AnalyticsProps, options?: CaptureOptions): void {
  try {
    const ph = window.posthog as Partial<PostHogLike> | undefined;
    if (ph && typeof ph.capture === "function") ph.capture(event, props || {}, options);
  } catch {}
}

/**
 * Tracks an event that is immediately followed by leaving the page. Waits (up to `maxWaitMs`)
 * for PostHog to load, then sends with sendBeacon so the request survives the navigation.
 * Resolves straight away when analytics is off.
 */
export function trackBeforeLeave(event: string, props?: AnalyticsProps, maxWaitMs = 800): Promise<void> {
  if (!window.posthog) return Promise.resolve();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));
  return Promise.race([loaded, timeout]).then(() => {
    track(event, props, { transport: "sendBeacon", send_instantly: true });
  });
}
