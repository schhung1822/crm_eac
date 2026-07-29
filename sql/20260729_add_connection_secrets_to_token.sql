-- Lưu API key / credential của trang Quản lý kết nối (/ai) vào bảng token.
-- Giá trị được mã hoá AES-256-GCM ở tầng ứng dụng trước khi ghi xuống, dạng
-- "v1:<iv>:<tag>:<ciphertext>". Cột zalo dùng lại access_token có sẵn.

ALTER TABLE `token`
  ADD COLUMN `anthropic_api_key` TEXT NULL AFTER `access_token_kiot`,
  ADD COLUMN `openai_api_key` TEXT NULL AFTER `anthropic_api_key`,
  ADD COLUMN `gemini_api_key` TEXT NULL AFTER `openai_api_key`,
  ADD COLUMN `deepseek_api_key` TEXT NULL AFTER `gemini_api_key`,
  ADD COLUMN `google_drive_credential` TEXT NULL AFTER `deepseek_api_key`,
  ADD COLUMN `facebook_page_token` TEXT NULL AFTER `google_drive_credential`;
