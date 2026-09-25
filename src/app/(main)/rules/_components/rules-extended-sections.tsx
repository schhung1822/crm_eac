import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Callout, Path, Section, Table } from "./rules-layout";

const faqItems = [
  {
    id: "1",
    question: "Số trên dashboard có phải số chốt cuối cùng không?",
    answer:
      "Không. Dashboard phục vụ theo dõi xu hướng và phát hiện bất thường. Khi chốt số, hãy mở bảng chi tiết trong module tương ứng và đối chiếu với hệ thống nguồn.",
  },
  {
    id: "2",
    question: "Vì sao dashboard CRM và dashboard SRX Việt Nam lệch nhau?",
    answer:
      "Vì hai dashboard đọc từ hai database khác nhau: CRM phản ánh dữ liệu EAC, SRX Việt Nam phản ánh dữ liệu website. Chúng không phải hai cách tính của cùng một tập dữ liệu nên không so sánh trực tiếp được.",
  },
  {
    id: "3",
    question: "Tôi sửa Ladipage rồi mà ngoài website vẫn là nội dung cũ?",
    answer:
      "Đó là đúng thiết kế: Lưu nháp không đổi bản public. Bấm 'Cập nhật bản public' trong editor hoặc 'Đẩy bản nháp lên public' ở menu ⋮ trong danh sách. Cũng cần kiểm tra trạng thái là Đã xuất bản và Đang bật.",
  },
  {
    id: "4",
    question: "Trang Sự kiện của tôi thiếu cột câu hỏi so với Ladipage?",
    answer:
      "Cột được sinh theo dữ liệu đã nhận. Câu hỏi mới bật mà chưa ai điền thì chưa có cột. Ngoài ra nếu bạn đổi nhãn câu hỏi sau khi đã có người đăng ký, các lượt cũ vẫn giữ nhãn tại thời điểm gửi form.",
  },
  {
    id: "5",
    question: "Nút AI trong trang tin tức báo chưa có model?",
    answer:
      "Chưa có API key nào đang bật. Vào /ai nhập key cho Claude, ChatGPT, Gemini hoặc DeepSeek rồi tải lại trang soạn bài. Riêng tính năng tạo ảnh chỉ chạy với ChatGPT hoặc Gemini.",
  },
  {
    id: "6",
    question: "Tôi thấy dữ liệu sai, cần gửi gì để được kiểm tra nhanh?",
    answer:
      "Gửi kèm: tên trang, bộ lọc đang áp dụng (thời gian, chi nhánh, trạng thái), một ví dụ cụ thể (mã đơn hoặc mã khách), ảnh chụp màn hình và mô tả con số nào đang sai so với đâu.",
  },
];

