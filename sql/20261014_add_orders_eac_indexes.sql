-- Chỉ mục cho bảng orders_eac (khoảng 47 nghìn dòng, hiện chỉ có khoá chính và nc_order).
-- Trang /orders lọc và sắp xếp theo create_time, trang sản phẩm gộp doanh số theo pro_ID.
-- Chưa được chạy tự động. Hãy chạy thủ công trên DB production vào giờ ít người dùng.

ALTER TABLE `orders_eac`
  ADD INDEX `idx_orders_eac_create_time` (`create_time`);
