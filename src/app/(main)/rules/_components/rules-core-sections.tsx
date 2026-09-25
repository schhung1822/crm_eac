import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Callout, Path, Section, Table } from "./rules-layout";

const highlights = [
  { label: "Nhóm menu", value: "4", hint: "Dashboards · Quản lý · Website SRX · Khác" },
  { label: "Trang chức năng", value: "25", hint: "Chưa tính các trang tạo/sửa chi tiết" },
  { label: "Vai trò", value: "4", hint: "Admin · Chủ cửa hàng · Biên tập viên · User" },
  { label: "Nguồn dữ liệu", value: "2", hint: "Database EAC và database SRX" },
];

export function RulesCoreSections() {
  return (
    <>
      <Section
        id="overview"
        title="1. Tổng quan hệ thống"
        description="CRM là nơi làm việc tập trung của EAC, phục vụ hai khối nghiệp vụ tách biệt trên cùng một giao diện: khai thác dữ liệu kinh doanh nội bộ, và quản trị trực tiếp website SRX Việt Nam."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{item.value}</div>
                <p className="text-muted-foreground text-xs leading-5">{item.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Table
          headers={["Khối", "Bản chất", "Bạn được làm gì"]}
          rows={[
            [
              <span key="eac" className="font-medium">
                Dữ liệu EAC
              </span>,
              "Dữ liệu kinh doanh nội bộ đọc từ hệ thống nguồn của EAC.",
              "Xem, lọc, đối soát, xuất báo cáo. Không phải nơi tạo dữ liệu gốc.",
            ],
            [
              <span key="srx" className="font-medium">
                Website SRX
              </span>,
              "Dữ liệu vận hành thật của srx.vn: sản phẩm, đơn, bài viết, voucher, landing page.",
              "Tạo, sửa, xoá, xuất bản. Thay đổi có thể hiện ra website ngay.",
            ],
          ]}
        />

        <Callout tone="warning" title="Điều quan trọng nhất cần nhớ">
          Hai khối đọc từ hai database khác nhau. Cùng một tên chỉ số (doanh thu, khách hàng, đơn hàng) ở dashboard CRM
          và dashboard SRX Việt Nam <b>không phải cùng một tập dữ liệu</b>, nên không so sánh trực tiếp được.
        </Callout>
      </Section>

      <Section
        id="map"
        title="2. Bản đồ chức năng hiện tại"
        description="Toàn bộ trang đang có trong menu kèm việc bạn làm được ở mỗi trang. Đây là danh sách chuẩn để đối chiếu khi cần tìm một chức năng."
      >
        <h3 className="text-lg font-semibold">Dashboards</h3>
        <Table
          headers={["Trang", "Đường dẫn", "Nội dung"]}
          rows={[
            [
              "Tổng quan",
              <Path key="p1">/dashboard/default</Path>,
              "Chỉ số vận hành chung, mặc định lọc theo tháng hiện tại, có lối tắt xem tháng trước.",
            ],
            [
              "Báo cáo B2B",
              <Path key="p2">/dashboard/b2b</Path>,
              "Doanh thu các kênh ngoài TikTok, Shopee, Website SRX: đơn hàng, khách hàng/đại lý, sale, chi nhánh, sản phẩm bán chạy.",
            ],
            [
              "Báo cáo B2C",
              <Path key="p4">/dashboard/b2c</Path>,
              "Doanh thu TikTok, Shopee, Website SRX: tỷ trọng theo sàn, trạng thái đơn, khách mới/quay lại, sản phẩm bán chạy.",
            ],
            [
              "Báo cáo khách hàng",
              <Path key="p5">/dashboard/customers</Path>,
              "Tệp khách hàng CRM: phân hạng, chi nhánh, số ngày chưa giao dịch, khách mới theo thời gian, top khách VIP.",
            ],
            [
              "SRX Việt Nam",
              <Path key="p3">/dashboard/srxvietnam</Path>,
              "Số liệu website: doanh thu chỉ tính đơn đã hoàn tất và đã thanh toán, còn các thẻ vận hành tính toàn bộ đơn.",
            ],
          ]}
        />

        <h3 className="text-lg font-semibold">Quản lý — dữ liệu EAC</h3>
        <Table
          headers={["Trang", "Đường dẫn", "Nội dung"]}
          rows={[
            [
              "Đơn hàng",
              <Path key="p4">/orders</Path>,
              "Tra cứu đơn theo thời gian, chi nhánh, nhân sự bán hàng; xuất file đối soát.",
            ],
            ["Khách hàng", <Path key="p5">/customers</Path>, "Tệp khách EAC, lịch sử mua và trạng thái hoạt động."],
            ["Hàng hóa", <Path key="p6">/products</Path>, "SKU, danh mục và doanh số liên quan."],
            [
              "Sự kiện",
              <Path key="p7">/events</Path>,
              "Lượt đăng ký thu từ Ladipage sự kiện. Cột câu hỏi sinh theo đúng trường tuỳ chỉnh của từng Ladipage, lọc được theo từng trang và xuất CSV.",
            ],
            ["Zalo OA", <Path key="p8">/zalo-oa</Path>, "Danh sách quan tâm OA, phục vụ CSKH và đối chiếu chiến dịch."],
          ]}
        />

        <h3 className="text-lg font-semibold">Website SRX — Shop</h3>
        <Table
          headers={["Trang", "Đường dẫn", "Nội dung"]}
          rows={[
            ["Đơn hàng", <Path key="p9">/srx/orders</Path>, "Đơn website, cập nhật trạng thái xử lý và thanh toán."],
            [
              "Sản phẩm",
              <Path key="p10">/srx/products</Path>,
              "Tạo/sửa sản phẩm, biến thể, ảnh, thuộc tính và trạng thái hiển thị.",
            ],
            [
              "Danh mục sản phẩm",
              <Path key="p11">/srx/products_categories</Path>,
              "Cây danh mục hiển thị trên website.",
            ],
            [
              "Từ điển thành phần",
              <Path key="p12">/srx/product_tags</Path>,
              "Thẻ thành phần/công dụng gắn cho sản phẩm.",
            ],
            [
              "Thư viện ảnh",
              <Path key="p13">/srx/media-library</Path>,
              "Kho ảnh đã tải lên; ảnh mới tự chuyển sang định dạng webp khi upload.",
            ],
            [
              "Mã giảm giá",
              <Path key="p14">/srx/voucher</Path>,
              "Voucher theo %, số tiền cố định hoặc miễn phí vận chuyển; giới hạn lượt dùng; phạm vi áp dụng; loại công khai / riêng tư.",
            ],
            [
              "Quà tặng",
              <Path key="p15">/srx/gift-rules</Path>,
              "Luật tặng quà theo số lượng sản phẩm hoặc theo giá trị đơn.",
            ],
            [
              "Banner",
              <Path key="p16">/srx/banner</Path>,
              "Banner theo vị trí hiển thị, thời gian chạy và liên kết đích.",
            ],
          ]}
        />

        <h3 className="text-lg font-semibold">Website SRX — Khách hàng, Tin tức, Affiliate, Ladipage</h3>
        <Table
          headers={["Trang", "Đường dẫn", "Nội dung"]}
          rows={[
            [
              "Khách hàng SRX",
              <Path key="p17">/srx/customers</Path>,
              "Tài khoản người dùng website, trạng thái và lịch sử mua.",
            ],
            [
              "Quản lý tin tức",
              <Path key="p18">/srx/news</Path>,
              "Soạn bài bằng CKEditor, viết/tối ưu bài bằng AI, chấm điểm SEO/AEO/GEO, tạo ảnh bìa bằng AI, hẹn giờ và đăng kèm lên Facebook / Zalo OA.",
            ],
            [
              "Danh mục & Thẻ tin tức",
              <Path key="p19">/srx/news_categories</Path>,
              "Phân loại và gắn thẻ cho bài viết trên website.",
            ],
            [
              "Quản lý affiliate",
              <Path key="p20">/srx/affiliates/manage</Path>,
              "Tạo affiliate ngay trong CRM, sửa hồ sơ cá nhân, hoa hồng, thời hạn cookie và tài khoản ngân hàng.",
            ],
            [
              "Phê duyệt hồ sơ",
              <Path key="p21">/srx/affiliates/approval</Path>,
              "Hàng đợi hồ sơ đăng ký gửi từ website; duyệt xong tài khoản affiliate được kích hoạt.",
            ],
            [
              "Ladipage sự kiện",
              <Path key="p22">/srx/ladipage-events</Path>,
              "Landing page đăng ký sự kiện với 2 mẫu giao diện, có luồng nháp / xuất bản tách biệt.",
            ],
          ]}
        />

        <h3 className="text-lg font-semibold">Khác</h3>
        <Table
          headers={["Trang", "Đường dẫn", "Nội dung"]}
          rows={[
            [
              "Quản lý kết nối",
              <Path key="p23">/ai</Path>,
              "Nơi duy nhất lưu API key: Claude, ChatGPT, Gemini, DeepSeek, Google Drive, Facebook Page, Zalo OA. Có nút kiểm tra kết nối và báo cáo token/chi phí AI.",
            ],
            [
              "Tài khoản",
              <Path key="p24">/account</Path>,
              "Thông tin cá nhân và đổi mật khẩu. Admin tạo tài khoản và phân quyền tại đây.",
            ],
            ["Quy tắc", <Path key="p25">/rules</Path>, "Chính là trang bạn đang đọc."],
          ]}
        />

        <Callout title="Không thấy một trang trong menu?">
          Menu ẩn theo vai trò. Nếu thiếu cả một nhóm, khả năng cao là tài khoản chưa được cấp quyền — xem mục{" "}
          <b>Phân quyền</b> bên dưới rồi liên hệ admin.
        </Callout>
      </Section>

      <Section
        id="principles"
        title="3. Nguyên tắc vận hành"
        description="Ba nguyên tắc dưới đây ngăn được phần lớn sự cố dữ liệu thường gặp."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Đúng khối, đúng mục đích</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm leading-6">
              Khối EAC để đọc và đối soát. Khối SRX để vận hành website. Đừng lấy số ở khối này kết luận cho khối kia.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nháp trước, công khai sau</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm leading-6">
              Bài viết, Ladipage, voucher và banner đều có trạng thái riêng. Luôn xem trước rồi mới chuyển sang hiển
              thị.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dashboard không phải số chốt</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm leading-6">
              Dashboard để thấy xu hướng và bất thường. Khi chốt số, mở bảng chi tiết trong module tương ứng.
            </CardContent>
          </Card>
        </div>

        <ul className="list-disc space-y-2 pl-6">
          <li>Chỉ thao tác trong module được phân quyền và đúng nhu cầu công việc.</li>
          <li>Voucher, quà tặng và affiliate: kiểm tra chéo với người phụ trách trước khi áp dụng diện rộng.</li>
          <li>Không dùng chung tài khoản; không xuất dữ liệu hàng loạt nếu không phục vụ một công việc cụ thể.</li>
          <li>
            Đơn hàng, khách hàng và affiliate đã phát sinh giao dịch thì <b>không xoá</b> — đổi trạng thái sang tạm
            ngưng hoặc lưu trữ thay vì xoá.
          </li>
        </ul>
      </Section>

      <Section
        id="permissions"
        title="4. Phân quyền & trách nhiệm"
        description="Hệ thống có 4 vai trò. Vai trò quyết định cả menu nhìn thấy lẫn quyền gọi API phía sau, nên không lách được bằng cách gõ thẳng đường dẫn."
      >
        <Table
          headers={["Vai trò", "Khu vực truy cập", "Trang mặc định sau đăng nhập"]}
          rows={[
            [
              <Badge key="r1">Admin</Badge>,
              "Toàn bộ hệ thống, bao gồm tạo tài khoản và phân quyền.",
              <Path key="d1">/dashboard/default</Path>,
            ],
            [
              <Badge key="r2" variant="secondary">
                Chủ cửa hàng
              </Badge>,
              "Toàn bộ khối Website SRX, dashboard Tổng quan và SRX Việt Nam. Không vào được dữ liệu EAC.",
              <Path key="d2">/dashboard/srxvietnam</Path>,
            ],
            [
              <Badge key="r3" variant="secondary">
                Biên tập viên
              </Badge>,
              "Chỉ Tin tức (bài viết, danh mục, thẻ) và Ladipage sự kiện.",
              <Path key="d3">/srx/news</Path>,
            ],
            [
              <Badge key="r4" variant="outline">
                User
              </Badge>,
              "Dữ liệu EAC: đơn hàng, khách hàng, hàng hóa, sự kiện, Zalo OA và các dashboard. Không vào được khối SRX.",
              <Path key="d4">/dashboard/default</Path>,
            ],
          ]}
        />

        <Callout title="Quyền xem khác quyền sửa">
          Nhìn thấy dữ liệu không đồng nghĩa được sửa. Mỗi bộ phận chịu trách nhiệm về phần dữ liệu mình tác động trực
          tiếp; thao tác quản trị đều gắn với tài khoản thực hiện.
        </Callout>
      </Section>
    </>
  );
}
