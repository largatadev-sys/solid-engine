# 01: verification takes layers, and its three wire records leave `api/`

**What to build:** the `verification` module reads in the converted shape — a reader who knows `postcard` opens it and knows where everything is — and nothing a traveler can see moves: the same routes, the same bodies, the same codes. Its `api/` today holds `ConfirmCodeRequest`, `VerificationCodeResponse` and `VerificationResultResponse`, all wire and none called in-process, so they move to `dto/` and `api/` goes with its named interface. `VerificationCodeResponse.of(IssuedCode)` stops being the guard's recorded breach the moment the record is a DTO. This ticket sets the pattern every later `api/` deletion copies: the guard drops the contract rule ArchUnit would fail on an empty selection, drops the test that asserted the breach still fails, keeps its outside-in rule, and says why in that rule's reason.

**The move.** `controller/`: `VerificationController`. `dto/`: the three records. `entity/`: `VerificationCode`. `repository/`: `VerificationCodeRepository`. `exception/`: `VerificationExceptions`. `service/`: `VerificationService`, `VerificationCodes`, `IssuedCode`, `VerificationMail`, `VerificationAttempts` (a `REQUIRES_NEW` helper that stays its own bean), and the two port interfaces `EmailVerificationFlag` and `VerificationMailer`. `adapter/`: `FirebaseEmailVerificationFlag`, `UnconfiguredEmailVerificationFlag`, `EmailVerificationFlagConfig`, `FirebaseCredentials`, `LoggingVerificationMailer`, `ResendVerificationMailer`, `VerificationMailConfig`. Tests mirror; `web/` becomes `controller/`; the boundary test stays at the module root.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none; moves by `git mv`, staged by explicit path
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule and its recorded-breach test, keeps the outside-in rule and the allowlist, and its remaining rule is sabotage-checked with a real usage (field, parameter or return type), never an unused import
- [ ] No test changes but its package line and imports; no assertion, no fixture edited
- [ ] The two profile pairs (the verification flag, the mailer) still resolve exactly one bean each, proven by at least one IT run in each profile
- [ ] The unit test that reproduces the Admin SDK startup failure and pins the explicit `NetHttpTransport` stays green
- [ ] The spec's verification loop, in full: `clean test-compile` looped until quiet, the unit suite with its counts read, the module's ITs through failsafe with `failsafe:verify` and the counts read, CI green on the push
- [ ] `ModuleCycleTest`'s recorded set unchanged; `ModulithVerificationTest` still refuses postcard alone; `ModuleGuardMetaTest` green
- [ ] The last commit on the branch sets this ticket `resolved` and flips its glyph on the BUILD_STATUS ledger entry; the PR is opened, never merged unasked

## Comments
