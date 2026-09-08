# 03: Diary's guard stops failing open

**What to build:** diary gets the guard every other content module has, and loses the one that cannot hold. Today diary is protected by a list of eight mutator names, forbidding outsiders to call those methods — a denylist that fails open, because a ninth mutator added tomorrow is not on the list and nothing goes red. Its own message says it exists because postcard holds diary's stored types, which stops being true in ticket 01. It is replaced by the allowlist every other module uses: nothing outside diary may depend on anything but its published contract and its refusals, whatever the method is called.

The replacement is a strictly stronger rule, so the name list is deleted rather than kept beside it. A stale name list is worse than none once a structural rule makes it redundant.

**Blocked by:** 01 (The entity leak closes).

**Status:** ready-for-agent

- [ ] Nothing outside the diary module depends on anything but its published contract and its refusals
- [ ] The eight-name list is gone, not kept alongside
- [ ] The guard carries the same sabotage checks its siblings do: the module was seen, and each predicate selects something, so a rule that matched nothing could not pass
- [ ] Sabotage recorded in this ticket's comments with the failure line read: a re-introduced import of a diary stored type from postcard makes the guard name the offending class
- [ ] Adding a mutator to a diary stored type changes nothing about whether the guard holds, which is the property the old list could not give

## Comments
