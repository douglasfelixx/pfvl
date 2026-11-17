---
name: PFVL language policy
description: Language selection, persistence, and the boundary between interface translation and user-authored content.
---

Translate static interface text between Brazilian Portuguese and English. The default locale is Brazilian Portuguese, and the visitor's choice should persist across routes and reloads.

Use recognizable graphic flags for Brazil and the United States. Desktop header switching uses the flags directly; on mobile, show the current flag in a compact selector that opens a list with both flags and language names. Profile preference choices also show each flag with its language name.

Keep user-authored posts, comments, replies, suggestions, and configured category/tag values in the language in which they were written.

Use “Conteúdos” rather than “Blog” for the reader-facing section name in menus and buttons.

**Why:** the PFVL owner selected interface-only English translation, requested country flags in the header, asked for language names in the mobile selector and profile, and chose “Conteúdos” as the visible section label.

**How to apply:** translate labels, navigation, help text, buttons, and metadata; keep content fields returned from the API unchanged. Use “Conteúdos” for visible menu/button labels; keep desktop header selection flag-only, make the mobile header a compact flag trigger that opens a list of both language names, and display translated language names beside flags in profile settings.
