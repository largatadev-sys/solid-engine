# 00 · Requirements Brief  `[FRONT DOOR — precedes Artifact 01]`

**Architect's question:** *What did we agree we're building, and is every one-way-door decision settled enough to start designing?*

This is the playbook's front door. It captures the **settled, design-shaping agreements** — transcribed from the founder discussion doc once that conversation has converged — in the form the design phase consumes. It holds only what *shapes the build*; it feeds Artifact 01.

> **Where it comes from:** the `requirements-discussion.template.md` conversation (held outside the repo). This file is the *recording* of that conversation's design-relevant conclusions — not where the conversation happens.
>
> **What it deliberately excludes:** the "what does worth-continuing mean" agreement. That's a go/no-go rule on the *result*, not an input to the design — so it lives at the **validation gate (playbook §6)** as the kill criteria, decided by you + whoever measures it, not here.

---

## How to use

- **Transcribe the settled agreements** from the discussion doc. Each area keeps its **Resolution** state: **Agreed / Disputed / Undecided**.
- **The handoff gate at the bottom blocks the playbook.** You may not proceed to Artifact 01 until every one-way-door area is **Agreed**. An unresolved one-way door is the one thing that must not pass into design.
- **The examples are thinking-sharpeners**, carried over from the discussion doc — contrasting shapes to react against, not a menu.

---

## 1. Problem & why-now → *feeds Artifact 01*

**Problem.** `<what's broken, who feels it, what they do today instead>`
**Why now.** `<what makes this worth doing now>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** *(shapes, not a menu)* — **Drudgery:** a hated manual task the app removes · **Inaccessibility:** a thing too slow/costly to do today · **Leakage:** a thing done badly, losing time/money. *Which shape, and what's the twist?*

---

## 2. Actors → *feeds Artifact 01 + the domain (02) + authorization (04)*  · **one-way door**

**Actors.** `<every distinct kind of user/role — who pays, who uses, who else touches it>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** — **One user does everything** (personal tool) · **Buyer ≠ user** (owner pays, staff operate, customer consumes) · **Two-sided** (the value is the match). *How many distinct kinds, and who pays vs. uses?*

---

## 3. Core domain objects & the journey → *feeds Artifact 02*

**Core objects.** `<the main things: order / booking / case / client / listing …>`
**The journey.** `<one object's life: created → … → resolved>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** — **Transaction lifecycle** (created → in progress → resolved) · **Catalog + selection** (browse → pick → configure) · **Accreting record** (a file/account that gains history). *Walk one through its life; the stages are your state machine.*

---

## 4. The rules that must never break — invariants → *feeds Artifact 02*

**Invariants.** `<numbered: things that must always hold / must never happen>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** — **Never** (double-booked slot; invoice edited after payment) · **Always** (every order belongs to one account; total = sum of lines) · **Trust/safety** (users see only their own data; no money moves without a server check). *What would be a disaster if it happened?*

---

## 5. One-or-many / scale / tenancy → *feeds Artifact 03*  · **the big one-way door**

**Scale.** `<roughly how many users / organizations>`
**Tenancy.** `<one org (internal) / many isolated orgs / many users in one shared space>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** — **Single org** (internal, no tenancy question) · **Many isolated** (orgs that must NOT see each other) · **Many shared** (one common space, shared data). *One world, or many walled-off ones?*

---

## 6. Constraints & non-goals → *feeds Artifact 01 (non-goals) + Artifact 04*

**Hard constraints.** `<regulatory, integrations, deadlines, budget, platform lock-in>`
**Non-goals (explicit).** `<what this deliberately will NOT do — now or in v1>`
**Resolution.** ⬜ Agreed / Disputed / Undecided

> **▸ Examples** — **Regulatory** (payments, health data, privacy) · **Integration** (an existing system it must work with) · **Hard limits** (deadline, budget, platform lock-in) · **Non-goals** (no payments v1; no mobile yet; single location). *What's off the table, and what are you deferring?*

---

## Success / validation → *not decided here*

The "what does worth-continuing mean" agreement is **not** a design input. It lives at the **validation gate (playbook §6)** as the kill criteria — a threshold committed to in advance and measured later by you + whoever owns the numbers. Recorded here only as a pointer so the thread isn't lost:

**Kill criteria →** see the validation gate (§6). Agreed in the discussion doc; owned by validation, not design.

---

## Handoff gate — may we start designing?

Proceed to **Artifact 01** only when **every one-way-door area is Agreed**. Each area maps to the artifact it feeds:

| Area | Feeds | One-way door? | Resolution |
|------|-------|:---:|:---:|
| Problem & why-now | Artifact 01 | | ⬜ |
| Actors | 01 + 02 + 04 | **yes** | ⬜ |
| Domain objects & journey | Artifact 02 | | ⬜ |
| Invariants | Artifact 02 | | ⬜ |
| Tenancy / scale | Artifact 03 | **yes** | ⬜ |
| Constraints & non-goals | 01 + 04 | | ⬜ |

**Gate:** all one-way-door rows **Agreed** and the discussion doc's disagreement register clear → begin Artifact 01. Otherwise, resolve first. Do not start designing on an unsettled one-way door.
