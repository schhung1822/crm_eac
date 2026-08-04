-- Bảng cấu hình Ladipage sự kiện cho website SRX.
-- CRM (/srx/ladipage-events) ghi cấu hình vào đây; dự án SRX_web đọc ra để render
-- /events/[slug] bằng 1 trong 2 template: default hoặc starry.
--
-- Chạy trên database SRX (DATABASE_URL2 / SRX_DB_*), không phải database EAC.

CREATE TABLE IF NOT EXISTS `ladipage_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên hiển thị trong CRM',
  `slug` VARCHAR(180) NOT NULL COMMENT 'Đường dẫn public: /events/{slug}',
  `event_name` VARCHAR(180) NOT NULL COMMENT 'Tên sự kiện ghi vào lượt đăng ký',
  `legacy_template_slug` VARCHAR(255) DEFAULT NULL COMMENT 'Slug cũ, giữ để lần theo lịch sử đổi slug',
  `site_key` VARCHAR(80) NOT NULL DEFAULT 'srx-event-site',
  `public_base_url` VARCHAR(500) DEFAULT NULL COMMENT 'Domain của web hiển thị, vd https://srx.vn',
  `public_path` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `template_style` VARCHAR(50) NOT NULL DEFAULT 'default' COMMENT 'default | starry',
  `sort_order` INT NOT NULL DEFAULT 0,
  `config_json` JSON NOT NULL COMMENT 'Bản nháp đang chỉnh trong CRM',
  `published_config_json` JSON DEFAULT NULL COMMENT 'Bản đang chạy ngoài web; chỉ đổi khi bấm Xuất bản',
  `published_at` DATETIME DEFAULT NULL,
  `last_synced_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `updated_by` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ladipage_events_slug` (`slug`),
  KEY `idx_ladipage_events_site_key` (`site_key`),
  KEY `idx_ladipage_events_status` (`status`),
  KEY `idx_ladipage_events_is_active` (`is_active`),
  KEY `idx_ladipage_events_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Các cột dưới đây để lượt đăng ký biết mình đến từ Ladipage nào.
-- Bỏ qua lỗi "Duplicate column name" nếu bảng checkin đã có sẵn cột.
ALTER TABLE `checkin`
  ADD COLUMN `event_slug` VARCHAR(180) DEFAULT NULL AFTER `event_name`,
  ADD COLUMN `template_style` VARCHAR(50) DEFAULT NULL AFTER `event_slug`,
  ADD COLUMN `site_key` VARCHAR(80) DEFAULT NULL AFTER `template_style`,
  ADD COLUMN `page_url` TEXT DEFAULT NULL AFTER `site_key`;

ALTER TABLE `checkin` ADD INDEX `idx_checkin_event_slug` (`event_slug`);
