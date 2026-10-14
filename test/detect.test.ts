import { test } from "vitest";
import assert from "node:assert/strict";
import * as D from "../src/detect";
import * as L from "../src/links";

const UA: Record<string, string> = {
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  iosFirefox: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
  androidSamsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36",
  instagramIOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone15,3; iOS 17_5; en_US; en; scale=3.00; 1290x2796; 614466571)",
  facebookIOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.37.108;FBBV/613470118;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]",
  messengerAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/465.0.0.46.107;]",
  xAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 TwitterAndroid",
  linkedinIOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.1423",
  telegramAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 Telegram-Android/11.0.0",
  tiktokIOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US",
  metamaskIOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WebView MetaMaskMobile",
  desktopChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  desktopEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.68",
  desktopFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
  desktopSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
};

const CFG = {
  defaultTarget: "https://perps.katana.network",
  allowedHosts: ["katana.network"],
  pathPassthrough: true,
  autoRedirectDesktop: true,
  autoRedirectInWallet: true
};

function env(ua: string, extras?: D.Extras, wallet?: D.WalletScan): D.Env {
  return { ...D.parse(ua, extras), wallet: wallet || { injected: false, providers: [], scanned: false } };
}

test("iOS Safari", () => {
  const e = D.parse(UA.iosSafari);
  assert.equal(e.os.name, "iOS");
  assert.equal(e.os.version, "18.1");
  assert.equal(e.device.type, "mobile");
  assert.equal(e.browser.id, "safari");
  assert.equal(e.browser.webview, false);
  assert.equal(e.inApp, null);
});

test("iOS Chrome and Firefox are WebKit, not webviews", () => {
  const c = D.parse(UA.iosChrome);
  assert.equal(c.browser.id, "chrome");
  assert.equal(c.browser.engine, "WebKit");
  assert.equal(c.browser.webview, false);
  assert.equal(D.parse(UA.iosFirefox).browser.id, "firefox");
});

test("iPad with desktop user agent is detected by touch points", () => {
  assert.equal(D.parse(UA.ipadDesktop).device.type, "desktop");
  const e = D.parse(UA.ipadDesktop, { maxTouchPoints: 5 });
  assert.equal(e.os.name, "iPadOS");
  assert.equal(e.device.type, "tablet");
  assert.equal(e.device.handheld, true);
});

test("Android browsers", () => {
  assert.equal(D.parse(UA.androidChrome).browser.id, "chrome");
  assert.equal(D.parse(UA.androidChrome).device.type, "mobile");
  assert.equal(D.parse(UA.androidChrome, { brave: true }).browser.id, "brave");
  assert.equal(D.parse(UA.androidSamsung).browser.id, "samsung");
  assert.equal(D.parse(UA.androidTablet).device.type, "tablet");
  const wv = D.parse(UA.androidWebView);
  assert.equal(wv.browser.id, "webview");
  assert.equal(wv.browser.webview, true);
});

test("in-app browsers", () => {
  const cases = {
    instagramIOS: "instagram", facebookIOS: "facebook", messengerAndroid: "messenger",
    xAndroid: "x", linkedinIOS: "linkedin", telegramAndroid: "telegram", tiktokIOS: "tiktok"
  };
  for (const [key, id] of Object.entries(cases)) {
    const e = D.parse(UA[key]);
    assert.equal(e.inApp && e.inApp.id, id, key);
    assert.equal(e.browser.webview, true, key);
    assert.equal(e.device.handheld, true, key);
  }
  assert.equal(D.parse(UA.iosSafari, { telegramProxy: true }).inApp?.id, "telegram");
});

test("wallet browser from user agent", () => {
  const e = D.parse(UA.metamaskIOS);
  assert.equal(e.walletUA, "metamask");
  assert.equal(e.inApp, null);
  assert.equal(e.browser.id, "wallet");
});

test("desktop browsers", () => {
  assert.equal(D.parse(UA.desktopChrome).browser.id, "chrome");
  assert.equal(D.parse(UA.desktopEdge).browser.id, "edge");
  assert.equal(D.parse(UA.desktopFirefox).browser.engine, "Gecko");
  assert.equal(D.parse(UA.desktopSafari).browser.id, "safari");
  for (const k of ["desktopChrome", "desktopEdge", "desktopFirefox", "desktopSafari"]) {
    assert.equal(D.parse(UA[k]).device.type, "desktop", k);
  }
});

