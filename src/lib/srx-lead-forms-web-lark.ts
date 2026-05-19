import type { SrxLeadFormsWebPayload } from "@/lib/srx-lead-forms-web-payload";
import { buildField, buildInteractiveCard, buildMultilineMarkdown, postToSrxLark } from "@/lib/srx-web-lark";
import { normalizeText } from "@/lib/srx-web-shared";

const leadCardConfigs = {
  consultation: {
    template: "orange",
    title: "Yêu cầu tư vấn mới",
    contentLabel: "Yêu cầu tư vấn",
    formLabel: "Form tư vấn website",
  },
  contact: {
    template: "blue",
    title: "Liên hệ mới",
    contentLabel: "Nội dung liên hệ",
    formLabel: "Form liên hệ website",
  },
  partnership: {
    template: "purple",
    title: "Yêu cầu hợp tác mới",
    contentLabel: "Nội dung hợp tác",
    formLabel: "Form hợp tác website",
  },
} as const;

const fallbackLeadCardConfig = {
  template: "blue",
  title: "Thông báo form mới",
  contentLabel: "Nội dung",
  formLabel: "Form website",
};

function getLeadCardConfig(formType: string) {
  switch (formType) {
    case "consultation": {
      return leadCardConfigs.consultation;
    }
    case "contact": {
      return leadCardConfigs.contact;
    }
    case "partnership": {
      return leadCardConfigs.partnership;
    }
    default: {
      return fallbackLeadCardConfig;
    }
  }
}

export async function sendSrxLeadFormsWebLarkNotification(payload: SrxLeadFormsWebPayload): Promise<void> {
  const config = getLeadCardConfig(payload.formType);
  const cardPayload = buildInteractiveCard({
    title: `${config.title} từ ${normalizeText(payload.customerName)}`,
    template: config.template,
    elements: [
      {
        tag: "div",
        fields: [
          buildField("Họ và tên", payload.customerName),
          buildField("Số điện thoại", payload.phone),
          buildField("Email", payload.email),
          buildField("Lĩnh vực kinh doanh", payload.businessField),
          buildField("Tên thương hiệu", payload.brandName),
          buildField("Loại biểu mẫu", config.formLabel),
          buildField("Nguồn gửi", payload.sourceLabel),
          buildField("Trang gửi", payload.pageUrl ?? payload.pagePath),
        ],
      },
      {
        tag: "hr",
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: buildMultilineMarkdown(config.contentLabel, payload.consultationRequest),
        },
      },
    ],
  });

  await postToSrxLark(cardPayload);
}
