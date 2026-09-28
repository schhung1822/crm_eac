-- Đẩy đơn website về KiotViet (phiếu tạm, chi nhánh EAC HCM), dùng access_token của token_name = 'kiotviet'.
-- CRM cũng tự tạo 2 bảng này (CREATE TABLE IF NOT EXISTS) ở lần dùng đầu tiên.

-- Liên kết sản phẩm website → mã hàng KiotViet (product_eac.procode).
-- variant_id NULL = áp dụng cho cả sản phẩm; combo/quà tặng có thể có nhiều dòng, mỗi dòng kèm số lượng.
CREATE TABLE IF NOT EXISTS product_kiotviet_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  procode VARCHAR(100) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_kiotviet_links_product (product_id),
  KEY idx_product_kiotviet_links_variant (variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mỗi đơn website một dòng (order_id UNIQUE), nên một đơn chỉ tạo tối đa một đơn KiotViet.
CREATE TABLE IF NOT EXISTS kiotviet_order_syncs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  order_number VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  kiotviet_order_id BIGINT NULL,
  kiotviet_order_code VARCHAR(50) NULL,
  warnings_json JSON NULL,
  error_message TEXT NULL,
  request_json JSON NULL,
  response_json JSON NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  synced_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kiotviet_order_syncs_order (order_id),
  KEY idx_kiotviet_order_syncs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