test("routing decisions", () => {
  const injected: D.WalletScan = { injected: true, scanned: true, providers: [{ source: "eip6963", id: "metamask", name: "MetaMask" }] };
  assert.equal(D.decide(env(UA.desktopChrome), CFG).reason, "desktop");
  assert.equal(D.decide(env(UA.desktopChrome), CFG).action, "redirect");
  assert.equal(D.decide(env(UA.iosSafari), CFG).reason, "mobile-no-wallet");
  assert.equal(D.decide(env(UA.iosSafari, {}, injected), CFG).reason, "wallet-browser");
  assert.equal(D.decide(env(UA.metamaskIOS), CFG).action, "redirect");
  assert.equal(D.decide(env(UA.instagramIOS), CFG).reason, "in-app");
  assert.equal(D.decide(env(UA.desktopChrome), CFG, { preview: true }).action, "show");
  assert.equal(D.decide(env(UA.desktopChrome), CFG, { framed: true }).action, "show");
  assert.equal(D.decide(env(UA.desktopChrome), { ...CFG, autoRedirectDesktop: false }).action, "show");
});

test("provider identification", () => {
  assert.equal(D.walletFromProvider({ isMetaMask: true }), "metamask");
  assert.equal(D.walletFromProvider({ isMetaMask: true, isRabby: true }), "rabby");
  assert.equal(D.walletFromProvider({ isMetaMask: true, isCoinbaseWallet: true }), "coinbase");
  assert.equal(D.walletFromRdns("io.metamask.mobile"), "metamask");
  assert.equal(D.walletFromRdns("com.example"), "unknown");
});

test("target keeps UTMs and drops reserved params", () => {
  const t = L.resolveTarget({ search: "?utm_source=x&ref=abc&preview=1", pathname: "/" }, CFG);
  assert.equal(t, "https://perps.katana.network/?utm_source=x&ref=abc");
});

test("target accepts allowed ?to= and rejects others", () => {
  const ok = L.resolveTarget({ search: "?to=" + encodeURIComponent("https://perps.katana.network/trade/ETH") + "&utm_source=x", pathname: "/" }, CFG);
  assert.equal(ok, "https://perps.katana.network/trade/ETH?utm_source=x");
  for (const bad of ["https://evil.com", "https://katana.network.evil.com", "http://katana.network", "javascript:alert(1)", "https://evilkatana.network"]) {
    const t = L.resolveTarget({ search: "?to=" + encodeURIComponent(bad), pathname: "/" }, CFG);
    assert.equal(t, "https://perps.katana.network/", bad);
  }
});

test("path passthrough", () => {
  assert.equal(L.resolveTarget({ search: "?a=1", pathname: "/trade/ETH" }, CFG), "https://perps.katana.network/trade/ETH?a=1");
  assert.equal(L.resolveTarget({ search: "", pathname: "/x" }, { ...CFG, defaultTarget: "https://katana.network/app/" }), "https://katana.network/app/x");
  assert.equal(L.resolveTarget({ search: "", pathname: "/x" }, { ...CFG, pathPassthrough: false }), "https://perps.katana.network/");
});

test("wallet deep links", () => {
  const t = "https://perps.katana.network/trade/ETH?utm_source=x";
  const links = Object.fromEntries(L.walletLinks(t).map((w) => [w.id, w.href]));
  assert.equal(links.metamask, "https://link.metamask.io/dapp/perps.katana.network/trade/ETH?utm_source=x");
  assert.equal(links.coinbase, "https://go.cb-w.com/dapp?cb_url=" + encodeURIComponent(t));
  assert.equal(links.trust, "https://link.trustwallet.com/open_url?coin_id=60&url=" + encodeURIComponent(t));
  assert.equal(links.okx, "https://web3link.okx.com/download?deeplink=" + encodeURIComponent("okxwallet://wallet/dapp/url?dappUrl=" + encodeURIComponent(t)));
  assert.equal(links.okxapp, "https://www.okx.com/download?deeplink=" + encodeURIComponent("okx://wallet/dapp/url?dappUrl=" + encodeURIComponent(t)));
  assert.deepEqual(L.walletLinks(t, ["trust", "nope", "metamask"]).map((w) => w.id), ["trust", "metamask"]);
});

test("escape links", () => {
  const t = "https://perps.katana.network/?a=1#frag";
  const [android] = L.escapeLinks(t, "android");
  assert.equal(android.href, "intent://perps.katana.network/?a=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent("https://perps.katana.network/?a=1") + ";end");
  assert.equal(L.escapeLinks(t, "ios")[0].href, "x-safari-https://perps.katana.network/?a=1");
});
