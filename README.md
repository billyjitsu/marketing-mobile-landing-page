# marketing-mobile-landing-page

Katana Perps mobile wallet handoff page.

A static site that sits between an ad or tweet and the Perps app. It works out what kind of device and browser the visitor is on, and:

| Visitor | What happens |
|---|---|
| Desktop | Redirects straight to Perps (extensions and WalletConnect QR work there) |
| Already inside a wallet browser | Redirects straight to Perps |
| Phone browser, no wallet | Shows the wallet picker |
| Inside X, Instagram, Facebook, Messenger, Threads, LinkedIn, Telegram, TikTok, Snapchat, Discord, Reddit, WeChat, LINE… | Picker plus a note and an "Open in Safari / Chrome" button |
| `?preview=1` or inside a frame | Picker, no redirect (for review) |

TypeScript, built with Vite into a static `dist/` folder. No runtime dependencies.

## Pages

- **`/`**: the handoff page. Use this URL in ads and tweets.
- **`/check/`**: diagnostics. Open it on each phone or app you're testing. It shows the detected device, OS, browser, engine, in-app browser, and injected wallets, plus every deep link to tap. "Copy report" puts a JSON dump on the clipboard for bug reports. Add `?ua=<user agent>` to see how any UA would be classified.

## Configure

Edit `src/config.ts`:

```ts
defaultTarget: "https://perps.katana.network",   // the Perps app URL
allowedHosts: ["katana.network"],          // hosts allowed in ?to=, subdomains included
wallets: ["metamask", "coinbase", "trust", "okx"],
posthog: { key: "", host: "https://us.i.posthog.com" }
```

Wallet deep link formats live in `src/links.ts`. Config is compiled into the bundle, so changes need a rebuild and deploy.

## Layout

```
index.html            handoff page        -> src/handoff.ts
check/index.html      diagnostics page    -> src/check.ts
src/config.ts         settings
src/detect.ts         device / browser / wallet detection
src/links.ts          target resolution and deep link builders
src/analytics.ts      optional PostHog
src/wallet-icons.ts   wallet SVGs
src/styles.css        styles (+ bg.jpg)
public/               copied as-is: _headers, _redirects, favicon
test/                 vitest
```

## URLs you can use

| URL | Goes to |
|---|---|
| `go.katana.network/?utm_source=x&ref=abc` | `<defaultTarget>/?utm_source=x&ref=abc` |
| `go.katana.network/trade/ETH` | `<defaultTarget>/trade/ETH` (path passthrough) |
| `go.katana.network/?to=https://perps.katana.network/trade/BTC` | That URL, if the host is in `allowedHosts` |

UTMs and referral codes are always forwarded. `to`, `preview` and `ua` are not.

## How routing works

Every visit to `/` runs `src/handoff.ts`:

1. **Pick the destination**: `resolveTarget()` in `src/links.ts`.
   - If `?to=` is set, it must be `https://` on a host in `allowedHosts` (`katana.network` or any subdomain). Anything else is ignored, so the page can't be used as an open redirect.
   - Otherwise it uses `defaultTarget`, plus the request path if `pathPassthrough` is on.
   - All other query params (UTMs, `ref`, …) are appended.
2. **Detect the environment**: `current()` in `src/detect.ts` parses the user agent (device, OS, browser, in-app browser, wallet browser) and checks `window.ethereum` and the other wallet globals.
3. **Decide**: `decide()` in `src/detect.ts` checks these in order and stops at the first match:

   | Check | Result |
   |---|---|
   | `?preview=1` | show picker |
   | Inside a frame | show picker |
   | Desktop | redirect (if `autoRedirectDesktop`) |
   | Wallet detected (UA or injected provider) | redirect (if `autoRedirectInWallet`) |
   | In-app browser (X, Instagram, …) | show picker + "open in browser" note |
   | Anything else (phone browser) | show picker |

4. **Redirect or render**:
   - **Redirect** means `location.replace(target)`, so the handoff page doesn't stay in back history. Desktop and UA-identified wallet browsers redirect immediately.
   - **Otherwise** the picker renders while the page listens for EIP-6963 wallet announcements for `providerScanMs` (300 ms). It then runs `decide()` again and redirects if a wallet showed up.
