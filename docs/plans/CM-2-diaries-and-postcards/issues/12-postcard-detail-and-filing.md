# 12: Postcard detail, edit caption, delete, and filing a loose postcard into a diary

**What to build:** a postcard has a page. The owner opens it, edits the caption, deletes it, or files a loose one into a diary and a day in two steps; a visitor reads it and, when it sits on a day, follows the diary row to that day. Frames G1, G2, H1, H2, K3, L2 and M of the mock set.

**Blocked by:** 11 (The diary's owner acts).

**Status:** done

- [x] Postcard detail (frame G1) renders the photo carousel with the count pill and dots, the caption, the place, and the author row with the posted date; the owner's kebab offers Edit caption, Add to diary (loose only) and Delete; the visitor's version (frame G2) has no kebab and shows the diary row only when the postcard sits on a day, opening the diary at that day
- [x] The meta line for a postcard with no activity reads "Day N · date" with no time, the bold line is the place when set, and with no place the caption follows the meta directly (frame M)
- [x] Edit caption saves on the CTA; Back with unsaved changes asks before discarding
- [x] Delete shows L2 and, on confirm, exits the card optimistically wherever it is shown; a failed request brings it back with the dark toast
- [x] Add to diary opens the two-step picker: H1 lists the server's diaries most recently updated first, grows to about seventy percent of the screen then scrolls with Cancel pinned, adds a search field past eight diaries, skips to H2 with one diary, and offers "New Diary" with none; H2 lists that diary's stored days with their postcard counts and a selected check, and the CTA reads "Add to Day N"
- [x] Filing succeeds with the sheet out, the loose card leaving the top of the tab, the section growing by one and the "Added to <diary>" toast; a failure keeps the sheet open with the inline copy
- [x] The loose card's kebab (frame K3) offers Edit caption, Add to diary and Delete; a homed postcard's kebab omits Add to diary
- [x] The web-lane Playwright walk opens a postcard as owner and visitor, recaptions, files a loose one and deletes one; a Jest suite pins the meta-line helper

## Comments

- *2026-09-06:* the screens are built and typecheck clean; the Playwright walk waits on the routes (see ticket 08's comment), which nothing mounts yet.
- *2026-09-06, fidelity pass:* frames G1, G2, H1, H2, K3, L2 and M rebuilt to the handoff README — the square paging carousel with the count pill and 6px dots, Figtree body at 15/1.45, the place row with the pin, the diary row on #FAF9F5 with its book icon, the author row from the response's new `author` card, H1/H2 in the M1 sheet with the step labels and the #FFF7ED selected day, L2 in the confirm anatomy. K3 is wired on the Diary tab as well as on the page: Edit caption opens the editor, Add to diary opens H1/H2 and the loose card plays M4's exit on success, Delete confirms with L2 and exits optimistically. **"Edit caption saves on the CTA" was a false tick in the first pass — no editor existed.** It does now: an Edit Caption screen in F's anatomy (POSTCARD pill, caption area, Save, "Discard changes?" on Back) at its own route beside the postcard page, which moved into a directory to make room. The mock set draws no frame for it, so its anatomy is F's, copied.
- *2026-09-06, the walk ran:* frame G2's diary row was derived from the *viewer's* own sections, so a visitor never saw it; it now comes from the postcard's own diary through the diary read, which a visitor may make. The author row lost the handle line the frame does not draw.
- *2026-09-06, the walk's filing test:* H2 files on its CTA ("Add to Day N"), not on the row tap the first pass had; the walk presses it now.
- *2026-09-06, founder ruling on the phone:* **editing a postcard includes its photos.** "Edit caption" became **Edit postcard**: the screen carries the photo strip (stored photos with a remove check, an add tile up to five) above the caption, and saves on the CTA in three acts — recaption, then the added photos, then each removal, so the one-photo floor never trips mid-way. Two additive server acts carry it: `POST /v1/postcards/{id}/photos` (multipart, five in total at most) and `DELETE /v1/postcards/{id}/photos/{photoId}` (never the last one; a photo of another postcard is not found), both author-only and both respecting the archive freeze — `PostcardPhotosContractIT`, five cases. The contract doc lists both.
