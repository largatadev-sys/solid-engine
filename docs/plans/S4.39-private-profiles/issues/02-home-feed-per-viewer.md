# 02 — Home feed per viewer, both scopes

**What to build:** a private author's postcards leave a stranger's Home and stay on a follower's, in the query, across every page — and a viewer with no private author anywhere in sight gets a page byte-identical to today's (spec decision 2, the read rule, and decision 14).

**Blocked by:** 01.

**Status:** done

- [x] **`GET /v1/feed/postcards` with `scope=all` or no scope** excludes every entry whose author is in the viewer's hidden-author set from ticket 01. **Set-based, in the query** — the S4.37 `IN :authorIds` shape and the archived-set shape are the precedents — never a post-filter in Java and never in the client, so cursor pagination stays exact: a page is `limit` visible entries, and the limit-plus-one probe respects the filter.
- [x] **An empty hidden set takes the existing query path unchanged**, asserted byte-for-byte against today's first page and today's after-cursor page for a viewer whose world has no private authors.
- [x] **`scope=following` is unchanged by construction** (a followee is never hidden) and asserted unchanged.
- [x] **Own postcards are always visible to their author** in either scope.
- [x] **Every read path the feed exposes consults the hidden set** — the first page, the after-cursor page, and whatever answers "are there newer posts" for the new-posts pill. Enumerate the feed's read paths before writing a line; a path missed here is a private postcard on a stranger's screen with every test green.
- [x] **ITs:** a private author's postcards absent from a stranger's feed and present on a follower's and the author's own; a public author's unchanged; pagination across a boundary where hidden entries sit between visible ones (the cursor must skip them without shortening the page); a co-traveler who does not follow sees nothing extra. Prior art: the S4.22 feed ITs and the S4.37 Following-scope ITs. Sabotage-checked.
