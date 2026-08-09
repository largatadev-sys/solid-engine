# 02 — The day pencil

**What to build:** Renaming a day becomes visible. The expanded day header gains the activity rows' pencil-square (16px accent) beside the existing trash, mirroring the pencil+trash pair every activity row already shows; tapping it opens the **existing** inline rename input — placeholder, blur-commit, mutation untouched. Tapping the day title itself no longer does anything: the title's own rename Pressable retires, the pencil is the one affordance (spec decision 2). The "Day N" prefix stays static; the optional name is what renames. Members see the pencil (renaming is member-wide plan editing); the trash stays owner-only.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The expanded day header shows pencil + trash for owners, pencil alone for members (spec AC 2).
- [x] The pencil opens the rename input with the current name; a committed name persists on blur and renders after the "Day N" prefix.
- [x] Tapping the day title does nothing — the old Pressable and its accessibility label are gone.
- [x] Accessibility: the pencil carries a "Rename Day N" label, hitSlop matching the activity row's pencil.
- [x] Affordance visibility rides the existing pure-logic family if logic is needed; unit tests pin member-vs-owner visibility.
- [x] The rename walks on the emulator and the web preview (blur-commit on both platforms).
