---
name: PFVL R2 upload and delivery
description: Diagnose R2 upload permissions and public image delivery.
---

Generating a presigned URL does not prove that the configured R2 credentials can write objects. A successful bucket metadata check also does not prove `PutObject` permission. The bucket token must have Object Read & Write on `pfvl-uploads`; keep browser CORS limited to the portal origins, `PUT`, and `Content-Type`.

**Why:** Cloudflare signs presigned URLs locally, so an API endpoint can return 200 even when R2 later denies the upload. The browser may report only “Failed to fetch” when the storage response is not readable cross-origin.

**How to apply:** When `/api/uploads/presign` succeeds but the browser upload fails, test a small server-side presigned PUT using the configured key without logging credentials. Check R2 token permissions before changing application code or broadening CORS.

After changing the R2 CORS allowlist, a browser may need a forced refresh before uploads work with the updated policy.

**Why:** The user confirmed that forcing a refresh resolved the PFVL upload failure after the production origin was added to the bucket policy.

**How to apply:** After a CORS policy update, ask the user to hard-refresh once before investigating another upload failure.

The R2 S3-compatible endpoint is for authenticated storage operations and is not a public object URL. Avoid enabling public access for the entire bucket solely to render community images. Use a narrowly scoped application image route for public post images, and normalize legacy S3-origin URLs when returning posts.

**Why:** Publicly exposing the bucket would also expose unreferenced uploads; the application can read individual image objects with its server-side R2 credentials.

**How to apply:** Keep R2 private and stream validated image objects through the API; do not return the S3 endpoint as `coverImageUrl`.
