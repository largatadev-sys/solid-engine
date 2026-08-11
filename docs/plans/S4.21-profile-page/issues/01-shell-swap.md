# 01 — The shell swap: new profile screen takes the tab, old screen becomes the account page

**What to build:** Opening the profile tab lands on the new showcase surface: the mock's header rendering the signed-in traveler's real identity — avatar with initials fallback, display name, `@handle`, `· #` + vanity number verbatim, bio, each of the nullable lines omitted entirely when absent — with the Edit Profile pill routing to the existing profile editor in edit mode, the Diary/Itineraries tab switcher present with placeholder panes, and a cogwheel top-right. Tapping the cogwheel opens the current profile screen relocated to its own route as the account page: card, Edit profile, Reload, Sign out — and no My Diary section. The mock (root `Profile.dc.html`, frames 2a/2b) is the design baseline; workspace tokens; the cogwheel is a recorded founder override of the mock's glyph. See [spec](../spec.md) decisions 1, 3, 8, 9.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The profile tab renders the new header with real data; a traveler with null handle, bio, or vanity number gets a clean header with those lines absent
- [x] Edit Profile opens the existing editor prefilled; saving returns with the change visible
- [x] The tab switcher renders Diary selected by default, Itineraries switchable, mock treatment (active color + underline), placeholder panes
- [x] The cogwheel opens the account screen; Sign out signs out; Reload reloads; the My Diary section is gone from it
- [x] The Largata wordmark header no longer renders on the profile tab
- [x] Existing navigation intact: tab bar unchanged, back behavior sane from both new routes

## Comments
