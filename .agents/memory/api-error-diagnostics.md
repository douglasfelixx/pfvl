---
name: Safe API error diagnostics
description: Preserve useful database failure codes without logging SQL parameters or credentials.
---

Use bounded, sanitized cause-code inspection for API errors. Never serialize raw Drizzle errors or connection error objects to logs or public responses.

**Why:** Express's default error output showed only the Drizzle query wrapper, hiding the PostgreSQL cause. Logging the full wrapper instead would include SQL parameters; connection errors can also carry the original connection string in extra properties.

**How to apply:** Diagnose database failures using the nested cause's technical code and a request correlation ID. Keep SQL, parameters, raw messages, connection strings, and arbitrary error properties out of diagnostic output. Do not infer a missing table from the wrapper alone; validate the schema read-only first.

When Vercel reports PostgreSQL `42P01` for a relation that exists on the inspected Neon production branch, do not reapply migrations blindly. The deployed `DATABASE_URL` may target a different branch/database or schema search path; compare the selected branch, database, and non-secret hostname.

**Why:** A production query can reach PostgreSQL successfully while resolving a different schema than the one inspected through the Neon integration.

**How to apply:** Verify the Vercel variable points at the exact Neon project, production branch, and database checked through Neon before making schema changes.
