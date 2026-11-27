CREATE TABLE IF NOT EXISTS pfvl_public_roadmap_statuses (
  id SERIAL PRIMARY KEY,
  key VARCHAR(40) NOT NULL,
  label VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pfvl_public_roadmap_statuses_key_check
    CHECK (key ~ '^[a-z0-9_-]+$'),
  CONSTRAINT pfvl_public_roadmap_statuses_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS pfvl_public_roadmap_statuses_key_idx
  ON pfvl_public_roadmap_statuses (key);
CREATE UNIQUE INDEX IF NOT EXISTS pfvl_public_roadmap_statuses_label_idx
  ON pfvl_public_roadmap_statuses (lower(label));
CREATE INDEX IF NOT EXISTS pfvl_public_roadmap_statuses_order_idx
  ON pfvl_public_roadmap_statuses (sort_order, id);

INSERT INTO pfvl_public_roadmap_statuses
  (key, label, label_en, active, sort_order)
VALUES
  ('planned', 'Planejada', 'Planned', TRUE, 0),
  ('in_progress', 'Em desenvolvimento', 'In development', TRUE, 10),
  ('available', 'Disponível', 'Available', TRUE, 20)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE pfvl_support_requests
  ALTER COLUMN roadmap_status TYPE VARCHAR(40);

ALTER TABLE pfvl_support_requests
  DROP CONSTRAINT IF EXISTS pfvl_support_requests_roadmap_status_check,
  DROP CONSTRAINT IF EXISTS pfvl_support_requests_roadmap_status_key_fk;

ALTER TABLE pfvl_support_requests
  ADD CONSTRAINT pfvl_support_requests_roadmap_status_key_fk
    FOREIGN KEY (roadmap_status)
    REFERENCES pfvl_public_roadmap_statuses (key)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS pfvl_support_requests_roadmap_status_idx
  ON pfvl_support_requests (roadmap_status);