export function RulesExtendedSections() {
  return (
    <>
      <Section
        id="data"
        title="10. Nguồn dữ liệu & đối soát"
        description="Biết một con số đến từ đâu là bước bắt buộc trước khi kết luận nó sai."
      >
        <Table
          headers={["Nguồn", "Phục vụ trang nào", "Cách hiểu đúng"]}
          rows={[
            [
              "Database EAC",
              <>
                <Path>/orders</Path>, <Path>/customers</Path>, <Path>/products</Path>, <Path>/zalo-oa</Path>,{" "}
                <Path>/dashboard/b2b</Path>, <Path>/dashboard/b2c</Path>, <Path>/dashboard/customers</Path>
              </>,
              "Nguồn chính cho báo cáo kinh doanh nội bộ.",
            ],
            [
              "Database SRX",
              <>
                Toàn bộ <Path>/srx/*</Path>, <Path>/events</Path> và <Path>/dashboard/srxvietnam</Path>
              </>,
              "Nguồn chính cho mọi số liệu website, bao gồm lượt đăng ký Ladipage.",
            ],
            [
              "Hệ thống nguồn nghiệp vụ",
              "Công cụ vận hành thực tế của từng bộ phận",
              "Dùng để xác minh khi nghi ngờ dữ liệu gốc sai.",
            ],
          ]}
        />

        <p>Khi phát hiện sai lệch, đi lần lượt bốn bước:</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Kiểm tra bộ lọc đang áp dụng trên trang: khoảng thời gian, chi nhánh, sale, trạng thái.</li>
          <li>Đối chiếu dashboard với bảng chi tiết trong cùng module.</li>
          <li>Đối chiếu tiếp với dữ liệu nguồn tương ứng của EAC hoặc SRX.</li>
          <li>Vẫn sai thì ghi lại ví dụ cụ thể và gửi đội kỹ thuật kiểm tra mapping dữ liệu.</li>
        </ol>
      </Section>

      <Section
        id="troubleshooting"
        title="11. Sự cố thường gặp & cách xử lý"
        description="Các thông báo bạn có thể gặp trong lúc dùng, kèm nguyên nhân và hướng xử lý."
      >
        <Table
          headers={["Hiện tượng", "Nguyên nhân thường gặp", "Xử lý"]}
          rows={[
            [
              "Trang báo thiếu bảng trong database",
              "Database chưa được import file SQL tương ứng của module đó.",
              "Gửi tên trang cho đội kỹ thuật để import đúng file SQL rồi tải lại trang.",
            ],
            [
              "Nút AI hiện cảnh báo chưa có model",
              "Chưa cấu hình API key, hoặc key đã hết hạn mức.",
              <>
                Admin vào <Path>/ai</Path> nhập lại key và bấm kiểm tra kết nối.
              </>,
            ],
            [
              "Tạo ảnh AI báo lỗi model",
              "API key chưa được bật quyền tạo ảnh, hoặc model không khả dụng với tài khoản đó.",
              "Đổi sang model tạo ảnh khác trong hộp thoại, hoặc kiểm tra billing của nhà cung cấp.",
            ],
            [
              "Ảnh trong bài hiện lỗi 404",
              "Ảnh được chèn bằng đường dẫn thủ công tới file không tồn tại.",
              <>
                Tải lại ảnh qua <Path>/srx/media-library</Path> hoặc nút tải ảnh trong trình soạn thảo.
              </>,
            ],
            [
              "Ladipage mở ra 404",
              "Trang đang ở trạng thái nháp/lưu trữ, hoặc đã tắt hiển thị, hoặc slug vừa bị đổi.",
              "Kiểm tra trạng thái trong danh sách; nếu vừa đổi slug thì URL cũ không còn dùng được.",
            ],
            [
              "Bài viết không tự đăng lên Facebook / Zalo",
              "Trạng thái bài chưa phải Đang hiển thị, hoặc kết nối mạng xã hội chưa cấu hình.",
              <>
                Đặt lại trạng thái bài và kiểm tra kết nối tại <Path>/ai</Path>.
              </>,
            ],
            [
              "Không mở được một trang, bị đá về trang khác",
              "Vai trò tài khoản không có quyền vào khu vực đó.",
              "Đối chiếu mục Phân quyền phía trên rồi liên hệ admin nếu thực sự cần quyền.",
            ],
          ]}
        />
      </Section>

      <Section
        id="security"
        title="12. Bảo mật & nhật ký"
        description="Hệ thống chứa dữ liệu khách hàng thật và khoá truy cập của bên thứ ba."
      >
        <ul className="list-disc space-y-2 pl-6">
          <li>Không dùng chung tài khoản giữa nhiều người hoặc nhiều bộ phận.</li>
          <li>Luôn đăng xuất khỏi thiết bị dùng chung hoặc máy tại điểm bán.</li>
          <li>Không xuất dữ liệu khách hàng hàng loạt nếu không phục vụ một công việc cụ thể đã được duyệt.</li>
          <li>API key chỉ được lưu tại trang Quản lý kết nối, không dán vào nội dung công khai.</li>
          <li>Các thao tác đăng nhập và quản trị được lưu lại để truy vết khi cần.</li>
          <li>Nghi ngờ lộ tài khoản hoặc thấy dữ liệu bất thường: đổi mật khẩu ngay và báo admin.</li>
        </ul>

        <Callout tone="warning" title="Thao tác không hoàn tác được">
          Xoá bài viết, xoá Ladipage, xoá voucher chưa dùng và xoá sản phẩm là những thao tác không có thùng rác. Khi
          chỉ muốn dừng hiển thị, hãy dùng trạng thái tắt / lưu trữ thay vì xoá.
        </Callout>
      </Section>

      <Section id="faq" title="13. Câu hỏi thường gặp">
        <Accordion type="single" collapsible className="rounded-xl border px-4">
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent className="leading-6">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </>
  );
}
