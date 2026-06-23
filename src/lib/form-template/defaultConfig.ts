import { FormTemplateConfig, TemplateStyle, TemplateTheme } from "./types";

export const templateThemePresets: Record<TemplateStyle, { footerFrom: string; footerTo: string; theme: TemplateTheme }> = {
  default: {
    theme: {
      bg: "#fde7f1",
      card: "rgba(255,255,255,.92)",
      primary: "#ec5fa4",
      primary2: "#f7a1c4",
      text: "#7a2b4b",
      muted: "#b06a8c",
      ring: "rgba(236,95,164,.35)",
    },
    footerFrom: "#f7a1c4",
    footerTo: "#ec5fa4",
  },
  starry: {
    theme: {
      bg: "#070405",
      card: "rgba(255,255,255,.1)",
      primary: "#c4212b",
      primary2: "#ec4a51",
      text: "#ffffff",
      muted: "#ffd7a2",
      ring: "rgba(236,74,81,.35)",
    },
    footerFrom: "#090304",
    footerTo: "#180608",
  },
};

function createQuestions() {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `q${i + 1}`,
    enabled: false,
    label: "",
    type: "text" as const,
    required: false,
    placeholder: "",
    options: [],
  }));
}

export function createBlankFormTemplateConfig(templateStyle: TemplateStyle = "default"): FormTemplateConfig {
  const preset = templateThemePresets[templateStyle] ?? templateThemePresets.default;

  return {
    webhookUrl: "",
    templateStyle,
    theme: { ...preset.theme },
    header: {
      headingImageUrl: "",
      headingAlt: "",
      descText: "",
      titleText: "",
      subtitleText: "",
    },
    infoEvent: {
      topText: "",
      headline: "",
      motto: "",
      organizerText: "",
      bottomText: "",
      logo1Url: "",
      logo2Url: "",
      logo3Url: "",
    },
    fields: {
      full_name: { enabled: true, required: true, label: "Họ và tên", placeholder: "" },
      phone: { enabled: true, required: true, label: "Số điện thoại", placeholder: "" },
      email: { enabled: true, required: false, label: "Email", placeholder: "" },
      hidden: {
        user_id: { enabled: true, label: "User ID", visible: false, required: false, placeholder: "", type: "text" },
        city: { enabled: false, label: "Khu vực", visible: false, required: false, placeholder: "", type: "text" },
        role: { enabled: false, label: "Vai trò", visible: false, required: false, placeholder: "", type: "text" },
        clinic: { enabled: false, label: "Đơn vị công tác", visible: false, required: false, placeholder: "", type: "text" },
        full_name_nv: { enabled: false, label: "Sale tư vấn", visible: false, required: false, placeholder: "", type: "text" },
      },
    },
    questions: createQuestions(),
    footer: {
      gradientFrom: preset.footerFrom,
      gradientTo: preset.footerTo,
      textColor: "#ffffff",
      dressCodeTitle: "",
      dressCodeDesc: "",
      dressDots: { white: "#ffffff", whitePink: "#fed6f0", pink: "#d34c87", black: "#111111" },
      dateDay: "",
      dateMonth: "",
      dateYear: "",
      timeText: "",
      placeName: "",
      placeLine1: "",
      placeLine2: "",
      template2FooterText: "",
    },
    behavior: {
      readUserIdFromQueryKey: "userid",
      prefillKeys: { city: "city", role: "role" },
      source: "event-landing-page",
      eventName: "",
    },
  };
}

export const defaultConfig: FormTemplateConfig = createBlankFormTemplateConfig("default");
