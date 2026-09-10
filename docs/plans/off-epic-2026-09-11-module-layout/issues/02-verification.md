# 02: verification takes layers, and its three wire records leave `api/`

**What to build:** `verification` moves onto the layer folders. Its `api/` holds `ConfirmCodeRequest`, `VerificationCodeResponse` and `VerificationResultResponse` — all three are wire, none is called in-process — so they move to `dto/` and `api/` is deleted. `VerificationCodeResponse.of(IssuedCode)` is the guard's recorded breach; it stops being one the moment the record is a DTO, and the test asserting the breach still fails is deleted with the package.

| Folder | Files |
|---|---|
| `controller/` | `VerificationController` |
| `dto/` | `ConfirmCodeRequest`, `VerificationCodeResponse`, `VerificationResultResponse` |
| `entity/` | `VerificationCode`, `VerificationAttempts` if it is the row's value type (confirm by reading) |
| `repository/` | `VerificationCodeRepository` |
| `exception/` | `VerificationExceptions` |
| `service/` | `VerificationService`, `VerificationCodes`, `IssuedCode`, `VerificationMail`, and the two port interfaces `EmailVerificationFlag`, `VerificationMailer` |
| `adapter/` | `FirebaseEmailVerificationFlag`, `UnconfiguredEmailVerificationFlag`, `EmailVerificationFlagConfig`, `FirebaseCredentials`, `LoggingVerificationMailer`, `ResendVerificationMailer`, `VerificationMailConfig` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `verification/api/` and its `package-info.java` are gone; `VerificationModuleBoundaryTest` loses its contract rule and its recorded-breach test, keeps the outside-in rule, and says in the `.as()` why the module publishes no `api`
- [ ] The profile-pair configurations still resolve exactly one bean each — run at least one IT in each profile, since the collision only appears where both exist
- [ ] The Admin SDK transport stays `NetHttpTransport`, stated explicitly (S4.0's 503 trap), proven by the unit test that reproduces the startup failure and not by reading

## Comments
