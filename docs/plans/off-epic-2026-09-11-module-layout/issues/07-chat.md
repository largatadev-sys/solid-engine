# 07: chat takes layers, and `ChatMessageResponse` leaves `api/`

**What to build:** `chat` moves onto the layer folders. Its `api/` holds `ChatMessageResponse`, wire, and `ChatLimits`, a constant the entity reads. The response moves to `dto/`, the limits to `entity/` beside `ChatMessage`, and `api/` is deleted. `ChatMessageResponse.of(ChatMessageView)` is the guard's recorded breach; it stops being one the moment the record is a DTO, and the test asserting the breach still fails is deleted with the package. `ChatTopic` declares chat's topic over the transport, which is chat satisfying `ws`'s port, so it is an adapter.

| Folder | Files |
|---|---|
| `controller/` | `ChatController` |
| `dto/` | `SendMessageRequest`, `ChatMessageResponse` |
| `entity/` | `ChatMessage`, `ChatLimits` |
| `repository/` | `ChatMessageRepository` |
| `exception/` | `ChatExceptions` |
| `service/` | `ChatService`, `ChatMessageView` |
| `adapter/` | `ChatTopic` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `chat/api/` and its `package-info.java` are gone; `ChatModuleBoundaryTest` loses its contract rule and its recorded-breach test, keeps the outside-in rule with its allowlist (`common`, `identity`, `ws`), and says why
- [ ] `ChatLimits.MAX_BODY_LENGTH` is still what the entity validates against and what the wire refuses at 2,001 characters — proven by the existing chat ITs, unedited

## Comments
