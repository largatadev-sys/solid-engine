# CM-5 — the local-stack walk

**Why this is on the local stack and not on `dev`.** `dev` is the only running environment and `founders.largata.com` points at it, so a merge *is* the deployment with nothing behind it. CLAUDE.md's ruling: *"prefer walking that surface on the local stack before the merge over relying on a promotion gate that does not exist yet."* Ticket 08's walk belonged to the first PR and never happened, because the two PRs became one — so this is the only walk this story gets, and it happens **before** the merge.

**What CM-5 changed that a traveler can reach:** publishing now mints an Itinerary with its own address; the page, Discover, Home and the profile read that object by its id; forking copies the Itinerary; unpublish/republish and "view published" act from the profile card's menu; and links shared with the old trip id must still resolve.

## Stand it up — on the LAN, for a real phone

The founder walks this on a phone, so the stack is bound to the **LAN IP**, not `localhost`. Four things must name that IP and two of them fail silently.

```bash
# The IP changes when the router re-leases. A stale one reads as a dead backend.
powershell "Get-NetIPAddress -AddressFamily IPv4 | ? {$_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL'}"
LAN=192.168.1.115                                    # <-- re-check every session

LARGATA_CORS_ALLOWED_ORIGINS="http://localhost:8081,http://127.0.0.1:8081,http://10.0.2.2:8081,http://$LAN:8081" LARGATA_WEB_BASE_URL="http://$LAN:8081"   docker compose up -d --build

cd mobile && set -a && . ./.env && set +a
docker build -f Dockerfile.web-preview   --build-arg EXPO_PUBLIC_API_BASE_URL="http://$LAN:8080"   --build-arg LARGATA_WEB_BASE_URL="http://$LAN:8081"   --build-arg EXPO_PUBLIC_FIREBASE_API_KEY --build-arg EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN   --build-arg EXPO_PUBLIC_FIREBASE_PROJECT_ID --build-arg EXPO_PUBLIC_FIREBASE_APP_ID   --build-arg EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID -t largata-preview:lan .
docker run -d --name largata-preview-lan -p 8081:8080 -e PORT=8080   --network app_default -e LARGATA_API_UPSTREAM=backend:8080 largata-preview:lan
```

**Prove it rather than trust the build args** — the two that fail silently:

```bash
# 1. the bundle BAKED the LAN IP (EXPO_PUBLIC_* are inlined at export, so a
#    localhost build makes the PHONE call itself)
docker run --rm --entrypoint sh largata-preview:lan -c "grep -c '$LAN:8080' /srv/_expo/static/js/web/*.js"   # >= 1
docker run --rm --entrypoint sh largata-preview:lan -c "grep -c 'localhost:8080' /srv/_expo/static/js/web/*.js"  # 0

# 2. CORS admits the LAN origin, checked on a SECURED route — /v1/health answers
#    either way and proves nothing
curl -si -X OPTIONS http://$LAN:8080/v1/me -H "Origin: http://$LAN:8081"   -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization" | grep -i allow-origin
```

Windows classifies most Wi-Fi as **Public** and blocks inbound, so the phone simply times out with everything on the host healthy. The rule is scoped to two ports and already exists from FB-2:

```bash
powershell "Get-NetFirewallRule -DisplayName 'Largata LAN preview' | Get-NetFirewallPortFilter"
```

**Two things on this rung are expected, not bugs.** Google's button will not render — authorized origins are console-registered and Google will not accept a bare IP; sign in with **email + password** as the pool. And `http://<LAN-IP>` is **not a secure context**, so every secure-context-only browser API is silently absent — before concluding a feature is broken here, load the same page on `localhost` and compare `window.isSecureContext`.

## Stand it up on localhost instead (the fallback)

```bash
docker compose up -d --build
curl -s http://localhost:8080/v1/health          # {"status":"ok"}

cd mobile && set -a && . ./.env && set +a
docker build -f Dockerfile.web-preview \
  --build-arg EXPO_PUBLIC_API_BASE_URL="http://localhost:8080" \
  --build-arg LARGATA_WEB_BASE_URL="http://localhost:8081" \
  --build-arg EXPO_PUBLIC_FIREBASE_API_KEY --build-arg EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --build-arg EXPO_PUBLIC_FIREBASE_PROJECT_ID --build-arg EXPO_PUBLIC_FIREBASE_APP_ID \
  --build-arg EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID -t largata-preview:cm5 .
docker run -d --name largata-preview -p 8081:8080 -e PORT=8080 \
  --network app_default -e LARGATA_API_UPSTREAM=backend:8080 largata-preview:cm5
```

