# Form Template System - Hướng dẫn sử dụng

## Cấu trúc đã thêm

Đã thêm 3 thư mục chính:

- `app/(admin)/admin/templates/[slug]` - Trang admin để chỉnh sửa template
- `components/form-template` - Component hiển thị form template
- `lib/form-template` - Logic xử lý template (types, repo, config)

## Cài đặt Database

1. Chạy SQL script để tạo bảng `form_templates`:

```bash
# Mở file này và chạy trên MySQL database của bạn
prisma/migrations/manual_add_form_templates.sql
```

Hoặc nếu database server đang chạy và có kết nối:

```bash
cd crm
npx prisma db push
```

## Sử dụng

### 1. Truy cập trang Admin

Mở trình duyệt và truy cập:

```
http://localhost:3000/admin/templates/eac-checkin
```

Tại đây bạn có thể tùy chỉnh:

#### Tab Theme:

- Màu chủ đạo (Primary)
- Màu phụ (Primary 2)
- Màu chữ (Text)
- Màu mờ (Muted)
- Màu nền (Background)

#### Tab Fields:

- Bật/tắt các trường: Họ và tên, Số điện thoại, Email
- Đánh dấu các trường bắt buộc hoặc không
- Bật/tắt các trường ẩn: user_id, city, role, clinic, full_name_nv

#### Tab Questions:

- Thêm tối đa 5 câu hỏi tùy chỉnh
- Mỗi câu hỏi có thể:
  - Đặt nhãn (label)
  - Chọn loại input (text, textarea, select, email, tel)
  - Đánh dấu bắt buộc
  - Thêm placeholder
  - Thêm options nếu là select

#### Tab Footer:

- Đổi màu gradient footer
- Chỉnh sửa nội dung:
  - Dress Code
  - Ngày giờ sự kiện
  - Địa điểm
  - Thông tin chi tiết

#### Tab Preview:

- Xem trước template với các thay đổi real-time
- Test form trước khi lưu

### 2. Xem Template công khai

Sau khi lưu, template sẽ hiển thị tại:

```
http://localhost:3000/t/eac-checkin
```

## Các file quan trọng

### Types (`lib/form-template/types.ts`)

Định nghĩa các kiểu dữ liệu cho:

- `FormTemplateConfig` - Cấu hình toàn bộ template
- `TemplateTheme` - Màu sắc theme
- `FieldType` - Loại input fields
- `CustomQuestion` - Câu hỏi tùy chỉnh
- `FooterConfig` - Cấu hình footer
- `HeaderConfig` - Cấu hình header

### Default Config (`lib/form-template/default-config.ts`)

Template mặc định với tất cả cấu hình ban đầu

### Repository (`lib/form-template/repo.ts`)

Functions để tương tác với database:

- `getTemplateBySlug(slug)` - Lấy template theo slug
- `upsertTemplate(slug, name, config)` - Tạo/cập nhật template
- `ensureDefaultTemplate()` - Đảm bảo có template mặc định

### TemplateRenderer (`components/form-template/TemplateRenderer.tsx`)

Component hiển thị form với đầy đủ tính năng:

- Validation form
- Submit đến webhook
- Modal thông báo
- Responsive design

### Admin UI (`app/(admin)/admin/templates/[slug]/ui.tsx`)

Giao diện admin để chỉnh sửa template

## Tính năng

✅ Tùy chỉnh màu sắc theme không cần code
✅ Bật/tắt các trường mặc định (tên, phone, email)
✅ Bật/tắt 5 trường ẩn
✅ Thêm 5 câu hỏi tùy chỉnh với nhiều loại input
✅ Tùy chỉnh nội dung footer
✅ Preview real-time
✅ Giữ nguyên chức năng template gốc
✅ Responsive design
✅ Validation form
✅ Submit webhook

## Lưu ý

- Webhook URL có thể thay đổi trong admin panel
- Các câu hỏi tùy chỉnh sử dụng ID từ q1 đến q5
- Template sẽ tự động validate số điện thoại Việt Nam
- Form sẽ gửi data đến webhook URL khi submit thành công
