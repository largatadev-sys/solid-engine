# 06: chat takes layers, and `ChatMessageResponse` leaves `api/`

**What to build:** the trip chat's module reads in the converted shape and chat behaves exactly as it does today, including refusing a body over the limit. Its `api/` holds `ChatMessageResponse`, wire, and `ChatLimits`, a constant read by the entity alone. The response moves to `dto/`, the limits to `entity/` beside `ChatMessage`, and `api/` goes with its named interface. `ChatMessageResponse.of(ChatMessageView)` stops being the guard's recorded breach the moment the record is a DTO. `ChatTopic` declares chat's topic over the transport, which is chat satisfying `ws`'s port, so it is an adapter.

**The move.** `controller/`: `ChatController`. `dto/`: `SendMessageRequest`, `ChatMessageResponse`. `entity/`: `ChatMessage`, `ChatLimits`. `repository/`: `ChatMessageRepository`. `exception/`: `ChatExceptions`. `service/`: `ChatService`, `ChatMessageView`. `adapter/`: `ChatTopic`.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule and its recorded-breach test on the ticket 01 pattern, keeps the outside-in rule with its allowlist (`common`, `identity`, `ws`), and is sabotage-checked with a real usage
- [ ] The body limit is still what the entity validates against and what the wire refuses, proven by the existing chat ITs, unedited
- [ ] No test changes but its package line and imports
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
