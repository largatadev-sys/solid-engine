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

**Sabotage run (2026-09-08).** `PostcardView` was given back an import of `com.largata.diary.entity.DiaryDay` and a method returning one. The guard failed, naming the offending class and where it entered:

```
Architecture Violation [Priority: MEDIUM] - Rule 'this replaces the eight-name mutator seal,
which forbade the calls it happened to list and let a ninth mutator through in silence. An
ALLOWLIST forbids the dependency itself, so Diary and DiaryDay are unreachable whatever their
methods are called' was violated (1 times):
Method <com.largata.postcard.service.PostcardView.sabotage()> has return type
<com.largata.diary.entity.DiaryDay> in (PostcardView.java:0)
```

Note what the failure names: the **dependency**, not a method call. That is the property the eight-name list could not give — the sabotage adds no call to any sealed method, so the old rule would have stayed green on it.
