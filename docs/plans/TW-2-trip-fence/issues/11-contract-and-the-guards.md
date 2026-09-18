# 11: Contract — the old doors and the dead types are deleted, and the guards that make forgetting a build failure go green

**What to build:** the expand–contract's last step and the story's structural promise. With every caller migrated (tickets 04–10), `WriteFence`, `AudienceFence`, the old `InAudience`, `TripArchivedException` and `TripApi.frozen` are deleted — nothing constructs or calls them. Then the guards, each a property of the build and none a by-name exemption list, each sabotage-checked before it ships: **only the fence refuses** — `ItineraryPublishedException` and `MembershipFrozenException` are constructed only inside `TripFence`, and `NotTheTripOwnerException` only inside `Owner.of` and the acts whose rule is owner-*or*-someone, counted as a ratchet with the list printed in the assertion; **only the resolver mints `Membership`** — `new Membership(…)` appears in production code only in the workspace adapter; **the bare-standing ratchet** — the number of service methods taking `Owner` or `Membership` with no state proof is at most its count at close (archive, unarchive, destroy, self-leave), the list printed, never held as a set; `AudienceFenceCoverageTest`'s name-set shrinks to whatever a proof does not now cover; and **the trip module's outbound allowlist** is born in `TripModuleBoundaryTest`, naming exactly what trip imports — a measurement worth having (it will say `common`, `itinerary.api`, `identity`). Spec decisions 10, 16; grilling Q8.

**Blocked by:** 04, 05, 06, 07, 08, 09, 10 — every migration.

**Status:** ready-for-agent

- [ ] `WriteFence`, `AudienceFence`, the pre-fence `InAudience`, `TripArchivedException` and `TripApi.frozen` no longer exist; the wire code `TRIP_ARCHIVED` is emitted by nothing
- [ ] *Only the fence refuses*: an ArchUnit rule pins the two freeze refusals to `TripFence`; the owner refusal's constructions outside `Owner.of` are counted, the count is at most the number at close, and the list is printed in the assertion — sabotage-checked by adding one `throw new` in a service
- [ ] *Only the resolver mints `Membership`*: sabotage-checked by constructing one in a service
- [ ] *The bare-standing ratchet*: the four acts by name in the printed list; adding a fifth turns it red with the new method named — checked
- [ ] `AudienceFenceCoverageTest`'s `OWNER_ONLY_OR_DELIBERATELY_UNFENCED` set has lost every handler a proof now covers, and its *stale exception* test still passes
- [ ] `TripModuleBoundaryTest` gains the outbound allowlist; what it names is recorded on this ticket, and epic-map line 212 is annotated **done**
- [ ] `ModulithVerificationTest` and every boundary guard report the same refusals as at `dev`; `ApiIsNeverWireTest` green — no proof type appears in a controller signature
- [ ] Full backend suite green locally (`mvn -o clean test-compile failsafe:integration-test failsafe:verify` plus `surefire:test`, counts read); CI green on push

## Comments

*None yet.*
