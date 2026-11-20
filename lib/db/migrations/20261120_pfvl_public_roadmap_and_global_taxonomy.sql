ALTER TABLE "pfvl_support_requests"
  ADD COLUMN IF NOT EXISTS "roadmap_title" varchar(220),
  ADD COLUMN IF NOT EXISTS "roadmap_description" text,
  ADD COLUMN IF NOT EXISTS "roadmap_status" varchar(24);

-- Previously approved roadmap entries exposed the private submission text.
-- Require a new, explicit public copy before any suggestion can remain public.
UPDATE "pfvl_support_requests"
SET "approved_at" = NULL,
    "roadmap_title" = NULL,
    "roadmap_description" = NULL,
    "roadmap_status" = NULL
WHERE "request_type" = 'suggestion'
  AND "approved_at" IS NOT NULL;

ALTER TABLE "pfvl_support_requests"
  ADD CONSTRAINT "pfvl_support_requests_roadmap_status_check"
    CHECK ("roadmap_status" IS NULL OR "roadmap_status" IN ('planned', 'in_progress', 'available')),
  ADD CONSTRAINT "pfvl_support_requests_public_roadmap_fields_check"
    CHECK (
      "approved_at" IS NULL OR (
        "request_type" = 'suggestion'
        AND "roadmap_title" IS NOT NULL
        AND length(btrim("roadmap_title")) > 0
        AND "roadmap_description" IS NOT NULL
        AND length(btrim("roadmap_description")) > 0
        AND "roadmap_status" IS NOT NULL
      )
    );

-- Category and marker names form one shared catalog across every publishing area.
DELETE FROM "pfvl_taxonomy" AS duplicate
USING "pfvl_taxonomy" AS retained
WHERE duplicate."type" = retained."type"
  AND lower(btrim(duplicate."name")) = lower(btrim(retained."name"))
  AND duplicate."id" > retained."id";

DROP INDEX IF EXISTS "pfvl_taxonomy_kind_type_name_idx";
ALTER TABLE "pfvl_taxonomy"
  DROP CONSTRAINT IF EXISTS "pfvl_taxonomy_kind_check",
  DROP COLUMN IF EXISTS "kind";

CREATE UNIQUE INDEX IF NOT EXISTS "pfvl_taxonomy_type_name_idx"
  ON "pfvl_taxonomy" ("type", lower("name"));
