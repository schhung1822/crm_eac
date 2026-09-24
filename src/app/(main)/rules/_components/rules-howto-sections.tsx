import { Callout, HowTo, Path, Section } from "./rules-layout";

export function RulesHowToSections() {
  return (
    <>
      <Section
        id="howto-content"
        title="5. Hướng dẫn: nội dung & tin tức"
        description="Quy trình soạn bài với trợ lý AI. Mọi tính năng AI đều lấy API key từ trang Quản lý kết nối, chưa có key thì các nút AI sẽ báo rõ."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <HowTo
            title="Viết một bài mới bằng AI"
            path="/srx/news → Thêm bài viết"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Nhập Tiêu đề hoặc Từ khoá mục tiêu — AI cần ít nhất một trong hai để biết viết về gì.",
              "Bấm Viết bằng AI, chọn nhà cung cấp (Claude / ChatGPT / Gemini / DeepSeek) và model. Danh sách chỉ hiện nhà cung cấp đã có API key.",
              'Giữ chế độ "Viết bài mới", điền thêm Yêu cầu, Giọng văn, Đối tượng đọc nếu cần, rồi bấm Viết bài.',
              "AI nghiên cứu rồi viết theo đúng bộ tiêu chí chấm điểm, đổ thẳng vào trình soạn thảo và tự chấm điểm SEO/AEO/GEO.",
              "Đọc lại checklist trong thẻ Điểm ở cột phải, sửa những mục còn đỏ, bấm Chấm lại để cập nhật điểm.",
              "Chọn danh mục, thẻ, ảnh đại diện rồi Lưu.",
            ]}
            note="AI có thể viết sai số liệu. Luôn kiểm chứng con số, tên sản phẩm và tuyên bố về công dụng trước khi xuất bản."
          />

          <HowTo
            title="Tối ưu lại một bài đã có"
            path="/srx/news → mở bài → Viết bằng AI"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Bấm Chấm lại trong thẻ Điểm để có danh sách việc cần sửa mới nhất.",
              'Bấm Viết bằng AI rồi đổi Chế độ sang "Tối ưu bài hiện tại".',
              "AI giữ nguyên thông tin đã có và chỉ vá những tiêu chí đang mất điểm, sau đó chấm lại.",
              "So sánh với bản cũ trước khi lưu — nội dung trong trình soạn thảo bị thay toàn bộ.",
            ]}
          />

          <HowTo
            title="Tạo ảnh bìa bằng AI"
            path="/srx/news → Ảnh đại diện → Tạo ảnh bằng AI"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Nhập tiêu đề bài trước, vì AI đọc nội dung bài để vẽ đúng chủ đề.",
              "Chọn nhà cung cấp (chỉ ChatGPT hoặc Gemini có API tạo ảnh) và model tương ứng.",
              "Mô tả thêm nếu muốn, có thể bấm nhanh các preset phong cách; chọn tỷ lệ ảnh (Gemini không nhận tham số tỷ lệ).",
              "Bấm Tạo ảnh, đợi 15-40 giây, xem trước rồi bấm Dùng làm ảnh đại diện.",
            ]}
            note="Ảnh tạo ra được lưu vào thư viện dưới dạng webp. Nếu báo lỗi model, kiểm tra API key đã bật quyền tạo ảnh và còn hạn mức chưa."
          />

          <HowTo
            title="Đăng bài kèm lên Facebook / Zalo OA"
            path="/srx/news → Thiết lập"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Tích nền tảng muốn đăng trong khối Đăng lên nền tảng khác.",
              'Đặt trạng thái là "Đang hiển thị" — không ở trạng thái này thì hệ thống không tự đăng.',
              "Bỏ trống Ngày xuất bản để đăng ngay khi lưu, hoặc chọn thời điểm tương lai để hẹn giờ.",
              "Dòng chữ dưới ô chọn luôn cho biết bài sẽ đăng ngay hay đăng lúc nào.",
            ]}
            note="Kết nối Facebook Page và Zalo OA phải được cấu hình trước tại /ai, nếu không bài vẫn lưu nhưng không đăng đi được."
          />
        </div>
      </Section>

      <Section
        id="howto-shop"
        title="6. Hướng dẫn: bán hàng trên website"
        description="Các thao tác ảnh hưởng trực tiếp tới giá và trải nghiệm mua hàng của khách."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <HowTo
            title="Tạo mã giảm giá"
            path="/srx/voucher → Thêm mã giảm giá"
            role="Admin · Chủ cửa hàng"
            steps={[
              "Nhập Mã (tự viết hoa) và Tên chương trình.",
              "Chọn Loại giảm: phần trăm, số tiền cố định hoặc miễn phí vận chuyển; nhập giá trị tương ứng.",
              "Đặt Mức giảm tối đa và Đơn tối thiểu nếu muốn chặn lạm dụng.",
              "Đặt giới hạn tổng lượt dùng và giới hạn mỗi khách.",
              "Chọn Phạm vi áp dụng: toàn bộ đơn, sản phẩm cụ thể hoặc danh mục cụ thể.",
              'Chọn Loại voucher: "Công khai" cho chương trình quảng bá rộng, "Riêng tư" cho mã gửi riêng từng khách.',
              "Đặt thời gian bắt đầu / kết thúc rồi bật Đang hoạt động và lưu.",
            ]}
            note="Mã đã phát sinh lượt sử dụng thì không xoá được. Muốn dừng thì tắt Đang hoạt động hoặc đặt ngày kết thúc."
          />

          <HowTo
            title="Thiết lập luật tặng quà"
            path="/srx/gift-rules"
            role="Admin · Chủ cửa hàng"
            steps={[
              "Chọn loại luật: theo số lượng một sản phẩm, hoặc theo tổng giá trị đơn.",
              "Chọn sản phẩm/biến thể điều kiện và mức tối thiểu tương ứng.",
              "Chọn quà tặng kèm số lượng; bật nhân theo số lượng mua nếu muốn mua càng nhiều tặng càng nhiều.",
              "Đặt độ ưu tiên khi có nhiều luật cùng thoả, và thời gian áp dụng.",
            ]}
          />
        </div>
      </Section>

      <Section
        id="howto-affiliate"
        title="7. Hướng dẫn: Affiliate"
        description="Quy trình đầy đủ từ tiếp nhận hồ sơ, cấu hình tài khoản, theo dõi đơn giới thiệu đến đối soát và thanh toán hoa hồng cho affiliate."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <HowTo
            title="Duyệt hồ sơ đăng ký từ website"
            path="/srx/affiliates/approval"
            role="Admin · Chủ cửa hàng"
            steps={[
              "Mở hồ sơ và đối chiếu họ tên, email, số điện thoại, kênh quảng bá, đường dẫn mạng xã hội và kế hoạch triển khai.",
              "Kiểm tra nội dung quảng bá có phù hợp với thương hiệu; không duyệt hồ sơ thiếu thông tin quan trọng hoặc có dấu hiệu giả mạo.",
              'Chọn "Đã duyệt" để hệ thống tạo mã affiliate và kích hoạt tài khoản. Nếu từ chối, ghi rõ lý do để có thể tra cứu về sau.',
              "Sau khi duyệt, mở Quản lý affiliate để kiểm tra lại mã, trạng thái, chính sách hoa hồng, thời hạn cookie và thông tin nhận tiền.",
            ]}
            note="Không dùng ghi chú duyệt để lưu mật khẩu, mã OTP, thông tin thẻ hoặc dữ liệu bảo mật khác."
          />

          <HowTo
            title="Tạo affiliate trực tiếp trong CRM"
            path="/srx/affiliates/manage → Thêm affiliate"
            role="Admin · Chủ cửa hàng"
            steps={[
              "Chọn nguồn người dùng: dùng tài khoản website có sẵn (tìm theo tên/email/SĐT), hoặc tạo tài khoản website mới.",
              "Nếu tạo mới: nhập họ tên, email đăng nhập, số điện thoại và mật khẩu tối thiểu 8 ký tự.",
              "Để trống Mã affiliate để hệ thống tự sinh, hoặc nhập mã riêng.",
              "Chọn hoa hồng theo phần trăm khi giá trị đơn thay đổi nhiều; dùng số tiền cố định khi muốn chi cùng một mức cho mỗi đơn đủ điều kiện.",
              "Đặt mức hoa hồng và thời hạn cookie theo chính sách đã thống nhất trước khi affiliate bắt đầu chia sẻ liên kết.",
              "Sang tab Hồ sơ điền thông tin cá nhân, tab Ngân hàng điền tài khoản nhận hoa hồng, rồi Tạo affiliate.",
            ]}
            note="Thông tin ngân hàng: hoặc để trống hoàn toàn, hoặc điền đủ chủ tài khoản + tên ngân hàng + số tài khoản."
          />

          <HowTo
            title="Chỉnh sửa và theo dõi một affiliate"
            path="/srx/affiliates/manage"
            role="Admin · Chủ cửa hàng"
            steps={[
              "Tìm theo tên, email, số điện thoại hoặc mã affiliate; dùng bộ lọc trạng thái để thu hẹp danh sách.",
              "Mở xem nhanh để kiểm tra lượt click, số đơn, hoa hồng chờ duyệt, hoa hồng đã duyệt, đã thanh toán và tổng hợp đợt chi gần nhất.",
              "Chỉ thay đổi tỷ lệ hoa hồng sau khi đã thống nhất ngày hiệu lực; nên ghi chú chính sách cũ và mới để phục vụ đối soát.",
              "Dùng trạng thái Tạm dừng hoặc Đình chỉ khi cần ngăn hoạt động mới; không xoá dữ liệu của affiliate đã phát sinh đơn hoặc hoa hồng.",
              "Cập nhật lại hồ sơ và tài khoản ngân hàng khi người dùng yêu cầu, đồng thời xác minh chủ tài khoản trước kỳ thanh toán kế tiếp.",
            ]}
            note="Mức hoa hồng trên tài khoản là cấu hình tính toán. Khi đối soát vẫn phải kiểm tra trạng thái từng đơn và các khoản đã được đưa vào đợt chi trước đó."
          />

          <HowTo
            title="Đối soát và thanh toán hoa hồng"
            path="/srx/affiliates/manage → Xem nhanh"
            role="Admin · Chủ cửa hàng · Kế toán"
            steps={[
              "Chốt một kỳ đối soát cố định, ví dụ từ ngày đầu đến ngày cuối tháng; không trộn đơn của nhiều kỳ nếu chưa có ghi chú rõ ràng.",
              <>
                Chỉ đưa vào thanh toán các khoản ở trạng thái <b>Đã duyệt</b>. Loại trừ khoản đang chờ, bị từ chối, đã
                huỷ hoặc đã thuộc một đợt chi trước đó.
              </>,
              "Đối chiếu đơn hàng đã thanh toán/hoàn tất, thời hạn đổi trả và các trường hợp hoàn tiền trước khi chốt số tiền.",
              "Xác nhận lại tên chủ tài khoản, ngân hàng và số tài khoản với affiliate; gửi bảng kê gồm kỳ đối soát, các đơn hợp lệ và tổng hoa hồng.",
              "Chuyển khoản với nội dung thống nhất, ví dụ: SRX AFF + mã affiliate + kỳ đối soát; lưu mã giao dịch hoặc chứng từ chuyển tiền.",
              "Sau khi ngân hàng báo thành công, cập nhật đợt chi sang Đã thanh toán và bảo đảm các khoản liên quan không còn xuất hiện ở kỳ kế tiếp.",
            ]}
            note="Nếu CRM chưa có thao tác tạo hoặc cập nhật đợt chi, hãy dùng bảng đối soát được kiểm soát bởi kế toán và chỉ cập nhật dữ liệu khi tính năng thanh toán được bổ sung; không sửa trực tiếp database."
          />
        </div>

        <Callout title="Đề xuất chính sách thanh toán dễ vận hành">
          Nên thanh toán theo một lịch cố định mỗi tháng, áp dụng ngưỡng tối thiểu để giảm phí giao dịch và tự động
          chuyển số dư chưa đạt ngưỡng sang kỳ sau. Có thể bắt đầu với thời gian chờ 7–14 ngày sau khi đơn hoàn tất để
          xử lý đổi trả. Mức hoa hồng nên được chọn theo biên lợi nhuận: phần trăm cho danh mục có giá trị biến động, số
          tiền cố định cho sản phẩm hoặc chiến dịch cần kiểm soát chi phí. Mọi thay đổi chính sách phải có ngày hiệu lực
          và được thông báo trước cho affiliate.
        </Callout>

        <Callout tone="warning" title="Nguyên tắc tránh trả sai hoặc trả trùng">
          Không thanh toán từ số liệu lượt click hoặc tổng đơn. Số tiền chi phải lấy từ các khoản hoa hồng đã được
          duyệt, đã qua thời gian đổi trả và chưa nằm trong đợt chi nào. Trước khi chuyển tiền, cần có hai bước kiểm
          tra: người vận hành lập bảng kê và người có thẩm quyền hoặc kế toán xác nhận. Hồ sơ chứng từ và nghĩa vụ thuế
          cần được kế toán xử lý theo loại người nhận và quy định đang áp dụng.
        </Callout>
      </Section>

      <Section
        id="howto-ladipage"
        title="8. Hướng dẫn: Ladipage sự kiện"
        description="Landing page đăng ký sự kiện chạy trên website SRX. Đây là khu vực duy nhất có luồng nháp / xuất bản tách bạch, nên cần hiểu đúng để không đẩy nhầm bản chưa xong ra ngoài."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <HowTo
            title="Tạo một Ladipage mới"
            path="/srx/ladipage-events → Thêm Ladipage"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Chọn mẫu giao diện ở tab Tổng quan: Template 1 (bong bóng hồng) hoặc Template 2 (webinar đỏ). Đổi mẫu sẽ áp lại bảng màu mặc định.",
              "Đặt slug — đây chính là đường dẫn public /events/{slug}.",
              "Điền phần đầu trang: ảnh bìa, tiêu đề, mô tả và thông tin ban tổ chức.",
              "Sang tab Biểu mẫu: bật/tắt các trường mặc định, thêm tối đa 5 câu hỏi tuỳ chỉnh, bật các trường ẩn cần thu (khu vực, vai trò, đơn vị công tác...).",
              "Sang tab Chân trang: điền ngày giờ, địa điểm và dress code.",
              "Bấm Lưu nháp để giữ bản làm dở, bấm Xuất bản khi muốn trang chạy thật.",
            ]}
            note="Nhãn câu hỏi bạn đặt ở đây chính là tiêu đề cột trong trang Sự kiện. Đặt nhãn rõ ràng ngay từ đầu để dữ liệu dễ đọc về sau."
          />

          <HowTo
            title="Cập nhật trang đang chạy mà không làm gián đoạn"
            path="/srx/ladipage-events → menu ⋮"
            role="Admin · Chủ cửa hàng · Biên tập viên"
            steps={[
              "Mở Ladipage, sửa nội dung rồi bấm Lưu nháp — trang public vẫn giữ nguyên bản cũ.",
              'Danh sách sẽ hiện nhãn "Có bản nháp chưa xuất bản" để bạn biết còn thay đổi đang chờ.',
              'Khi ưng ý, bấm "Cập nhật bản public" trong editor, hoặc "Đẩy bản nháp lên public" trong menu ⋮.',
              "Cần gỡ trang xuống thì chọn Chuyển về nháp, Tắt hiển thị hoặc Lưu trữ.",
            ]}
            note="Web chỉ hiển thị Ladipage ở trạng thái Đã xuất bản và Đang bật. Thiếu một trong hai là trang trả về 404."
          />

          <HowTo
            title="Xem và xuất lượt đăng ký"
            path="/srx/ladipage-events → cột Lượt đăng ký"
            role="Admin · Chủ cửa hàng · User"
            steps={[
              "Bấm số ở cột Lượt đăng ký để mở thẳng danh sách đã lọc theo đúng Ladipage đó.",
              <>
                Hoặc vào <Path>/events</Path> rồi chọn Ladipage trong ô lọc.
              </>,
              "Bảng tự sinh cột theo câu hỏi và trường ẩn của chính Ladipage đó.",
              "Dùng ô tìm kiếm để lọc theo tên, số điện thoại, email hoặc bất kỳ câu trả lời nào.",
              "Bấm Xuất CSV để tải danh sách đang hiển thị, tiêu đề cột giữ nguyên nhãn tiếng Việt.",
            ]}
          />
        </div>
      </Section>

      <Section
        id="howto-connections"
        title="9. Hướng dẫn: kết nối & API key"
        description="Toàn bộ tính năng AI, đăng mạng xã hội và tích hợp bên thứ ba đều lấy khoá từ một nơi duy nhất."
      >
        <HowTo
          title="Thêm hoặc đổi API key"
          path="/ai"
          role="Chỉ Admin"
          steps={[
            "Chọn kết nối cần cấu hình: Claude, ChatGPT, Gemini, DeepSeek, Google Drive, Facebook Page hoặc Zalo OA.",
            "Dán API key và các thông tin đi kèm, rồi lưu. Key được mã hoá trước khi lưu, giao diện chỉ hiện bản che.",
            "Bấm nút kiểm tra để xác nhận key còn sống trước khi bàn giao cho đội nội dung.",
            "Theo dõi mục báo cáo token để biết chi phí AI đang tiêu ở đâu.",
          ]}
          note="Để trống hoặc key sai thì các nút AI ở trang tin tức sẽ hiện cảnh báo thay vì chạy im lặng."
        />

        <Callout tone="warning" title="Không dán API key vào chỗ khác">
          Không đặt API key trong nội dung bài viết, mô tả sản phẩm, ghi chú affiliate hay bất kỳ ô nhập liệu nào khác —
          những nội dung đó có thể hiển thị công khai trên website.
        </Callout>
      </Section>
    </>
  );
}
