# 05 — End-to-end: authenticated /v1/me on device

**What to build:** The full slice joined up: the signed-in traveler's ID token rides every API call through the typed apiClient (ADR-001 — token attach lives in the one client, never in UI code), the me-screen renders what `GET /v1/me` returned, and an `UNAUTHENTICATED` response routes to sign-in. This is where the story's device ACs close, and the **one** exercise of the real-Firebase seam (a human signing in and hitting the real backend) happens.

**Blocked by:** 02 — Traveler provisioning · 04 — Firebase sign-in.

**Status:** ready-for-agent

- [ ] **(device AC)** Sign in on the AVD (Google, then email) → me-screen shows the Traveler from `GET /v1/me` against the composed stack
- [ ] **(device AC)** First-ever sign-in provisions the Traveler exactly once — row observed in Postgres; signing out and back in creates nothing new
- [ ] Signed out → protected call returns 401 envelope → app routes to sign-in (observed on-device)
- [ ] Display name on the me-screen: Google account shows profile name; email account shows local-part
- [ ] `userId` appears in backend request-scoped logs for the on-device session's calls
- [ ] Jest: token attach on requests, 401-to-sign-in routing, signed-out state — SDK mocked at the boundary
