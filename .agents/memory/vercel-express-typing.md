---
name: Vercel Express typing
description: A difference between local workspace checks and Vercel's TypeScript validation for the PFVL API.
---

For API middleware consumed by a Vercel function, do not assume Express request, response, or router typings resolve identically in local workspace checks and Vercel. Local checks passed while Vercel reported missing Express methods; using Node HTTP interfaces for custom middleware and relying on inferred router types removed those diagnostics in the NodeNext-style check.

Workspace packages exported directly from TypeScript source also need explicit `.js` extensions on relative ESM imports. A NodeNext check can otherwise fail to resolve barrel exports even when the bundler-based workspace typecheck passes.

Import Drizzle query operators from the same workspace package that exports the schema tables. Vercel can resolve direct `drizzle-orm` imports and workspace-package dependencies as separate module identities, producing private-type mismatches even when both resolve to the same version.

Vercel can also expose an incomplete ambient fetch `Response` type despite a passing local NodeNext check. At the native fetch boundary, describe only the standard response members the API consumes rather than depending on that ambient interface.

**Why:** The workspace's bundler resolution and Vercel's NodeNext dependency layout differ, so local typecheck alone did not predict the remote build.

**How to apply:** For API changes that affect the Vercel function, run the local typecheck and build plus a NodeNext check with preserved symlinks against the Vercel handler, then inspect the latest Vercel diagnostics. Prefer structural Node HTTP interfaces when Express types are mis-resolved, explicit `.js` imports in ESM workspace packages, and Drizzle operators re-exported beside their schema.

Declare the repository root as ESM when root-level Vercel handlers statically import the ESM API workspace.

**Why:** Without the root module declaration, Vercel compiled the handler as CommonJS and failed at runtime with `ERR_REQUIRE_ESM`, even though both build and type validation passed. The API workspace's own module declaration does not govern handlers outside its directory.

**How to apply:** Preserve the root module mode in the clean GitHub export. Verify the handler's emitted module format, not just its types, and check a production request after deployment.

Do not let Vercel handlers import workspace packages whose exports point to TypeScript source. Bundle the Express app and its internal workspace packages into an ESM build artifact before the Vercel function imports it.

**Why:** Vercel could start the ESM handler but failed loading an internal package because the workspace package's `.ts` export was absent or not executable in the deployed function bundle.

**How to apply:** Build the API app as a separate bundle alongside the standalone server entry, have Vercel handlers import the generated ESM bundle, and inspect the output for unresolved `@workspace/*` imports before deployment.
