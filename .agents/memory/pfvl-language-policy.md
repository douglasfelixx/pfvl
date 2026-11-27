---
name: PFVL language policy
description: Language selection, persistence, and the boundary between interface translation and user-authored content.
---

Translate static interface text between Brazilian Portuguese and English. The default locale is Brazilian Portuguese, and the visitor's choice should persist across routes and reloads.

Keep language selectors hidden in the desktop and mobile headers and out of profile settings. An existing saved language preference continues to control interface translation; new accounts default to Brazilian Portuguese.

Keep user-authored posts, comments, replies, suggestions, and configured category/tag values in the language in which they were written.

Use “Conteúdos” rather than “Blog” for the reader-facing section name in menus and buttons.

**Why:** the PFVL owner selected interface-only English translation, later requested that language controls be removed from the header and profile settings, and chose “Conteúdos” as the visible section label.

**How to apply:** translate labels, navigation, help text, buttons, and metadata; keep content fields returned from the API unchanged. Use “Conteúdos” for visible menu/button labels. Do not render a language selector in the site header or profile settings; continue honoring an existing saved language preference.
