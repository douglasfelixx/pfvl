---
name: Vercel API routing
description: Explicit shared-function routing for nested PFVL API URLs on the frameworkless Vercel project.
---

Do not rely only on the catch-all-looking function filename to route nested API URLs. Keep an explicit wildcard API rewrite before the SPA fallback and send it to the shared API entry point.

**Why:** A successful Vercel build invoked the function for single-segment API paths while nested paths returned Vercel NOT_FOUND rather than an Express response.

**How to apply:** After each routing deployment, check health plus a nested public or protected API route on the production domain. Build READY alone does not establish runtime readiness; verify the production environment configuration separately.
