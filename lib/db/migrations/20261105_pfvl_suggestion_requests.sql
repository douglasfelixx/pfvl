ALTER TABLE "pfvl_support_request_subjects"
  ADD COLUMN IF NOT EXISTS "system_key" varchar(40);

CREATE UNIQUE INDEX IF NOT EXISTS "pfvl_support_request_subjects_system_key_idx"
  ON "pfvl_support_request_subjects" ("system_key");

INSERT INTO "pfvl_support_request_subjects" ("name", "system_key")
VALUES ('Sugestão', 'suggestion')
ON CONFLICT DO NOTHING;

UPDATE "pfvl_support_request_subjects"
SET "system_key" = 'suggestion', "updated_at" = now()
WHERE lower("name") = lower('Sugestão')
  AND "system_key" IS NULL;

CREATE TABLE IF NOT EXISTS "pfvl_support_request_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "subject_id" integer NOT NULL REFERENCES "pfvl_support_request_subjects"("id") ON DELETE RESTRICT,
  "name" varchar(120) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pfvl_support_request_categories_subject_name_idx"
  ON "pfvl_support_request_categories" ("subject_id", lower("name"));
CREATE INDEX IF NOT EXISTS "pfvl_support_request_categories_subject_active_idx"
  ON "pfvl_support_request_categories" ("subject_id", "active");

ALTER TABLE "pfvl_support_requests"
  ADD COLUMN IF NOT EXISTS "request_type" varchar(24) DEFAULT 'support' NOT NULL,
  ADD COLUMN IF NOT EXISTS "title" varchar(220),
  ADD COLUMN IF NOT EXISTS "category_id" integer REFERENCES "pfvl_support_request_categories"("id") ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "category_name" varchar(120);

ALTER TABLE "pfvl_support_requests"
  DROP CONSTRAINT IF EXISTS "pfvl_support_requests_type_check",
  ADD CONSTRAINT "pfvl_support_requests_type_check"
  CHECK ("request_type" IN ('support', 'suggestion'));

CREATE TABLE IF NOT EXISTS "pfvl_support_request_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_id" integer NOT NULL REFERENCES "pfvl_support_requests"("id") ON DELETE RESTRICT,
  "author_user_id" integer REFERENCES "pfvl_users"("id") ON DELETE SET NULL,
  "author_name" varchar(100) NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pfvl_support_request_comments_request_created_idx"
  ON "pfvl_support_request_comments" ("request_id", "created_at");

INSERT INTO "pfvl_support_request_categories" ("subject_id", "name")
SELECT subject.id, category.name
FROM "pfvl_support_request_subjects" AS subject
CROSS JOIN (
  VALUES
    ('Nova funcionalidade'),
    ('Melhoria de funcionalidade'),
    ('Facilidade de uso'),
    ('Conteúdos e tutoriais'),
    ('Outras sugestões')
) AS category(name)
WHERE subject."system_key" = 'suggestion'
ON CONFLICT DO NOTHING;
