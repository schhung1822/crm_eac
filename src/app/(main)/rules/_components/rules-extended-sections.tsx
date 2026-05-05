import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Section, Table } from "./rules-layout";

const faqItems = [
  {
    id: "1",
    question: "Dữ liệu trên dashboard có phải là số chốt cuối cùng không?",
    answer:
      "Không luôn luôn. Dashboard phục vụ theo dõi xu hướng và tổng quan nhanh. Khi chốt số, cần đối chiếu thêm bảng chi tiết và hệ thống nguồn liên quan.",
  },
  {
    id: "2",
    question: "Khi nào tôi chỉ nên xem dữ liệu, khi nào được chỉnh sửa?",
    answer:
      "Với các trang thuộc khối EAC, mặc định nên hiểu là xem, lọc và xuất dữ liệu. Với các trang thuộc Website SRX, bạn chỉ được chỉnh sửa khi đã được phân quyền và hiểu rõ ảnh hưởng lên website.",
  },
  {
    id: "3",
    question: "Vì sao cùng một chỉ số nhưng CRM và SRX dashboard có thể khác nhau?",
    answer:
      "Vì hai dashboard đang đọc từ hai ngữ cảnh dữ liệu khác nhau. Dashboard CRM phản ánh dữ liệu EAC, còn dashboard SRX Việt Nam phản ánh dữ liệu của Website SRX.",
  },
  {
    id: "4",
    question: "Nếu tôi sửa sản phẩm, voucher hoặc banner ở nhóm SRX thì có ảnh hưởng website thật không?",
    answer:
      "Có thể có. Nhóm SRX là khu vực quản trị vận hành website nên mọi thay đổi cần được kiểm tra kỹ trước khi lưu hoặc áp dụng trên diện rộng.",
  },
  {
    id: "5",
    question: "Tôi thấy dữ liệu sai, cần gửi thông tin gì để kiểm tra nhanh?",
    answer:
      "Nên gửi kèm tên module, bộ lọc thời gian, mã đơn hoặc mã khách hàng ví dụ, ảnh chụp màn hình và mô tả rõ số nào đang sai để đội kỹ thuật truy vết nhanh hơn.",
  },
];

