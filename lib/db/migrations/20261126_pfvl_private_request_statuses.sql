CREATE TABLE IF NOT EXISTS pfvl_support_request_statuses (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(24) NOT NULL,
  key VARCHAR(40) NOT NULL,
  label VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_initial BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pfvl_support_request_statuses_type_check
    CHECK (request_type IN ('support', 'suggestion')),
  CONSTRAINT pfvl_support_request_statuses_key_check
    CHECK (key ~ '^[a-z0-9_-]+$'),
  CONSTRAINT pfvl_support_request_statuses_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS pfvl_support_request_statuses_type_key_idx
  ON pfvl_support_request_statuses (request_type, key);
CREATE UNIQUE INDEX IF NOT EXISTS pfvl_support_request_statuses_type_label_idx
  ON pfvl_support_request_statuses (request_type, lower(label));
CREATE UNIQUE INDEX IF NOT EXISTS pfvl_support_request_statuses_initial_idx
  ON pfvl_support_request_statuses (request_type)
  WHERE is_initial;
CREATE INDEX IF NOT EXISTS pfvl_support_request_statuses_flow_order_idx
  ON pfvl_support_request_statuses (request_type, sort_order, id);

INSERT INTO pfvl_support_request_statuses
  (request_type, key, label, label_en, active, is_initial, sort_order)
VALUES
  ('support', 'new', 'Nova', 'New', TRUE, TRUE, 0),
  ('support', 'in_progress', 'Em andamento', 'In progress', TRUE, FALSE, 10),
  ('support', 'completed', 'Concluída', 'Completed', TRUE, FALSE, 20),
  ('support', 'postponed', 'Adiada', 'Deferred', TRUE, FALSE, 30),
  ('support', 'cancelled', 'Cancelada', 'Cancelled', TRUE, FALSE, 40),
  ('suggestion', 'new', 'Recebida', 'Received', TRUE, TRUE, 0),
  ('suggestion', 'in_progress', 'Em andamento', 'In progress', TRUE, FALSE, 10),
  ('suggestion', 'completed', 'Concluída', 'Completed', TRUE, FALSE, 20),
  ('suggestion', 'not_approved', 'Não aprovada', 'Not approved', TRUE, FALSE, 30)
ON CONFLICT (request_type, key) DO NOTHING;

ALTER TABLE pfvl_support_requests
  ALTER COLUMN status TYPE VARCHAR(40);
ALTER TABLE pfvl_support_requests
  DROP CONSTRAINT IF EXISTS pfvl_support_requests_status_check;
ALTER TABLE pfvl_support_requests
  ADD COLUMN IF NOT EXISTS status_id INTEGER;

UPDATE pfvl_support_requests AS request
SET status_id = status.id
FROM pfvl_support_request_statuses AS status
WHERE request.status_id IS NULL
  AND request.request_type = status.request_type
  AND request.status = status.key;

ALTER TABLE pfvl_support_requests
  ADD CONSTRAINT pfvl_support_requests_status_id_fk
  FOREIGN KEY (status_id)
  REFERENCES pfvl_support_request_statuses (id)
  ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS pfvl_support_requests_status_id_idx
  ON pfvl_support_requests (status_id);

ALTER TABLE pfvl_notifications
  ADD COLUMN IF NOT EXISTS status_id INTEGER;
ALTER TABLE pfvl_notifications
  ADD CONSTRAINT pfvl_notifications_status_id_fk
  FOREIGN KEY (status_id)
  REFERENCES pfvl_support_request_statuses (id)
  ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS pfvl_notifications_status_id_idx
  ON pfvl_notifications (status_id);
