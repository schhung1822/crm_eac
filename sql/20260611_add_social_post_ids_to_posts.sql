ALTER TABLE posts
  ADD COLUMN id_zalo_post VARCHAR(100) NULL AFTER view_count,
  ADD COLUMN id_fb_post VARCHAR(100) NULL AFTER id_zalo_post;
