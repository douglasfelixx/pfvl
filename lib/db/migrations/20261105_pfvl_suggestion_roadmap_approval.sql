ALTER TABLE "pfvl_support_requests"
  ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "pfvl_support_requests_roadmap_approved_at_idx"
  ON "pfvl_support_requests" ("approved_at", "id")
  WHERE "request_type" = 'suggestion'
    AND "approved_at" IS NOT NULL;
