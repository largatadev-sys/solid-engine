# 01 — The storage rig: bucket at compose-up, pinned emulator, backend storage client

**What to build:** the ground the pipeline stands on — a clean checkout composes up into a stack whose object store exists and works, and the backend can put/get/delete bytes in it. No product surface yet; this is the prefactor that makes every later ticket an easy change (spec decision 12, ADR-021).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `docker compose up` from a clean checkout yields a working bucket, created at compose-up — the fresh-stack semantics extend to storage: fresh DB, fresh bucket, every redeploy.
- [x] The emulator image is pinned (or swapped to Garage — implementer's call per decision 12; criteria: S3-compatible, healthcheckable, Testcontainers-workable), and the choice is recorded in this ticket's comments. MinIO community edition is EOL'd — `minio:latest` is the rot this closes.
- [x] The backend gains an S3-compatible storage client behind its own config surface — endpoint, credentials, bucket name from env; placeholders in `.env.example` only, secrets gitignored (the structural never-commit rule).
- [x] A storage IT via the `testcontainers-minio` module (noted at S0.1 ticket 04 for exactly this day) round-trips bytes — put → get → delete — green in the suite. Watch the two recorded Windows Testcontainers wedges: `jstack` the fork and read the parked frame before picking a fix.
- [x] No product endpoint, no schema change, no mobile change; backend suite green.

## Comments

**1 · Garage, not a pinned MinIO — and compose now speaks a different S3 implementation from the ITs, deliberately.** Decision 12 left the emulator to the implementer. MinIO stopped publishing community images in Oct 2025 and archived the repo in 2026, so `minio/minio:latest` resolves to an archived repository whose last image carries unpatched CVEs — pinning it would be pinning to a dead end. Compose runs **Garage v2.3.0**; the Testcontainers IT keeps **MinIO at an explicit tag** (`RELEASE.2025-09-07T16-13-09Z`, the last published one). Running the two on different implementations is free evidence that nothing has grown a dependency on one vendor's behaviour — which is the whole premise of the provider being swappable.

**2 · Three Garage traps, none of which the research predicted, all hit in sequence.** (a) The image declares **no ENTRYPOINT** — its `Cmd` is `["/garage","server"]` — so `command: server --single-node` replaces argv[0] and dies with `exec: "server": executable file not found in $PATH`, which reads as a broken image rather than a replaced argument. The command must name `/garage` itself. (b) It is a **from-scratch image**: no shell, no `wget`, no `curl`, so the documented `wget .../health` healthcheck cannot run — the only executable in the image is the binary, so the probe is `/garage status`. (c) `--default-bucket` configures the *bucket*, not the server: Garage still refuses to boot without `/etc/garage.toml`, which the image does not ship. It is now `infra/garage.toml` (ports, data paths, single-node RPC secret — a local-dev constant protecting nothing that exists outside `docker compose up`).

**3 · The access key must be ≥8 characters, and the failure arrives late.** `largata` (7) is rejected with `Invalid default access key` — but only *after* a fully successful-looking cluster init, layout computation and partition assignment, so the logs read like a healthy boot right up to the last line. The default is `largata-local`.

**4 · `MinIOContainer` did NOT move packages at Testcontainers 2.x.** The 2.x rename (`postgresql` → `testcontainers-postgresql`) applies to the **artifact**, and the class relocation that came with it (`org.testcontainers.containers` → `org.testcontainers.postgresql`) has **not** happened for the MinIO module: at 2.0.5 the class is still `org.testcontainers.containers.MinIOContainer`. Generalising the rename cost a compile cycle; `jar tf` on the artifact is the authority, not the pattern.

**5 · The R2 checksum setting is pinned by a test with a real failure mode, because no environment can fail on it.** AWS SDK ≥2.30 sends `x-amz-sdk-checksum-algorithm` by default and **R2 does not implement CRC32** — so every local rung and every IT stays green (Garage and MinIO both accept it) while production would break on first upload. That is the `getTokens()` shape exactly. `S3ClientConfigurationTest` drives the SDK against a recording HTTP endpoint and asserts the header is absent; **sabotage-verified** — flipping `WHEN_REQUIRED` to `WHEN_SUPPORTED` fails it naming the exact header R2 rejects.

**6 · The backend never creates a bucket, and that is a decision.** An `ensureBucket()` on startup was written and removed: it would require the production credential to hold bucket-creation rights, when the deployed bucket is provisioned once by the platform (ticket 05) and the credential should be scoped to object operations. Bucket creation is infrastructure's job — Garage's `--default-bucket` locally, the platform on a rung, an explicit `createBucket` in the IT's own fixture.

**7 · Verification.** Backend **128 unit tests** (up from 122) + the 4-test `S3ObjectStoreIT` against a real MinIO container, all green; `FirebaseAdminSdkBootTest` still passes, which is the standing canary for the transitive-HTTP-transport trap the pom comment records. Full stack verified up from clean: `docker compose down -v` → `up -d` → all three services **healthy**, `/v1/health` 200, and `garage bucket list` showing `largata-media` created at boot.