5. **Wallet buttons**: these are plain `<a href>` deep links built by `walletLinks()` in `src/links.ts`. Each one opens the wallet app with `target` loaded in its dapp browser. If the page is still visible after `noOpenTimeoutMs` (2 s), the row shows a "Nothing opened?" hint.

Path passthrough (`/trade/ETH`) relies on the catch-all rewrite in `public/_redirects`, which serves `index.html` for unknown paths.

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # detection and link-building tests (vitest)
npm run typecheck  # tsc
npm run build      # typecheck + build to dist/
npm run preview    # serve dist/
```

Path passthrough (`/trade/ETH`) only works on Netlify, where the rewrite in `public/_redirects` applies. Locally, use `/?to=…` instead.

Deep links **can't** be tested from localhost on a phone or from a desktop emulator. Deploy first.

## Deploy to Netlify

**Drag and drop:** run `npm run build`, then drop the `dist` folder on app.netlify.com/drop. Headers and path passthrough come along in `_headers` and `_redirects` (copied from `public/`).

**From Git (recommended):** push this folder to a repo, then in Netlify choose *Add new site → Import an existing project*. `netlify.toml` runs the tests and build on every deploy and publishes `dist`.

**CLI:**

```sh
npx netlify-cli deploy --prod
```

**Custom domain:** in Netlify, go to *Domain management → Add a domain* and enter `go.katana.network`. Then add a `CNAME` record for `go` pointing to `<your-site>.netlify.app`. HTTPS is issued automatically.

Other static hosts (Vercel, Cloudflare Pages, GitHub Pages) work too. Build, serve `dist/`, and add a catch-all rewrite to `/index.html` if you want path passthrough.

## Analytics

Set `posthog.key` in config. Events:

| Event | When |
|---|---|
| `wallet_handoff_view` | Page loads (includes `action`: show or redirect) |
| `wallet_handoff_clicked` | Wallet tapped (`wallet`) |
| `wallet_handoff_no_open` | Wallet app didn't take over within 2s |
| `wallet_handoff_escape` | "Open in Safari / Chrome" tapped |
| `wallet_handoff_continue` | Continue in browser tapped |
| `wallet_handoff_copy` | Copy link tapped |

Every event carries `device`, `os`, `os_version`, `browser`, `webview`, `in_app`, `has_wallet`, `wallet_browser` and `reason`.

## Test on real devices

Test from the deployed URL on a real iPhone and a real Android phone.

| Environment | Expected |
|---|---|
| Safari (iOS) / Chrome (Android) | Picker; each wallet opens its app with Perps loaded |
| X, Instagram, Telegram in-app browser | In-app note and escape button appear |
| Inside MetaMask / Coinbase / Trust / OKX browser | Straight to Perps |
| Desktop | Straight to Perps |
| Link with UTMs | Params present on the Perps URL |
| Wallet not installed | "Nothing opened?" message after 2s (some wallets show an install page instead) |

Quick check for any deep link: paste it into the iPhone Notes app and tap it. Don't type it into Safari's address bar.

## Known limits

- The X app on iOS often opens links in an in-app Safari view that looks exactly like Safari, so it can't be detected. Those visitors see the normal picker, which works there.
- `x-safari-https://` (Open in Safari) needs iOS 17+ and some apps block it. The written instructions are always shown too.
- Rabby Mobile has no documented dapp-browser deep link. Those visitors should use WalletConnect from the normal browser.
- Coinbase, Trust and OKX link formats are widely used but still need device testing. MetaMask is confirmed.
- OKX has two apps. `okx` opens the standalone **OKX Wallet** app (self-custody, `com.okx.wallet`) through `web3link.okx.com` and `okxwallet://`. `okxapp` opens the main **OKX** exchange app through `www.okx.com` and `okx://`. OKX is phasing the wallet out of the exchange app, so `okx` is the one to keep long term. The `okxwallet://wallet/dapp/url` path is copied from the exchange app's format and hasn't been confirmed by OKX docs, so test it first. `/check/` also lists the raw schemes and a link that works with either app.
