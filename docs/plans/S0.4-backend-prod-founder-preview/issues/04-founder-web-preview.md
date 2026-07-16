# 04 — Founder web preview: the app in a browser, against the dev environment

**What to build:** The mobile codebase's web export, live at `preview.largata.com`, signed in against the deployed `dev` backend. Three parts:

1. **Auth web variants — exactly two files.** `authRepository` and `firebaseTokenSource` gain `.web.ts` implementations on the Firebase **JS SDK** (`firebase` package, web-only import); Metro platform resolution picks native vs web — no `Platform.OS` branches in callers, screens untouched. **Email/password only: the Google button hides on web** (the native doorway has no web equivalent; the popup flow is deferred — spec). Sign-up stays open, as built. The `largata-dev` Firebase project gains a **Web App** registration (its config is public client config — env-var/config surface, not a secret) and `preview.largata.com` in its authorized domains.
2. **CORS on `dev` only.** The existing `dev`-profile CORS config gains a configurable allowed-origin (env-var), set to the preview's origin on Railway's dev environment. Prod/preprod run no profile → no CORS headers, verified.
3. **The static service.** `expo export --platform web` output served by a minimal static server (implementer's call — Caddy/nginx/`serve`-class; recorded in comments) as a **separate service in the dev environment only**, `preview.largata.com` attached. `EXPO_PUBLIC_API_BASE_URL=https://api-dev.largata.com` baked at export. Never promoted; decommissionable by deleting one service.

**Status boundary (spec):** founder demo — never device-AC evidence, never a supported platform. The web variants are preview-only code.

**Blocked by:** 01 — the dev environment and `api-dev.largata.com` must exist.

**Status:** open

- [ ] Web export builds and serves; `preview.largata.com` renders the sign-in screen (no Google button on web)
- [ ] Email sign-up → sign-in → create itinerary → My Trips → view, in a browser, end-to-end against the dev backend (the S0.3 flow, browser edition)
- [ ] Jest + typecheck green with the platform fork in place (native tests still exercise the native files; the S0.2 native-contract mock is untouched)
- [ ] CORS: preview origin allowed on dev; a curl against preprod/prod shows **no** CORS headers
- [ ] The backend image contains no preview bits; the preview service exists in the dev environment only
- [ ] No raw fetch in UI code — web variants live behind the same repository interfaces (ADR-001/P6 hold on web too)

## Comments
