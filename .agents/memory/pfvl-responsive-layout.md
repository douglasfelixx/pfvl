---
name: PFVL responsive layout
description: Mobile behavior for full-bleed sections inside the portal's padded page container.
---

On narrow screens, center full-bleed sections relative to the viewport rather than relying only on negative margins and calculated widths. Keep the surrounding page content aligned to its normal gutter.

**Why:** The community header rendered with uneven side gutters in the mobile preview when sized only with negative margins, despite the surrounding cards using consistent page padding.

**How to apply:** For full-bleed sections inside the page container, verify the layout at 375–402px, center the section to the viewport, and confirm that there is no horizontal scrolling.
