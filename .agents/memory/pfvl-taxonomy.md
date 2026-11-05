---
name: PFVL category and tag ownership
description: Project rule for how publishing categories and tags are maintained.
---

Only PFVL administrators create and manage categories and tags. Members and authors select from the approved options when publishing; they do not invent taxonomy values in the post form. Renaming a category or tag must update every existing post of the same kind that references it, matching values case-insensitively; deleting an in-use option remains blocked.

**Why:** the user explicitly requested administrator-managed categories and markers for content and community publications, then required edits to remain reflected in existing posts.

**How to apply:** keep taxonomy writes administrator-only, make the available options readable to publishing flows, validate submitted categories and tags against the catalog on the server, and apply catalog renames and post updates atomically.
