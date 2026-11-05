---
name: PFVL Neon targets
description: Distinguishes Neon production from the database used by the Replit preview.
---

Do not assume the Neon project reached through its integration and the workspace API's `DATABASE_URL` point to the same PostgreSQL database. A migration applied to Neon production did not appear in the Replit preview database. Switching the runtime to `NEON_DATABASE_URL` caused connection timeouts, so do not change runtime connection precedence without confirming that the value is a reachable PostgreSQL connection.

The verified PFVL target mapping is: the workspace preview uses its Replit development database, while production uses the `pfvl` project in Neon. A separate Neon project named `teste` is not the current preview database.

**Why:** Schema changes can succeed on Neon production while the local preview still reports a missing relation; the configured Neon URL also timed out when used as the runtime connection.

**How to apply:** Before future schema changes, identify the production and preview database targets separately. Keep secrets private, verify each target through safe schema queries, and apply migrations only to the intended target.
