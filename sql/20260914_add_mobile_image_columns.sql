-- Bản ảnh thu nhỏ dùng cho giao diện mobile và các vị trí chỉ cần ảnh nhỏ.
-- Đường dẫn luôn là ảnh gốc gắn thêm hậu tố `-mb`: `/upload/product/abc.webp`
-- sinh ra `/upload/product/abc-mb.webp`.
--
-- Cột để NULL khi ảnh gốc vốn đã nhỏ hơn mốc mobile hoặc nằm ngoài server;
-- phía hiển thị dùng COALESCE(<cột>_mb, <cột gốc>).
--
-- Chiều rộng bản mobile: sản phẩm 480px, banner 960px, tin tức 480px,
-- từ điển thành phần 240px.

ALTER TABLE banners
  ADD COLUMN image_url_mb VARCHAR(500) NULL AFTER mobile_image_url;

ALTER TABLE posts
  ADD COLUMN featured_image_url_mb VARCHAR(500) NULL AFTER featured_image_url;

ALTER TABLE products
  ADD COLUMN thumbnail_url_mb VARCHAR(500) NULL AFTER thumbnail_url,
  ADD COLUMN info_img_mb VARCHAR(500) NULL AFTER info_img;

ALTER TABLE product_images
  ADD COLUMN image_url_mb VARCHAR(500) NULL AFTER image_url;

ALTER TABLE product_variants
  ADD COLUMN image_url_mb VARCHAR(500) NULL AFTER image_url;

ALTER TABLE product_tags
  ADD COLUMN img_mb VARCHAR(500) NULL AFTER img;
