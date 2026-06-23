export type FieldType = "text" | "textarea" | "select" | "email" | "tel";

export type CustomQuestion = {
  id: string; // "q1"..."q5"
  enabled: boolean;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // cho select
};

export type HiddenFieldKey = "user_id" | "city" | "role" | "clinic" | "full_name_nv";

export type TemplateTheme = {
  bg: string;
  card: string;
  primary: string;
  primary2: string;
  text: string;
  muted: string;
  ring: string;
};

export type FooterConfig = {
  gradientFrom: string;
  gradientTo: string;
  textColor: string;

  dressCodeTitle: string;
  dressCodeDesc: string;
  dressDots: { white: string; whitePink: string; pink: string; black: string };

  dateDay: string;
  dateMonth: string;
  dateYear: string;
  timeText: string;

  placeName: string;
  placeLine1: string;
  placeLine2: string;
};

export type TemplateStyle = "default" | "starry";

export type HeaderConfig = {
  headingImageUrl: string;
  headingAlt: string;
  descText: string;
  titleText: string;
  subtitleText?: string;
};

export type InfoEventConfig = {
  topText: string;
  headline: string;
  motto: string;
  organizerText: string;
  bottomText: string;
  logo1Url?: string;
  logo2Url?: string;
};

export type TemplateFieldsConfig = {
  // default fields
  full_name: { enabled: boolean; required: boolean; label: string; placeholder: string };
  phone: { enabled: boolean; required: boolean; label: string; placeholder: string };
  email: { enabled: boolean; required: boolean; label: string; placeholder: string };

  // hidden (toggle)
  hidden: Record<HiddenFieldKey, { enabled: boolean; label?: string; placeholder?: string; required?: boolean; visible?: boolean; type?: FieldType; options?: string[] }>;
};

export type FormTemplateConfig = {
  webhookUrl: string;
  templateStyle?: TemplateStyle;
  theme: TemplateTheme;
  header: HeaderConfig;
  infoEvent: InfoEventConfig;
  fields: TemplateFieldsConfig;
  questions: CustomQuestion[]; // tối đa 5
  footer: FooterConfig;

  // giữ nguyên behavior từ template cũ
  behavior: {
    readUserIdFromQueryKey: string; // "userid"
    prefillKeys: { city?: string; role?: string };
    source: string; // "zalo_webview_form"
    eventName: string; // tên sự kiện (sẽ đồng bộ với titleText)
  };
};
