ALTER TABLE pfvl_users
  ADD COLUMN IF NOT EXISTS preferred_language varchar(5) NOT NULL DEFAULT 'pt-BR'
  CHECK (preferred_language IN ('pt-BR', 'en-US'));

CREATE TABLE IF NOT EXISTS pfvl_testimonials (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES pfvl_users(id) ON DELETE CASCADE,
  author_name varchar(100) NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pfvl_testimonials_user_id_idx
  ON pfvl_testimonials (user_id);
