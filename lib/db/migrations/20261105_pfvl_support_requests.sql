CREATE TABLE IF NOT EXISTS "pfvl_support_request_subjects" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pfvl_support_request_subjects_name_idx"
  ON "pfvl_support_request_subjects" (lower("name"));

CREATE TABLE IF NOT EXISTS "pfvl_support_request_sequences" (
  "year" integer PRIMARY KEY NOT NULL,
  "last_sequence" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "pfvl_support_request_sequences_year_check"
    CHECK ("year" BETWEEN 1000 AND 9999),
  CONSTRAINT "pfvl_support_request_sequences_last_sequence_check"
    CHECK ("last_sequence" BETWEEN 0 AND 99999999)
);

CREATE TABLE IF NOT EXISTS "pfvl_support_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "protocol" varchar(12) NOT NULL UNIQUE,
  "request_year" integer NOT NULL,
  "request_sequence" integer NOT NULL,
  "subject_id" integer REFERENCES "pfvl_support_request_subjects"("id") ON DELETE SET NULL,
  "subject_name" varchar(120) NOT NULL,
  "requester_user_id" integer REFERENCES "pfvl_users"("id") ON DELETE SET NULL,
  "requester_name" varchar(100) NOT NULL,
  "requester_email" varchar(320) NOT NULL,
  "message" text NOT NULL,
  "status" varchar(24) DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pfvl_support_requests_status_check"
    CHECK ("status" IN ('new', 'in_progress', 'completed')),
  CONSTRAINT "pfvl_support_requests_sequence_check"
    CHECK ("request_sequence" BETWEEN 1 AND 99999999)
);

CREATE INDEX IF NOT EXISTS "pfvl_support_requests_status_created_at_idx"
  ON "pfvl_support_requests" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "pfvl_support_requests_requester_user_id_idx"
  ON "pfvl_support_requests" ("requester_user_id");
