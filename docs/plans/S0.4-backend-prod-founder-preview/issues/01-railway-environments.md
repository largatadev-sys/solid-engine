# 01 — Railway: one project, three environments, correct identity from first boot

**What to build:** The Railway project (Southeast Asia / Singapore) with `dev` / `preprod` / `prod` environments. Each environment: a backend service deploying `backend/` by Dockerfile + its own **Postgres 18** (explicit image tag — never `latest`, never a shared instance). GitHub integration: `dev` branch → dev env, `preprod` → preprod, `main` → prod, **deploys gated on green CI** (check-suite gating — a red `mvn verify` never reaches an environment). Platform health checks → `GET /v1/health` (no Actuator — S0.1's deferral resolves as "our endpoint is the probe").

**Environment identity (S0.2 spec decision 1):** create the **`largata-prod`** Firebase project (console work, backend-side only). Env-vars per environment: `FIREBASE_ISSUER_URI` → `largata-dev` on dev; **`largata-prod` on preprod and prod**. `SPRING_PROFILES_ACTIVE=dev` on dev only; **preprod/prod run no profile** (no CORS — the native-only stance). `DATABASE_URL`/credentials from Railway's Postgres references. No mobile-side prod wiring of any kind (parked Play story).

**Domains (`largata.com`, purchased 2026-07-16):** attach `api.largata.com` → prod · `api-preprod.largata.com` → preprod · `api-dev.largata.com` → dev. DNS records at the registrar; TLS automatic. (`preview.largata.com` rides ticket 04.)

**Blocked by:** — (opens the story).

**Status:** open

- [ ] Three environments exist, Singapore region, each with its own Postgres 18 (image tag pinned) and backend service
- [ ] Push to `dev` branch with green CI → dev env redeploys; red CI → no deploy (verified once with a deliberate red or a check-suite inspection)
- [ ] `https://api-dev.largata.com/v1/health` → 200 in the standard envelope; same for preprod/prod URLs once ticket 03 promotes
- [ ] Env-var inspection: dev trusts `largata-dev`; preprod + prod trust `largata-prod`; only dev carries the `dev` profile
- [ ] `largata-prod` exists; no providers/apps configured in it beyond the bare project (mobile wiring is the parked story's)
- [ ] Repo diff is docs/config only — no real value from Railway's UI appears in any committed file (staged-diff scan green)

## Comments
