import { Section, Table } from "./rules-layout";

export function RulesCoreSections() {
  return (
    <>
      <Section id="overview" title="1. Tổng quan hệ thống">
        <p>
          CRM hiện tại là nền tảng làm việc tập trung cho EAC, phục vụ đồng thời hai nhóm nghiệp vụ: theo dõi dữ liệu
          kinh doanh nội bộ và quản trị dữ liệu vận hành của Website SRX Việt Nam.
        </p>
        <p>
          Khối dữ liệu EAC ưu tiên mục tiêu xem, lọc, đối soát, phân tích và xuất báo cáo. Khối Website SRX cho phép
          quản trị trực tiếp các nghiệp vụ website như sản phẩm, tin tức, voucher, banner, thanh toán và affiliate.
        </p>

        <Table
          headers={["Hạng mục", "Mô tả"]}
          rows={[
            ["Mục tiêu chính", "Tập trung dữ liệu, tăng tốc theo dõi vận hành và hỗ trợ ra quyết định."],
            ["Khối dữ liệu EAC", "Đơn hàng, khách hàng, hàng hóa, sự kiện, Zalo OA và dashboard tổng hợp."],
            [
              "Khối Website SRX",
              "Đơn hàng website, sản phẩm, danh mục, khách hàng, tin tức, voucher, banner, thanh toán và affiliate.",
            ],
            ["Người sử dụng", "Ban lãnh đạo, quản lý, sale, CSKH, marketing, vận hành website và admin hệ thống."],
          ]}
        />
      </Section>

      <Section id="modules" title="2. Cấu trúc module trong phiên bản hiện tại">
        <p>Menu hiện tại được chia thành 4 nhóm lớn để người dùng thao tác đúng ngữ cảnh nghiệp vụ.</p>

        <Table
          headers={["Nhóm menu", "Trang chính", "Mục đích sử dụng"]}
          rows={[
            [
              "Dashboards",
              "Tổng quan, CRM, SRX Việt Nam",
              "Theo dõi KPI, xu hướng doanh thu, vận hành và tăng trưởng.",
            ],
            [
              "Quản lý",
              "Đơn hàng, Khách hàng, Hàng hóa, Sự kiện, Zalo OA",
              "Tra cứu, lọc, đối soát và xuất dữ liệu EAC.",
            ],
            [
              "Website SRX",
              "Shop, Khách hàng, Tin tức, Affiliate",
              "Quản trị dữ liệu trực tiếp cho website SRX Việt Nam.",
            ],
            ["Khác", "Tài khoản, Quy tắc, Khác", "Thiết lập cá nhân và tài liệu hướng dẫn hệ thống."],
          ]}
        />

        <p className="text-muted-foreground text-sm">
          Cùng là một CRM nhưng phạm vi thao tác giữa khối EAC và khối Website SRX là khác nhau. Người dùng cần phân
          biệt rõ trước khi chỉnh sửa hoặc xuất dữ liệu.
        </p>
      </Section>

      <Section id="principles" title="3. Nguyên tắc sử dụng">
        <ul className="list-disc space-y-2 pl-6">
          <li>Chỉ thao tác trong đúng module được phân quyền và đúng mục đích công việc.</li>
          <li>Không dùng dashboard để thay thế bước đối soát chi tiết khi cần chốt số cuối cùng.</li>
          <li>Khối EAC mặc định phục vụ xem, lọc, tổng hợp và xuất dữ liệu; không xem đây là nơi tạo dữ liệu gốc.</li>
          <li>Khối Website SRX cho phép quản trị trực tiếp nên mọi thay đổi cần có trách nhiệm rõ ràng.</li>
          <li>Không chia sẻ tài khoản hoặc phát tán dữ liệu nhạy cảm ra ngoài phạm vi công việc.</li>
        </ul>
      </Section>

      <Section id="dashboards" title="4. Dashboard & báo cáo">
        <p>Phiên bản hiện tại có ba dashboard chính, mỗi dashboard phục vụ một góc nhìn khác nhau.</p>

        <Table
          headers={["Dashboard", "Phạm vi", "Nội dung chính"]}
          rows={[
            ["Tổng quan", "Toàn hệ thống", "Theo dõi nhanh các chỉ số vận hành chung và lối vào các nhóm dữ liệu lớn."],
            ["CRM", "Dữ liệu EAC", "Doanh thu, đơn hàng, khách hàng, hiệu suất sale, chi nhánh và sản phẩm bán chạy."],
            [
              "SRX Việt Nam",
              "Dữ liệu Website SRX",
              "Doanh thu website, đơn hàng, khách hàng mới, sản phẩm, bài viết và affiliate.",
            ],
          ]}
        />

        <p>
          Dashboard dùng để đọc xu hướng, phát hiện bất thường và xác định nhóm cần đào sâu tiếp. Khi cần hành động
          nghiệp vụ, người dùng nên mở sang trang dữ liệu chi tiết tương ứng như đơn hàng, khách hàng hoặc sản phẩm.
        </p>
      </Section>

      <Section id="eac-data" title="5. Dữ liệu EAC và phạm vi sử dụng">
        <p>Khối EAC là khu vực phục vụ tra cứu và báo cáo dữ liệu kinh doanh nội bộ.</p>

        <Table
          headers={["Module", "Dữ liệu chính", "Cách dùng khuyến nghị"]}
          rows={[
            [
              "Đơn hàng",
              "Mã đơn, chi nhánh, nhân sự bán hàng, giá trị đơn và sản phẩm",
              "Lọc theo thời gian, sale, chi nhánh và xuất đối soát.",
            ],
            [
              "Khách hàng",
              "Thông tin liên hệ, phân loại, lịch sử mua và trạng thái hoạt động",
              "Theo dõi tệp khách, chăm sóc lại và đánh giá chất lượng data.",
            ],
            [
              "Hàng hóa",
              "SKU, tên hàng, danh mục và doanh số liên quan",
              "Theo dõi hiệu suất danh mục và sản phẩm bán chạy.",
            ],
            [
              "Sự kiện",
              "Tên sự kiện, thời gian và điểm chạm dữ liệu",
              "Đối chiếu hiệu quả event và nguồn phát sinh khách.",
            ],
            [
              "Zalo OA",
              "Thông tin liên hệ và tương tác liên quan OA",
              "Hỗ trợ CSKH và kiểm tra lịch sử tương tác theo chiến dịch.",
            ],
          ]}
        />

        <p>
          Với khối này, số liệu nên được hiểu là dữ liệu khai thác từ hệ thống nguồn của EAC. Nếu có sai lệch, bước kiểm
          tra đầu tiên luôn là đối chiếu lại dữ liệu gốc tại nơi phát sinh.
        </p>
      </Section>
    </>
  );
}
