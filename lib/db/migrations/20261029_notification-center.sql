-- PFVL notification center: additive migration, safe to run more than once.
ALTER TABLE pfvl_suggestions
  ADD COLUMN IF NOT EXISTS author_user_id integer
  REFERENCES pfvl_users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS pfvl_notifications (
  id serial PRIMARY KEY,
  recipient_user_id integer NOT NULL
    REFERENCES pfvl_users(id) ON DELETE CASCADE,
  actor_user_id integer
    REFERENCES pfvl_users(id) ON DELETE SET NULL,
  event_key varchar(255) NOT NULL,
  type varchar(32) NOT NULL
    CHECK (type IN (
      'new_update',
      'new_publication',
      'comment_reply',
      'new_suggestion',
      'suggestion_status'
    )),
  title varchar(180) NOT NULL,
  message text NOT NULL,
  href varchar(500) NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pfvl_notifications_recipient_event_key_idx
  ON pfvl_notifications (recipient_user_id, event_key);

CREATE INDEX IF NOT EXISTS pfvl_notifications_recipient_created_idx
  ON pfvl_notifications (recipient_user_id, created_at);
