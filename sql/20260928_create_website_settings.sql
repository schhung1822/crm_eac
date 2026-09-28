-- Cấu hình website dạng key/value, CRM ghi và SRX_web đọc.
-- CRM cũng tự tạo bảng này (CREATE TABLE IF NOT EXISTS) ở lần đọc/lưu đầu tiên.
-- Khóa đang dùng:
--   promo_popup: cách hiển thị popup quảng cáo ở trang chủ (nội dung popup là banner có position = 'popup').
CREATE TABLE IF NOT EXISTS website_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
