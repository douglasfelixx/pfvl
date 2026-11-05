---
name: Neon migration SQL
description: Notes for preparing schema changes through the Neon MCP migration workflow.
---

The Neon MCP migration preparer can reject SQL scripts containing dollar-quoted `DO $$` blocks as unterminated. Prefer ordinary PostgreSQL statements with safe repeat behavior, then test the prepared temporary branch before applying.

**Why:** A PFVL migration failed preparation at its `DO $$` constraint guard even though the SQL was valid PostgreSQL; a plain `ALTER TABLE` constraint statement prepared and tested successfully.

**How to apply:** When using Neon `prepareDatabaseMigration`, avoid dollar-quoted procedural blocks. Verify resulting tables, columns, constraints, and seeded values on the temporary branch before completing the migration.
