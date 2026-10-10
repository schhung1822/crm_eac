import type { MapFlow } from "./map-types";

export const MAP_FLOWS: MapFlow[] = [
  {
    id: "order",
    title: "Đặt hàng & thanh toán",
    summary: "Từ lúc khách vào website đến khi đơn được thanh toán, báo nội bộ và lên báo cáo.",
    color: "#2563eb",
    steps: [
      {
        text: "Khách vào srx.vn từ quảng cáo Facebook, Google, Zalo, link affiliate hoặc truy cập trực tiếp.",
        edges: ["e-fb-web", "e-gg-web", "e-zalo-web", "e-org-web", "e-aff-web"],
      },
      { text: "Website đọc sản phẩm, giá, voucher, banner từ Database SRX để hiển thị.", edges: ["e-content-web"] },
      { text: "Trình duyệt gửi PageView (Pixel, GA4) và lưu cookie _fbp / _fbc / IP.", edges: ["e-web-trk"] },
      {
        text: "Khách bấm Đặt hàng: giỏ hàng, thông tin giao hàng và cookie đo lường gửi về API.",
        edges: ["e-web-checkout"],
      },
      {
        text: "API kiểm tra giá, voucher, quà rồi ghi đơn vào Database SRX trong một transaction; có ref thì gắn affiliate.",
        edges: ["e-checkout-orders", "e-checkout-aff"],
      },
      {
        text: "Đơn đã ghi → gửi song song: email cho khách, báo CRM, webhook n8n.",
        edges: ["e-checkout-email", "e-checkout-crm", "e-checkout-n8n"],
      },
      {
        text: "CRM xử lý nền: thẻ Lark cho đội bán, email xác nhận, Meta CompleteRegistration, đơn nháp KiotViet; ghi nhật ký.",
        edges: ["e-crm-lark", "e-crm-email", "e-crm-meta", "e-crm-kiot", "e-crm-logs"],
      },
      {
        text: "Nếu chuyển khoản: khách quét VietQR → SePay báo có → webhook tự đánh dấu đơn đã thanh toán.",
        edges: ["e-web-sepay", "e-sepay-hook", "e-hook-orders"],
      },
      {
        text: "Nhân viên xử lý đơn trong CRM; đơn đã thanh toán / hoàn tất → gửi Meta Purchase.",
        edges: ["e-admin-orders", "e-admin-meta"],
      },
      {
        text: "Số liệu lên Dashboard SRX Việt Nam, Meta Ads Manager và Nhật ký sự kiện Meta.",
        edges: ["e-orders-dash", "e-meta-ads", "e-logs-metalog"],
      },
    ],
  },
  {
    id: "ladipage",
    title: "Đăng ký sự kiện",
    summary: "Ladipage thu đăng ký, CRM gửi xác nhận qua Zalo ZBS và báo chuyển đổi cho Meta.",
    color: "#0891b2",
    steps: [
      { text: "Biên tập viên tạo Ladipage trong CRM, bật tin ZBS nếu cần.", edges: ["e-admin-events"] },
      { text: "Khách vào Ladipage từ quảng cáo Facebook hoặc link Zalo.", edges: ["e-fb-ladi", "e-zalo-ladi"] },
      { text: "Mỗi lượt xem và lượt đăng ký gửi về API Ladipage của website.", edges: ["e-ladi-api"] },
      { text: "API ghi lượt xem và lượt đăng ký (bảng checkin) vào Database SRX.", edges: ["e-events-db"] },
      { text: "API báo CRM qua /api/srx/meta-events-web, chỉ gửi mã lượt đăng ký.", edges: ["e-events-crm"] },
      {
        text: "CRM gửi Meta CompleteRegistration và tin ZBS kèm mã xác nhận tới Zalo khách; ghi nhật ký.",
        edges: ["e-crm-meta", "e-crm-zbs", "e-crm-logs"],
      },
      {
        text: "Theo dõi ở Báo cáo sự kiện, Nhật ký sự kiện Meta và Ads Manager.",
        edges: ["e-events-report", "e-logs-metalog", "e-meta-ads"],
      },
    ],
  },
  {
    id: "contact",
    title: "Form liên hệ",
    summary: "Lead từ trang Liên hệ chỉ đi tới Lark, không lưu database.",
    color: "#7c3aed",
    steps: [
      { text: "Khách mở trang Liên hệ và gửi form.", edges: ["e-org-contact", "e-contact-api"] },
      { text: "Website chuyển form sang CRM.", edges: ["e-contact-crm"] },
      { text: "CRM gửi thẻ thông báo vào nhóm Lark của đội tư vấn.", edges: ["e-crm-lark"] },
      { text: "CRM không phản hồi → website tự gửi thẳng Lark (đường dự phòng).", edges: ["e-contact-lark"] },
    ],
  },
  {
    id: "affiliate",
    title: "Affiliate",
    summary: "Từ hồ sơ đăng ký CTV đến click, đơn giới thiệu và hoa hồng.",
    color: "#059669",
    steps: [
      { text: "Người muốn làm CTV gửi hồ sơ và tài khoản ngân hàng.", edges: ["e-affpage-api", "e-affapi-db"] },
      {
        text: "Website báo CRM → thẻ Lark cho đội duyệt, email xác nhận cho người đăng ký.",
        edges: ["e-affapi-crm", "e-crm-lark", "e-crm-email"],
      },
      { text: "Admin duyệt hồ sơ trong CRM, tài khoản affiliate được kích hoạt.", edges: ["e-admin-aff"] },
      { text: "CTV chia sẻ link ?ref=, mỗi click được ghi lại.", edges: ["e-aff-web", "e-web-affapi", "e-affapi-db"] },
      {
        text: "Khách đặt đơn trong thời hạn cookie → đơn được gắn cho affiliate.",
        edges: ["e-web-checkout", "e-checkout-aff"],
      },
      { text: "Theo dõi click, đơn, hoa hồng trong Quản lý affiliate.", edges: ["e-aff-report"] },
    ],
  },
  {
    id: "auth",
    title: "Đăng nhập & Mini App",
    summary: "Tài khoản website dùng chung với Zalo Mini App; đăng nhập bằng email, Google hoặc QR Zalo.",
    color: "#db2777",
    steps: [
      { text: "Khách đăng nhập bằng email / mật khẩu hoặc Google.", edges: ["e-gg-login", "e-login-api"] },
      { text: "Website tạo / ghép tài khoản và phiên đăng nhập trong Database SRX.", edges: ["e-auth-db"] },
      { text: "Chọn QR Zalo: website tạo mã 5 phút; khách quét bằng Zalo để mở Mini App.", edges: ["e-zalo-mini"] },
      {
        text: "Mini App gửi token Zalo + ticket lên CRM; CRM lấy SĐT từ Zalo, ghép tài khoản, tạo phiên đăng nhập.",
        edges: ["e-mini-api", "e-miniapi-db"],
      },
      { text: "Mini App hiển thị banner và voucher công khai.", edges: ["e-miniapi-content"] },
      { text: "Quên mật khẩu: website gửi email chứa link đặt lại.", edges: ["e-auth-email"] },
    ],
  },
  {
    id: "content",
    title: "Nội dung & mạng xã hội",
    summary: "Bài viết soạn trong CRM (có AI hỗ trợ) lên website và tự đăng Facebook, Zalo OA.",
    color: "#ea580c",
    steps: [
      { text: "Biên tập viên soạn bài trong CRM, dùng AI để viết, chấm điểm, tạo ảnh bìa.", edges: ["e-admin-ai"] },
      { text: "Ảnh tải lên được chuyển WebP và lưu trên máy chủ CRM.", edges: ["e-admin-files"] },
      { text: "Bài viết, sản phẩm, banner, voucher lưu vào Database SRX.", edges: ["e-admin-content"] },
      { text: "Website đọc trực tiếp database nên nội dung hiển thị ngay.", edges: ["e-content-web"] },
      { text: "Bài xuất bản ngay được đăng luôn lên Facebook Page và Zalo OA.", edges: ["e-admin-fb", "e-admin-zalo"] },
      {
        text: "Bài hẹn giờ: bộ lập lịch quét mỗi 5 phút và đăng khi đến hạn.",
        edges: ["e-sched-content", "e-sched-fb", "e-sched-zalo"],
      },
    ],
  },
  {
    id: "tracking",
    title: "Đo lường quảng cáo",
    summary: "Pixel và GA4 trên trình duyệt kết hợp Conversions API từ máy chủ CRM.",
    color: "#ca8a04",
    steps: [
      {
        text: "Click quảng cáo mang fbclid → cookie _fbc; mọi khách đều có cookie _fbp.",
        edges: ["e-fb-web", "e-web-trk"],
      },
      { text: "Trình duyệt gửi PageView lên Meta Pixel và page_view lên GA4.", edges: ["e-trk-meta", "e-trk-ga4"] },
      { text: "Cookie đo lường đi kèm đơn hàng / đăng ký về máy chủ.", edges: ["e-web-checkout", "e-checkout-crm"] },
      {
        text: "CRM gửi sự kiện máy chủ: CompleteRegistration khi có đơn / đăng ký, Purchase khi đơn đã thanh toán.",
        edges: ["e-crm-meta", "e-admin-meta"],
      },
      { text: "Mỗi lần gửi đều ghi nhật ký để kiểm tra và gửi lại.", edges: ["e-crm-logs", "e-logs-metalog"] },
      { text: "Meta dùng dữ liệu để đo chuyển đổi và tối ưu quảng cáo.", edges: ["e-meta-ads"] },
    ],
  },
  {
    id: "eac",
    title: "Báo cáo kinh doanh EAC",
    summary: "Dữ liệu bán hàng mọi kênh đi vào database EAC để CRM dựng báo cáo nội bộ.",
    color: "#475569",
    steps: [
      {
        text: "Đơn TikTok Shop, Shopee, cửa hàng, đại lý được ghi nhận trên hệ thống bán hàng.",
        edges: ["e-mkt-kiot", "e-off-kiot"],
      },
      { text: "Đơn website cũng được CRM đẩy sang KiotViet (kênh Website SRX).", edges: ["e-crm-kiot"] },
      {
        text: "Dữ liệu được đồng bộ bên ngoài CRM (NocoDB / Lark Base) và nạp vào Database EAC.",
        edges: ["e-kiot-sync", "e-sync-eac"],
      },
      {
        text: "CRM đọc Database EAC để dựng báo cáo B2B, B2C, khách hàng và Zalo OA.",
        edges: ["e-eac-dash", "e-eac-zalo"],
      },
    ],
  },
  {
    id: "security",
    title: "Tài khoản & khoá API",
    summary: "Nơi lưu tài khoản nhân viên và khoá kết nối bên thứ ba.",
    color: "#dc2626",
    steps: [
      {
        text: "Admin tạo tài khoản nhân viên, phân quyền và lưu API key tại CRM (mã hoá AES-256-GCM).",
        edges: ["e-admin-keys"],
      },
      { text: "Access token Zalo OA và KiotViet được làm mới từ bên ngoài CRM.", edges: ["e-sync-token"] },
    ],
  },
];
