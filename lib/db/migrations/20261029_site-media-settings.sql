-- PFVL homepage media references. File contents remain in the R2 bucket.
CREATE TABLE IF NOT EXISTS pfvl_site_media (
  slot varchar(32) PRIMARY KEY
    CHECK (slot IN ('home_image', 'presentation_video')),
  name varchar(120)
    CHECK (name IS NULL OR name ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
  extension varchar(8) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfvl_site_media_extension_check CHECK (
    (slot = 'home_image' AND extension IN ('jpg', 'jpeg', 'png', 'webp'))
    OR (slot = 'presentation_video' AND extension IN ('mp4', 'webm'))
  )
);
