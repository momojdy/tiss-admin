# Isolated CMS browser verification

This optional harness uses the existing session toolchain: Playwright 1.62.1, esbuild 0.28.2 and system Chromium. No app dependency or new app test runner was introduced. Native fonts, gradients, icons and safe-area metrics are adapted; provider/native transports use the existing isolated CMS preview ports. External browser requests are blocked. This is not hosted publishing, a payment test or a physical-device test.

Use sibling customer/admin checkouts with customer dependencies installed. Make Playwright/esbuild available through your existing tools environment (`NODE_PATH` if needed), then:

```sh
node docs/goodies/release-20261112/browser-harness/build.cjs
python -m http.server 8063 --bind 127.0.0.1 --directory docs/goodies/release-20261112/browser-harness
```

With that local server running, run `routes.cjs` and `interactions.cjs` from this directory. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if the executable is elsewhere. The scripts write JSON/screenshots into the OS temporary directory. The TSX harness is stored as `.txt` so the mobile compiler does not include verification-only browser code; esbuild explicitly uses the TSX loader. Draft fixtures never publish or create live orders.