**Open `http://localhost:8081`, never another port.** The backend mints every share link from its own `LARGATA_WEB_BASE_URL`, so a walk begun on 8082/8083 hands itself to whatever sits on 8081 — the S4.31 trap, which manufactures a complete phantom result.

Sign in with **email + password**. Google's button will not render on this rung and that is expected, not a bug.

## Who plays whom

| Tag | Role in this walk |
|---|---|
| **t1** | the author — publishes, unpublishes, republishes, edits details |
| **t2** | a member of t1's trip — sees the frozen workspace |
| **t3** | a stranger — reads the page, forks it |

The pool has no display names on purpose, so every screen shows `largata.dev+t1` and you never have to hold a mapping in your head.

## The mechanical half is automated — run it first

```bash
cd mobile && set -a && . ./.env && set +a && node scripts/walk-cm5.js
```

Eleven checks over the steps below whose answer is a status code, an id or a
substring rather than a judgement: the identity publishing mints, the page read
by that id, the absence of the trip's dates, a stranger reading a private
author, the courtesy link, the fork's provenance and datelessness, unpublish
taking effect on the SERVER, republish keeping the address, archive masking the
page and fencing both acts, and reopen refused on a published trip.

**Run it against a backend built from this branch.** Its first run here reported
two failures that were not real: the stack had come up twelve minutes before the
archive-fence commit, so the container held the previous jar. `docker compose up
-d --build backend` and re-run before believing any red — a stale container
reports a fixed regression as a live one, and the two are indistinguishable in
the output.

## The walk

Ten steps. Each names **what to look at**, because most of these fail by looking plausible.

**1 · Publish, as t1.** Make a trip, add a day and an activity, walk it to Completed, open Preview, publish. → You land on *"Your Itinerary is Live!"* **Look at:** the browser console. It must be clean. This screen used to 404 on every publish — it rendered correctly anyway, because a fallback rescued it, so the console was the only witness.

**2 · The page's address.** From the success screen, open the itinerary. **Look at the URL:** it carries the **Itinerary's** id, not the trip's. Publishing creates a new object; the trip keeps its own id.

**3 · Republish keeps the address.** Unpublish from the profile card's kebab, then Republish. **Look at:** the URL after republishing — the **same** id as step 2. A shared link must not die because its author republished.

**4 · Unpublish actually unpublishes.** After the unpublish in step 3, before republishing, reload the trip in the workspace. **Look at:** the PUBLISHED pill is gone and the plan is editable again. The toast fires optimistically regardless of what the server said, so the toast is not evidence — the pill and the editability are.

**5 · Edit details still opens the trip.** From the same kebab, choose *Edit itinerary details*. **Look at:** the editor opens on the trip, not a 404. This menu carries the Itinerary's id and this one act needs the trip's.

**6 · The stranger reads it, as t3.** Sign out, sign in as t3, open Discover, find t1's itinerary, open it. **Look at:** it opens in full for someone who is not a member and does not follow t1 — ADR-034: a published Itinerary is readable by every signed-in traveler. Then set t1's profile to private and repeat: **still readable.** Profile Visibility never governs an Itinerary.

**7 · No dates on the page.** On that same page, open the browser's network tab and read the response for the itinerary. **Look at:** no `startDate`, no `endDate`, anywhere in the body — including inside the `plan` blob. A published Itinerary is a reusable plan, not a dated trip.

**8 · Fork it, as t3.** Fork from the page. **Look at:** the copy is upcoming, has no dates, no cover, no members, and its credit line names **t1's handle**. Then have t1 unpublish, and reload t3's fork: the credit survives and stops linking.

**9 · The old link still resolves.** Take a `/published/<trip id>` URL — the shape shared before this story — and open it. **Look at:** it resolves and the URL rewrites itself to the Itinerary's id. This courtesy has a dated end (2026-10-10).

**10 · Archive hides it.** As t1, archive the published trip. As t3, open the page. **Look at:** not found, not a 403 — archive masks rather than refuses. Unarchive and it comes back.

## What this rung cannot close

Native gesture handling, keyboard avoidance, hardware back and Reduce Motion all run different code on a device. And **do not judge animation smoothness here** — react-native-web animates from a `requestAnimationFrame` loop, so the whole preview is uniformly stuttery by construction. A *uniformly* rough animation is the platform; one that freezes or jumps is a bug.

## Reset between attempts

`docker compose down && docker compose up -d --build`. The database has no volume by design, and months of earlier walk fixtures otherwise bury whatever you just made on any recency-ordered surface.
