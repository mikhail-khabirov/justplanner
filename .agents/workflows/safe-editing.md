---
description: Mandatory pre-edit checks to avoid breaking existing functionality
---

# Safe Editing Workflow

**BEFORE modifying any file:**

1. **Always read the FULL file first** — use `view_file` without line limits to see everything, not just the section you plan to edit.
2. **Never overwrite a file with `write_to_file`** — use `replace_file_content` or `multi_replace_file_content` for surgical edits. Overwriting risks losing unrelated code in the same file.
3. **After editing, verify no code was lost** — compare the file's function/route count before and after. Use `view_file_outline` to confirm all original items remain.
4. **If removing features, grep for all references first** — ensure nothing depends on the code being removed. Check both frontend and backend.

## Lesson Learned

Commit `d392f28` overwrote `server/routes/settings.js` to remove task limit logic, but accidentally deleted all Telegram integration routes (`/telegram/status`, `/telegram/link`, `/telegram/unlink`) and the survey route (`/survey`). This caused a production bug where all users saw "Подключить Telegram" even when already connected. The fix required restoring 93 lines of deleted code from git history.

**Root cause:** Used `write_to_file` (full overwrite) instead of `replace_file_content` (targeted edit), without reading the full file first.
