# 12: Postcard detail, edit caption, delete, and filing a loose postcard into a diary

**What to build:** a postcard has a page. The owner opens it, edits the caption, deletes it, or files a loose one into a diary and a day in two steps; a visitor reads it and, when it sits on a day, follows the diary row to that day. Frames G1, G2, H1, H2, K3, L2 and M of the mock set.

**Blocked by:** 11 (The diary's owner acts).

**Status:** ready-for-agent

- [ ] Postcard detail (frame G1) renders the photo carousel with the count pill and dots, the caption, the place, and the author row with the posted date; the owner's kebab offers Edit caption, Add to diary (loose only) and Delete; the visitor's version (frame G2) has no kebab and shows the diary row only when the postcard sits on a day, opening the diary at that day
- [ ] The meta line for a postcard with no activity reads "Day N · date" with no time, the bold line is the place when set, and with no place the caption follows the meta directly (frame M)
- [ ] Edit caption saves on the CTA; Back with unsaved changes asks before discarding
- [ ] Delete shows L2 and, on confirm, exits the card optimistically wherever it is shown; a failed request brings it back with the dark toast
- [ ] Add to diary opens the two-step picker: H1 lists the server's diaries most recently updated first, grows to about seventy percent of the screen then scrolls with Cancel pinned, adds a search field past eight diaries, skips to H2 with one diary, and offers "New Diary" with none; H2 lists that diary's stored days with their postcard counts and a selected check, and the CTA reads "Add to Day N"
- [ ] Filing succeeds with the sheet out, the loose card leaving the top of the tab, the section growing by one and the "Added to <diary>" toast; a failure keeps the sheet open with the inline copy
- [ ] The loose card's kebab (frame K3) offers Edit caption, Add to diary and Delete; a homed postcard's kebab omits Add to diary
- [ ] The web-lane Playwright walk opens a postcard as owner and visitor, recaptions, files a loose one and deletes one; a Jest suite pins the meta-line helper

## Comments
