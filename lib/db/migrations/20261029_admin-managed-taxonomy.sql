CREATE TABLE IF NOT EXISTS "pfvl_taxonomy" (
  "id" serial PRIMARY KEY NOT NULL,
  "kind" varchar(24) NOT NULL,
  "type" varchar(16) NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pfvl_taxonomy_kind_check"
    CHECK ("kind" IN ('blog', 'news', 'forum', 'help')),
  CONSTRAINT "pfvl_taxonomy_type_check"
    CHECK ("type" IN ('category', 'tag'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "pfvl_taxonomy_kind_type_name_idx"
  ON "pfvl_taxonomy" ("kind", "type", lower("name"));

INSERT INTO "pfvl_taxonomy" ("kind", "type", "name")
SELECT DISTINCT ON (posts."kind", lower(btrim(posts."category")))
  posts."kind", 'category', btrim(posts."category")
FROM "pfvl_posts" AS posts
WHERE posts."kind" IN ('blog', 'news', 'forum', 'help')
  AND btrim(posts."category") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "pfvl_taxonomy" AS existing
    WHERE existing."kind" = posts."kind"
      AND existing."type" = 'category'
      AND lower(existing."name") = lower(btrim(posts."category"))
  )
ORDER BY posts."kind", lower(btrim(posts."category")), btrim(posts."category");

INSERT INTO "pfvl_taxonomy" ("kind", "type", "name")
SELECT DISTINCT ON (posts."kind", lower(btrim(tags.tag_name)))
  posts."kind", 'tag', btrim(tags.tag_name)
FROM "pfvl_posts" AS posts
CROSS JOIN LATERAL unnest(posts."tags") AS tags(tag_name)
WHERE posts."kind" IN ('blog', 'news', 'forum', 'help')
  AND btrim(tags.tag_name) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "pfvl_taxonomy" AS existing
    WHERE existing."kind" = posts."kind"
      AND existing."type" = 'tag'
      AND lower(existing."name") = lower(btrim(tags.tag_name))
  )
ORDER BY posts."kind", lower(btrim(tags.tag_name)), btrim(tags.tag_name);
