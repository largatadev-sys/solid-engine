# 03 — The promotion pipeline, executed once — and a backup that provably restores

**What to build:** The story's central AC: the dev→preprod→prod chain run end-to-end, for real, at owner-approved checkpoints (**promotions are propose-first — every rung waits for approval; nothing here is autonomous**). Cherry-pick the verified changes from `dev` → `preprod` (watch the CLAUDE.md footgun: track inter-change dependencies — a subset that built on dev may not build on preprod), verify preprod's health, then promote `preprod` → `main` and watch prod deploy. Then prod data protection: enable Railway Postgres backups on prod and **perform one restore** — snapshot, restore, row-level spot check. An enabled-but-never-restored backup is a hope, not a backup (playbook: data-loss ranks first).

**Blocked by:** 01 (environments exist) · 02 (the artifact being promoted runs Postgres 18 everywhere).

**Status:** open

- [ ] `dev` → `preprod` cherry-pick **proposed, approved, executed**; `https://api-preprod.largata.com/v1/health` → 200
- [ ] `preprod` → `main` promotion **proposed, approved, executed**; `https://api.largata.com/v1/health` → 200 — prod is live
- [ ] Flyway history on prod matches the migration set (V1…Vn, all applied; Hibernate `ddl-auto: validate` boots clean)
- [ ] Prod backups enabled; one snapshot restored; spot check passes (e.g. `flyway_schema_history` rows survive the round-trip)
- [ ] The promotion is documented as the repeatable procedure (a short runbook note in this ticket's comments — which branches, which approvals, what to check at each rung)

## Comments
