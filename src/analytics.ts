// Optional PostHog analytics. Does nothing unless CONFIG.posthog.key is set
// or a PostHog snippet is already on the page.
import { CONFIG } from "./config";
import type { AnalyticsProps } from "./detect";

interface PostHogLike {
  capture: (event: string, props?: AnalyticsProps) => void;
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
  document.head.appendChild(s);

  ph.init(cfg.key, { api_host: cfg.host, autocapture: false, capture_pageview: true, persistence: "localStorage" });
}

export function track(event: string, props?: AnalyticsProps): void {
  try {
    const ph = window.posthog as Partial<PostHogLike> | undefined;
    if (ph && typeof ph.capture === "function") ph.capture(event, props || {});
  } catch {}
}