export function RulesExtendedSections() {
  return (
    <>
      <Section id="srx-admin" title="6. Quản trị Website SRX Việt Nam">
        <p>
          Đây là nhóm module dành cho vận hành website. Người dùng không chỉ xem số liệu mà còn có thể quản trị trực
          tiếp nhiều thực thể đang hiển thị hoặc đang vận hành trên SRX Việt Nam.
        </p>

        <Table
          headers={["Nhóm", "Trang", "Phạm vi thao tác"]}
          rows={[
            [
              "Shop",
              "Đơn hàng, Sản phẩm, Danh mục sản phẩm, Từ điển thành phần, Voucher, Banner, Thanh toán",
              "Quản lý dữ liệu bán hàng và cấu hình hiển thị website.",
            ],
            ["Khách hàng", "Khách hàng SRX", "Theo dõi tài khoản, lịch sử mua và phân nhóm khách website."],
            [
              "Tin tức",
              "Quản lý tin tức, Danh mục tin tức, Thẻ tin tức",
              "Đăng tải và tổ chức nội dung truyền thông trên website.",
            ],
            [
              "Affiliate",
              "Quản lý affiliate, Phê duyệt hồ sơ, Thiết lập hoa hồng",
              "Điều hành cộng tác viên và chính sách hoa hồng.",
            ],
          ]}
        />

        <ul className="list-disc space-y-2 pl-6">
          <li>Mọi thay đổi ở nhóm này có thể ảnh hưởng trực tiếp tới website đang chạy.</li>
          <li>Trước khi cập nhật dữ liệu công khai, cần kiểm tra lại nội dung hiển thị và phạm vi áp dụng.</li>
          <li>
            Với affiliate và voucher, nên có bước kiểm tra chéo từ người phụ trách trước khi áp dụng số lượng lớn.
          </li>
        </ul>
      </Section>

      <Section id="sync" title="7. Đồng bộ, nguồn dữ liệu và đối soát sai lệch">
        <p>
          Hệ thống hiện tại đang làm việc với nhiều nguồn dữ liệu. Vì vậy cần hiểu đúng nguồn gốc dữ liệu trước khi xác
          nhận một con số là chính thức.
        </p>

        <Table
          headers={["Nguồn dữ liệu", "Phạm vi", "Cách hiểu đúng"]}
          rows={[
            [
              "DB EAC",
              "Đơn hàng, khách hàng, hàng hóa, sự kiện và dashboard CRM",
              "Là nguồn chính cho báo cáo kinh doanh nội bộ.",
            ],
            [
              "DB SRX",
              "Dữ liệu website SRX và dashboard SRX Việt Nam",
              "Là nguồn chính cho số liệu website và các module quản trị SRX.",
            ],
            [
              "Hệ thống nguồn nghiệp vụ",
              "Các công cụ vận hành thực tế của từng bộ phận",
              "Dùng để đối chiếu khi cần xác minh dữ liệu gốc.",
            ],
          ]}
        />

        <p>Quy trình xử lý khi thấy sai lệch:</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Kiểm tra bộ lọc thời gian, chi nhánh, sale hoặc trạng thái đang áp dụng trên trang.</li>
          <li>Đối chiếu dashboard với bảng chi tiết trong cùng module.</li>
          <li>Đối chiếu lại với dữ liệu nguồn tương ứng của EAC hoặc SRX.</li>
          <li>Nếu vẫn sai, ghi rõ ví dụ cụ thể để đội kỹ thuật kiểm tra mapping hoặc pipeline dữ liệu.</li>
        </ol>
      </Section>

      <Section id="permissions" title="8. Phân quyền & trách nhiệm">
        <Table
          headers={["Vai trò", "Trách nhiệm chính"]}
          rows={[
            ["Admin hệ thống", "Quản lý tài khoản, phân quyền, kiểm soát cấu hình và hỗ trợ xử lý lỗi."],
            [
              "Quản lý / Trưởng bộ phận",
              "Theo dõi dashboard, kiểm tra sai lệch số liệu và phê duyệt các thay đổi nhạy cảm.",
            ],
            [
              "Sale / CSKH",
              "Tra cứu khách hàng, đơn hàng, hiệu suất bán và khai thác dữ liệu trong phạm vi được giao.",
            ],
            ["Marketing / Content", "Quản trị tin tức, banner, campaign liên quan website SRX khi được cấp quyền."],
            [
              "Vận hành website",
              "Quản lý sản phẩm, voucher, thanh toán, affiliate và các thay đổi ảnh hưởng trực tiếp website.",
            ],
          ]}
        />

        <p>
          Quyền nhìn thấy dữ liệu không đồng nghĩa với quyền chỉnh sửa dữ liệu. Mỗi bộ phận phải chịu trách nhiệm về
          phần dữ liệu mình tác động trực tiếp.
        </p>
      </Section>

      <Section id="security" title="9. Bảo mật & nhật ký">
        <ul className="list-disc space-y-2 pl-6">
          <li>Không dùng chung tài khoản giữa nhiều người hoặc nhiều bộ phận.</li>
          <li>Không xuất file dữ liệu hàng loạt nếu không phục vụ nhu cầu công việc cụ thể.</li>
          <li>Luôn đăng xuất khỏi thiết bị dùng chung hoặc máy tính tại điểm bán.</li>
          <li>Các hành vi đăng nhập, xem dữ liệu trọng yếu hoặc thao tác quản trị có thể được lưu lại để truy vết.</li>
          <li>Khi nghi ngờ lộ tài khoản hoặc dữ liệu bất thường, cần đổi mật khẩu và báo ngay cho admin hệ thống.</li>
        </ul>
      </Section>

      <Section id="faq" title="10. Câu hỏi thường gặp">
        <Accordion type="single" collapsible>
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </>
  );
}
