/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable security/detect-object-injection */
/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  Calendar,
  Copy,
  FileText,
  FormInput,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Palette,
  Save,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { templateThemePresets } from "@/lib/form-template/defaultConfig";
import type { FieldType, FormTemplateConfig, HiddenFieldKey, TemplateStyle } from "@/lib/form-template/types";

import { saveTemplateAction } from "./actions";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const EVENT_IMAGE_PLACEHOLDER = "/upload/events/...";
const PUBLIC_LADIPAGE_BASE_URL = "https://srx.vn";

const templateStyleLabels: Record<TemplateStyle, string> = {
  default: "Bong bóng Hồng",
  starry: "Template 2 - Webinar red",
};

const questionTypeLabels: Record<FieldType, string> = {
  email: "Email",
  select: "Dropdown",
  tel: "Điện thoại",
  text: "Text",
  textarea: "Textarea",
};


const templateEditorCopy: Record<TemplateStyle, {
  heroTitle: string;
  heroDescription: string;
  heroImageLabel: string;
  heroImageDescription: string;
  eyebrowLabel: string;
  titleLabel: string;
  subtitleLabel: string;
  infoTitle: string;
  infoDescription: string;
  infoTopLabel: string;
  infoHeadlineLabel: string;
  infoMottoLabel: string;
  infoOrganizerLabel: string;
  infoBottomLabel: string;
  scheduleDescription: string;
  locationDescription: string;
  footerStyleTitle: string;
  footerStyleDescription: string;
  fieldHelp: string;
}> = {
  default: {
    heroTitle: "Hero, heading va media",
    heroDescription: "Template 1 dung anh heading, tieu de va phu de o phan dau landing page.",
    heroImageLabel: "Anh heading",
    heroImageDescription: "Anh hero/heading hien thi tren dau template 1.",
    eyebrowLabel: "Dong mo ta tren tieu de",
    titleLabel: "Tieu de chinh landing page",
    subtitleLabel: "Phu de",
    infoTitle: "Khoi gioi thieu",
    infoDescription: "Cac text hien thi o khoi gioi thieu ben duoi form cua template 1.",
    infoTopLabel: "Dong chu tren",
    infoHeadlineLabel: "Headline",
    infoMottoLabel: "Motto",
    infoOrganizerLabel: "Organizer text",
    infoBottomLabel: "Dong chu duoi",
    scheduleDescription: "Ngay gio hien thi trong footer template 1.",
    locationDescription: "Dia diem hien thi trong footer template 1.",
    footerStyleTitle: "Footer va dress code",
    footerStyleDescription: "Template 1 co footer gradient va cum dress code.",
    fieldHelp: "Dung cau hoi bo sung neu can them du lieu ngoai cac field co ban.",
  },
  starry: {
    heroTitle: "Banner webinar va thong tin nhanh",
    heroDescription: "Template 2 dung banner doc, badge, tieu de, 3 o metadata va agenda ngan.",
    heroImageLabel: "Banner dau trang",
    heroImageDescription: "Anh banner dung full width o dau template 2, nen dung anh doc/mobile.",
    eyebrowLabel: "Badge tren tieu de",
    titleLabel: "Tieu de webinar",
    subtitleLabel: "Nhan nho duoi tieu de form",
    infoTitle: "Noi dung form va agenda",
    infoDescription: "Template 2 dung headline cho tieu de form, motto/organizer/bottom cho mo ta va agenda neu chua bat cau hoi.",
    infoTopLabel: "Badge phu",
    infoHeadlineLabel: "Tieu de form",
    infoMottoLabel: "Mo ta ngan",
    infoOrganizerLabel: "Mo ta chuong trinh",
    infoBottomLabel: "Ghi chu/xac nhan",
    scheduleDescription: "Ngay gio hien thi trong 3 o metadata cua template 2.",
    locationDescription: "Dia diem/hinh thuc hien thi trong metadata va footer template 2.",
    footerStyleTitle: "Mau footer",
    footerStyleDescription: "Template 2 uu tien nen toi/do, khong dung cum dress code.",
    fieldHelp: "Voi template 2, hay bat field bo sung nhu Clinic, Khu vuc, Sale tu van neu can giong mau HTML.",
  },
};
const hiddenFieldLabels: Record<HiddenFieldKey, string> = {
  city: "City",
  clinic: "Clinic",
  full_name_nv: "Full name NV",
  role: "Role",
  user_id: "User ID",
};

type DefaultFieldConfig = FormTemplateConfig["fields"]["full_name"];
type QuestionConfig = FormTemplateConfig["questions"][number];

async function uploadEventImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/srx/ladipage-events/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tải ảnh ladipage");
  }

  return String(result.url ?? "");
}

function normalizePublicPath(currentTemplateSlug: string) {
  return `/events/${currentTemplateSlug}`;
}

function buildPublicUrl(pathOrUrl: string) {
  const trimmedPath = pathOrUrl.trim();

  if (!trimmedPath) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  try {
    return new URL(trimmedPath, `${PUBLIC_LADIPAGE_BASE_URL}/`).toString();
  } catch {
    return trimmedPath;
  }
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border-border/70 bg-background/85 rounded-2xl border p-4 shadow-sm">
      <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <p className="text-muted-foreground mt-1 text-sm leading-5">{hint}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
            <Icon className="size-4" />
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-border/70 bg-card flex items-center gap-3 rounded-xl border p-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-border/70 h-11 w-14 cursor-pointer rounded-lg border bg-transparent"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <div className="border-border/70 bg-card flex items-start justify-between gap-4 rounded-xl border p-3">
      <div className="space-y-1">
        <Label className="text-sm">{label}</Label>
        {description ? <p className="text-muted-foreground text-xs leading-5">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  description?: string;
}) {
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("File tải lên phải là ảnh");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Ảnh vượt quá 10MB");
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadEventImage(file);
      onChange(url);
      toast.success(`Đã tải ${label.toLowerCase()} lên thư mục events`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Không thể tải ${label.toLowerCase()}`);
    } finally {
      setIsUploading(false);

      if (inputReference.current) {
        inputReference.current.value = "";
      }
    }
  }

  return (
    <div className="border-border/70 bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-muted-foreground text-xs leading-5">
            {description ?? "Ảnh sẽ được lưu vào thư mục public/upload/events."}
          </p>
        </div>
        <Badge variant="outline">upload/events</Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="border-border/70 bg-muted/30 overflow-hidden rounded-2xl border border-dashed">
          {value ? (
            <div className="bg-muted/20 flex aspect-[21/9] items-center justify-center">
              <img src={value} alt={label} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="text-muted-foreground flex aspect-[16/9] flex-col items-center justify-center gap-2 text-center text-xs">
              <ImageIcon className="size-6" />
              <span>Chưa có ảnh</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={EVENT_IMAGE_PLACEHOLDER}
          />

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputReference}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
            />

            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => inputReference.current?.click()}
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isUploading ? "Đang tải..." : "Tải ảnh"}
            </Button>

            {value ? (
              <Button type="button" variant="ghost" disabled={isUploading} onClick={() => onChange("")}>
                <X className="size-4" />
                Xóa
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultFieldEditor({
  title,
  field,
  onChange,
}: {
  title: string;
  field: DefaultFieldConfig;
  onChange: (patch: Partial<DefaultFieldConfig>) => void;
}) {
  return (
    <div className="border-border/70 bg-card rounded-2xl border p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-muted-foreground text-xs leading-5">Chỉnh hiển thị, bắt buộc và nội dung gợi ý.</p>
        </div>
        <Badge variant={field.enabled ? "default" : "secondary"}>{field.enabled ? "Đang bật" : "Đang tắt"}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nhãn hiển thị</Label>
          <Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input value={field.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ToggleField
          label="Hiển thị field"
          checked={field.enabled}
          onChange={(value) => onChange({ enabled: value })}
        />
        <ToggleField
          label="Bắt buộc nhập"
          checked={field.required}
          onChange={(value) => onChange({ required: value })}
        />
      </div>
    </div>
  );
}

function QuestionEditor({
  index,
  question,
  onChange,
}: {
  index: number;
  question: QuestionConfig;
  onChange: (patch: Partial<QuestionConfig>) => void;
}) {
  return (
    <div className="border-border/70 bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">Câu hỏi {index + 1}</h4>
            <Badge variant={question.enabled ? "default" : "secondary"}>
              {question.enabled ? questionTypeLabels[question.type] : "Đang tắt"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-5">
            Bật câu hỏi khi cần thêm dữ liệu ngoài các field mặc định.
          </p>
        </div>
        <Switch checked={question.enabled} onCheckedChange={(value) => onChange({ enabled: value })} />
      </div>

      {question.enabled ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nhãn câu hỏi</Label>
              <Input
                value={question.label}
                onChange={(event) => onChange({ label: event.target.value })}
                placeholder="Ví dụ: Bạn quan tâm nội dung nào?"
              />
            </div>
            <div className="space-y-2">
              <Label>Loại input</Label>
              <Select value={question.type} onValueChange={(type: FieldType) => onChange({ type })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="tel">Số điện thoại</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={question.placeholder ?? ""}
                onChange={(event) => onChange({ placeholder: event.target.value })}
                placeholder="Nhập nội dung gợi ý..."
              />
            </div>
          </div>

          <ToggleField
            label="Bắt buộc trả lời"
            checked={question.required}
            onChange={(value) => onChange({ required: value })}
          />

          {question.type === "select" ? (
            <div className="space-y-2">
              <Label>Tùy chọn dropdown</Label>
              <Textarea
                value={(question.options ?? []).join("\n")}
                onChange={(event) =>
                  onChange({
                    options: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={"Lựa chọn 1\nLựa chọn 2\nLựa chọn 3"}
                rows={4}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground border-border/70 bg-muted/20 mt-4 rounded-xl border border-dashed px-4 py-3 text-sm">
          Câu hỏi đang tắt. Bật lên để nhập label, placeholder và loại input.
        </div>
      )}
    </div>
  );
}

function AdditionalFieldEditor({
  title,
  field,
  onChange,
}: {
  title: string;
  field: FormTemplateConfig["fields"]["hidden"][HiddenFieldKey];
  onChange: (patch: Partial<FormTemplateConfig["fields"]["hidden"][HiddenFieldKey]>) => void;
}) {
  const fieldType = field.type ?? "text";

  return (
    <div className="border-border/70 bg-card rounded-2xl border p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-medium">{field.label || title}</h4>
          <p className="text-muted-foreground text-xs leading-5">
            Bat field de submit kem du lieu. Bat hien thi neu muon nguoi dung nhap tren form.
          </p>
        </div>
        <Badge variant={field.enabled ? "default" : "secondary"}>{field.enabled ? "Dang bat" : "Dang tat"}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ToggleField label="Luu field nay" checked={field.enabled} onChange={(value) => onChange({ enabled: value })} />
        <ToggleField label="Hien thi tren form" checked={Boolean(field.visible)} onChange={(value) => onChange({ visible: value })} />
        <ToggleField label="Bat buoc nhap" checked={Boolean(field.required)} onChange={(value) => onChange({ required: value })} />
        <div className="space-y-2">
          <Label>Loai input</Label>
          <Select value={fieldType} onValueChange={(type: FieldType) => onChange({ type })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="tel">So dien thoai</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input value={field.label ?? ""} onChange={(event) => onChange({ label: event.target.value })} placeholder={title} />
        </div>
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input value={field.placeholder ?? ""} onChange={(event) => onChange({ placeholder: event.target.value })} />
        </div>
      </div>

      {fieldType === "select" ? (
        <div className="mt-3 space-y-2">
          <Label>Tuy chon dropdown</Label>
          <Textarea
            value={(field.options ?? []).join("\n")}
            onChange={(event) =>
              onChange({
                options: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder={"Lua chon 1\nLua chon 2\nLua chon 3"}
            rows={4}
          />
        </div>
      ) : null}
    </div>
  );
}
export default function AdminTemplateEditor({
  slug,
  initialName,
  initialConfig,
  editorTitle,
  redirectToEditBasePath,
}: {
  slug: string;
  initialName: string;
  initialConfig: FormTemplateConfig;
  editorTitle?: string;
  publicBaseUrl?: string;
  publicPath?: string;
  redirectToEditBasePath?: string;
}) {
  const router = useRouter();
  const [config, setConfig] = React.useState<FormTemplateConfig>(initialConfig);
  const [saving, setSaving] = React.useState(false);
  const [templateSlug, setTemplateSlug] = React.useState(slug);
  const [currentSlug, setCurrentSlug] = React.useState(slug);

  const update = React.useCallback((patch: Partial<FormTemplateConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const resolvedPublicPath = React.useMemo(
    () => normalizePublicPath(templateSlug),
    [templateSlug],
  );
  const publicUrl = React.useMemo(
    () => buildPublicUrl(resolvedPublicPath),
    [resolvedPublicPath],
  );
  const visibleDefaultFieldsCount = React.useMemo(
    () => [config.fields.full_name, config.fields.phone, config.fields.email].filter((field) => field.enabled).length,
    [config.fields.email, config.fields.full_name, config.fields.phone],
  );
  const enabledQuestions = React.useMemo(
    () => config.questions.slice(0, 5).filter((question) => question.enabled),
    [config.questions],
  );
  const enabledQuestionsCount = enabledQuestions.length;
  const requiredInputCount = React.useMemo(() => {
    const requiredBaseFields = [config.fields.full_name, config.fields.phone, config.fields.email].filter(
      (field) => field.enabled && field.required,
    ).length;
    const requiredQuestions = enabledQuestions.filter((question) => question.required).length;
    return requiredBaseFields + requiredQuestions;
  }, [config.fields.email, config.fields.full_name, config.fields.phone, enabledQuestions]);
  const mediaCount = React.useMemo(
    () =>
      [config.header.headingImageUrl, config.infoEvent.logo1Url, config.infoEvent.logo2Url, config.infoEvent.logo3Url].filter((value) =>
        value?.trim(),
      ).length,
    [config.header.headingImageUrl, config.infoEvent.logo1Url, config.infoEvent.logo2Url, config.infoEvent.logo3Url],
  );
  const themeSwatches = React.useMemo(
    () =>
      [
        { label: "Primary", color: config.theme.primary },
        { label: "Primary 2", color: config.theme.primary2 },
        { label: "Text", color: config.theme.text },
        { label: "Muted", color: config.theme.muted },
        { label: "Background", color: config.theme.bg },
        { label: "Card", color: config.theme.card },
        { label: "Ring", color: config.theme.ring },
        { label: "Footer from", color: config.footer.gradientFrom },
        { label: "Footer to", color: config.footer.gradientTo },
      ].map((entry, index, items) => ({
        ...entry,
        key: `swatch-${entry.color}-${items.slice(0, index).filter((item) => item.color === entry.color).length}`,
      })),
    [
      config.footer.gradientFrom,
      config.footer.gradientTo,
      config.theme.bg,
      config.theme.card,
      config.theme.muted,
      config.theme.primary,
      config.theme.primary2,
      config.theme.ring,
      config.theme.text,
    ],
  );
  const visibleFieldLabels = React.useMemo(
    () =>
      [config.fields.full_name, config.fields.phone, config.fields.email]
        .filter((field) => field.enabled)
        .map((field) => field.label),
    [config.fields.email, config.fields.full_name, config.fields.phone],
  );
  const currentTemplateStyle = config.templateStyle ?? "default";
  const currentTemplateCopy = templateEditorCopy[currentTemplateStyle] ?? templateEditorCopy.default;

  const applyTemplateStyle = React.useCallback(
    (templateStyle: TemplateStyle) => {
      const preset = templateThemePresets[templateStyle] ?? templateThemePresets.default;

      update({
        templateStyle,
        theme: { ...preset.theme },
        footer: {
          ...config.footer,
          gradientFrom: preset.footerFrom,
          gradientTo: preset.footerTo,
          textColor: "#ffffff",
        },
      });
    },
    [config.footer, update],
  );

  const updateDefaultField = React.useCallback(
    (fieldKey: "full_name" | "phone" | "email", patch: Partial<DefaultFieldConfig>) => {
      update({
        fields: {
          ...config.fields,
          [fieldKey]: {
            ...config.fields[fieldKey],
            ...patch,
          },
        },
      });
    },
    [config.fields, update],
  );

  const updateQuestion = React.useCallback(
    (index: number, patch: Partial<QuestionConfig>) => {
      const nextQuestions = [...config.questions];
      nextQuestions[index] = { ...nextQuestions[index], ...patch };
      update({ questions: nextQuestions });
    },
    [config.questions, update],
  );

  async function handleCopyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Đã sao chép URL website hiển thị.");
    } catch {
      toast.error("Không thể sao chép URL website hiển thị.");
    }
  }

  async function onSave() {
    try {
      setSaving(true);
      const nextSlug = templateSlug.trim();
      const result = await saveTemplateAction(
        currentSlug,
        nextSlug,
        config.behavior.eventName.trim() || initialName,
        config,
      );
      setCurrentSlug(nextSlug);
      setTemplateSlug(nextSlug);

      const normalizedRedirectBasePath = redirectToEditBasePath?.trim();

      if (normalizedRedirectBasePath && result.eventId) {
        const nextEditPath = `${normalizedRedirectBasePath}/${encodeURIComponent(result.eventId)}/edit`;

        if (window.location.pathname !== nextEditPath) {
          router.replace(nextEditPath);
        }
      }

      toast.success("Đã lưu cấu hình ladipage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình ladipage.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="border-border/70 bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="space-y-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{editorTitle ?? "Chỉnh sửa Ladipage sự kiện"}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{templateStyleLabels[currentTemplateStyle]}</Badge>
              <Badge variant="outline">srx.vn</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {publicUrl ? (
              <Button type="button" variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <Link2 className="size-4" />
                  Mở public
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void handleCopyPublicUrl()}>
              <Copy className="size-4" />
              Sao chép URL
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-2 lg:px-6 lg:py-6">
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <Tabs defaultValue="general" className="space-y-5">
              <TabsList className="border-border/70 bg-background h-auto w-full flex-wrap justify-start rounded-2xl border p-1">
                <TabsTrigger value="general" className="rounded-xl px-4 py-2.5">
                  <Sparkles className="size-4" />
                  Tổng quan
                </TabsTrigger>
                <TabsTrigger value="form" className="rounded-xl px-4 py-2.5">
                  <FormInput className="size-4" />
                  Form
                </TabsTrigger>
                <TabsTrigger value="footer" className="rounded-xl px-4 py-2.5">
                  <FileText className="size-4" />
                  Thông tin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-5">
                <Accordion type="multiple" defaultValue={["identity", "hero", "theme"]} className="space-y-4">
                  <AccordionItem value="identity" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Nhận diện & xuất bản</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Thông tin ladipage"
                        description="Tên sự kiện, slug và template là các thông tin chính khi triển khai landing page."
                        icon={Globe}
                      >
                        <div className="grid gap-4 lg:grid-cols-12">
                          <div className="space-y-2 lg:col-span-8">
                            <Label>Tên sự kiện</Label>
                            <Input
                              value={config.behavior.eventName}
                              onChange={(event) => {
                                const eventName = event.target.value;
                                const shouldSyncTitle =
                                  !config.header.titleText.trim() ||
                                  config.header.titleText.trim() === config.behavior.eventName.trim();

                                update({
                                  behavior: { ...config.behavior, eventName },
                                  header: {
                                    ...config.header,
                                    titleText: shouldSyncTitle ? eventName : config.header.titleText,
                                  },
                                });
                              }}
                              placeholder="Ví dụ: Check in sự kiện EAC Summit"
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-4">
                            <Label>Template Ladipage</Label>
                            <Select
                              value={currentTemplateStyle}
                              onValueChange={(value: TemplateStyle) => applyTemplateStyle(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn template" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Template 1</SelectItem>
                                <SelectItem value="starry">Template 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 lg:col-span-4">
                            <Label>Slug trang</Label>
                            <Input
                              value={templateSlug}
                              onChange={(event) => setTemplateSlug(event.target.value)}
                              placeholder="eac-checkin"
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-8">
                            <Label>URL website hiển thị</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input value={publicUrl} readOnly className="font-mono text-sm" />
                              <Button type="button" variant="outline" onClick={() => void handleCopyPublicUrl()}>
                                <Copy className="size-4" />
                                Sao chép
                              </Button>
                            </div>
                          </div>
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="hero" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Hero, heading và media</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <ImageUploadField
                          label="Ảnh heading"
                          value={config.header.headingImageUrl}
                          onChange={(url) => update({ header: { ...config.header, headingImageUrl: url } })}
                        />

                        <SectionCard
                          title="Nội dung hero"
                          description="Những text này xuất hiện ngay phần đầu landing page, cần ngắn và rõ."
                          icon={Type}
                        >
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label>Alt text cho ảnh</Label>
                              <Input
                                value={config.header.headingAlt}
                                onChange={(event) =>
                                  update({ header: { ...config.header, headingAlt: event.target.value } })
                                }
                                placeholder="Ví dụ: Logo sự kiện"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Dòng mô tả trên tiêu đề</Label>
                              <Input
                                value={config.header.descText}
                                onChange={(event) =>
                                  update({ header: { ...config.header, descText: event.target.value } })
                                }
                                placeholder="We cordially invite"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tiêu đề chính landing page</Label>
                              <Input
                                value={config.header.titleText}
                                onChange={(event) =>
                                  update({ header: { ...config.header, titleText: event.target.value } })
                                }
                                placeholder="Check in sự kiện"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Phụ đề</Label>
                              <Textarea
                                value={config.header.subtitleText ?? ""}
                                onChange={(event) =>
                                  update({ header: { ...config.header, subtitleText: event.target.value } })
                                }
                                placeholder="Nhập phụ đề nếu cần..."
                                rows={3}
                              />
                            </div>
                          </div>
                        </SectionCard>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="theme" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Theme màu sắc</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Màu giao diện"
                        description="Tất cả token màu quan trọng được gom vào cùng một chỗ để chỉnh nhanh."
                        icon={Palette}
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <ColorInput
                            label="Primary"
                            value={config.theme.primary}
                            onChange={(value) => update({ theme: { ...config.theme, primary: value } })}
                          />
                          <ColorInput
                            label="Primary 2"
                            value={config.theme.primary2}
                            onChange={(value) => update({ theme: { ...config.theme, primary2: value } })}
                          />
                          <ColorInput
                            label="Text"
                            value={config.theme.text}
                            onChange={(value) => update({ theme: { ...config.theme, text: value } })}
                          />
                          <ColorInput
                            label="Muted"
                            value={config.theme.muted}
                            onChange={(value) => update({ theme: { ...config.theme, muted: value } })}
                          />
                          <ColorInput
                            label="Background"
                            value={config.theme.bg}
                            onChange={(value) => update({ theme: { ...config.theme, bg: value } })}
                          />
                          <ColorInput
                            label="Card"
                            value={config.theme.card}
                            onChange={(value) => update({ theme: { ...config.theme, card: value } })}
                          />
                          <ColorInput
                            label="Ring"
                            value={config.theme.ring}
                            onChange={(value) => update({ theme: { ...config.theme, ring: value } })}
                          />
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="form" className="space-y-5">
                <Accordion type="multiple" defaultValue={["default-fields", "questions"]} className="space-y-4">
                  <AccordionItem
                    value="default-fields"
                    className="border-border/70 bg-background rounded-2xl border px-5"
                  >
                    <AccordionTrigger className="py-5 text-base">Trường mặc định</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Trường mặc định"
                        description="Chỉnh label, placeholder và mức bắt buộc cho 3 field cơ bản của form."
                        icon={FormInput}
                      >
                        <div className="grid gap-4">
                          <DefaultFieldEditor
                            title="Họ và tên"
                            field={config.fields.full_name}
                            onChange={(patch) => updateDefaultField("full_name", patch)}
                          />
                          <DefaultFieldEditor
                            title="Số điện thoại"
                            field={config.fields.phone}
                            onChange={(patch) => updateDefaultField("phone", patch)}
                          />
                          <DefaultFieldEditor
                            title="Email"
                            field={config.fields.email}
                            onChange={(patch) => updateDefaultField("email", patch)}
                          />
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="questions" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Câu hỏi bổ sung</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Trường tùy chỉnh"
                        description="Tối đa 5 câu hỏi. Chỉ bật những câu thật sự cần để form gọn và dễ điền."
                        icon={MessageSquare}
                      >
                        <div className="grid gap-4">
                          {config.questions.slice(0, 5).map((question, index) => (
                            <QuestionEditor
                              key={question.id}
                              index={index}
                              question={question}
                              onChange={(patch) => updateQuestion(index, patch)}
                            />
                          ))}
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="integration" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Tracking & tích hợp</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Nguồn dữ liệu"
                        description="Khối này dành cho dữ liệu ẩn và webhook khi cần đồng bộ sang hệ thống khác."
                        icon={Globe}
                      >
                        <div className="space-y-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                              <Label>Webhook URL</Label>
                              <Input
                                value={config.webhookUrl}
                                onChange={(event) => update({ webhookUrl: event.target.value })}
                                placeholder="https://example.com/webhook"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Source</Label>
                              <Input
                                value={config.behavior.source}
                                onChange={(event) =>
                                  update({ behavior: { ...config.behavior, source: event.target.value } })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Query key đọc user_id</Label>
                              <Input
                                value={config.behavior.readUserIdFromQueryKey}
                                onChange={(event) =>
                                  update({
                                    behavior: {
                                      ...config.behavior,
                                      readUserIdFromQueryKey: event.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Prefill city key</Label>
                              <Input
                                value={config.behavior.prefillKeys.city ?? ""}
                                onChange={(event) =>
                                  update({
                                    behavior: {
                                      ...config.behavior,
                                      prefillKeys: { ...config.behavior.prefillKeys, city: event.target.value },
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Prefill role key</Label>
                              <Input
                                value={config.behavior.prefillKeys.role ?? ""}
                                onChange={(event) =>
                                  update({
                                    behavior: {
                                      ...config.behavior,
                                      prefillKeys: { ...config.behavior.prefillKeys, role: event.target.value },
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium">Field ẩn</h4>
                              <p className="text-muted-foreground text-sm leading-6">
                                Những field này không hiển thị ra UI nhưng vẫn có thể đi kèm dữ liệu submit.
                              </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {(["user_id", "city", "role", "clinic", "full_name_nv"] as HiddenFieldKey[]).map(
                                (key) => (
                                  <AdditionalFieldEditor
                                    key={key}
                                    title={hiddenFieldLabels[key]}
                                    field={config.fields.hidden[key]}
                                    onChange={(patch) =>
                                      update({
                                        fields: {
                                          ...config.fields,
                                          hidden: {
                                            ...config.fields.hidden,
                                            [key]: { ...config.fields.hidden[key], ...patch },
                                          },
                                        },
                                      })
                                    }
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="footer" className="space-y-5">
                <Accordion
                  type="multiple"
                  defaultValue={["event-info", "logos", "footer-style", "schedule"]}
                  className="space-y-4"
                >
                  <AccordionItem value="event-info" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Thông tin sự kiện</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Khối giới thiệu"
                        description="Các text này xuất hiện ở phần nội dung giới thiệu phía dưới form."
                        icon={FileText}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Dòng chữ trên</Label>
                            <Input
                              value={config.infoEvent.topText}
                              onChange={(event) =>
                                update({ infoEvent: { ...config.infoEvent, topText: event.target.value } })
                              }
                              placeholder="to attend the launch event"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Headline</Label>
                            <Input
                              value={config.infoEvent.headline}
                              onChange={(event) =>
                                update({ infoEvent: { ...config.infoEvent, headline: event.target.value } })
                              }
                              placeholder="SGA Renew Peel"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Motto</Label>
                            <Input
                              value={config.infoEvent.motto}
                              onChange={(event) =>
                                update({ infoEvent: { ...config.infoEvent, motto: event.target.value } })
                              }
                              placeholder="Đa tầng tác động, dứt vòng mụn thâm"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Giới thiệu sự kiện</Label>
                            <Textarea
                              value={config.infoEvent.organizerText}
                              onChange={(event) =>
                                update({ infoEvent: { ...config.infoEvent, organizerText: event.target.value } })
                              }
                              placeholder="organized by EAC Group and SRX Laboratory Dermatology"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Dòng chữ dưới</Label>
                            <Textarea
                              value={config.infoEvent.bottomText}
                              onChange={(event) =>
                                update({ infoEvent: { ...config.infoEvent, bottomText: event.target.value } })
                              }
                              placeholder="We would be honored to have you at the event"
                              rows={3}
                            />
                          </div>
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logos" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Logo & hình ảnh phụ</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <SectionCard
                        title="Logo sự kiện"
                        description="Logo đối tác hoặc thương hiệu sẽ được hiển thị cạnh nhau ở khối thông tin sự kiện."
                        icon={ImageIcon}
                      >
                        <div className="grid gap-5 xl:grid-cols-3">
                          <ImageUploadField
                            label="Logo 1"
                            value={config.infoEvent.logo1Url ?? ""}
                            onChange={(url) => update({ infoEvent: { ...config.infoEvent, logo1Url: url } })}
                          />
                          <ImageUploadField
                            label="Logo 2"
                            value={config.infoEvent.logo2Url ?? ""}
                            onChange={(url) => update({ infoEvent: { ...config.infoEvent, logo2Url: url } })}
                          />
                          <ImageUploadField
                            label="Logo 3"
                            value={config.infoEvent.logo3Url ?? ""}
                            onChange={(url) => update({ infoEvent: { ...config.infoEvent, logo3Url: url } })}
                          />
                        </div>
                      </SectionCard>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="footer-style"
                    className="border-border/70 bg-background rounded-2xl border px-5"
                  >
                    <AccordionTrigger className="py-5 text-base">Footer, dress code & màu sắc</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="grid gap-5 xl:grid-cols-2">
                        <SectionCard
                          title="Footer"
                          description="Gradient và màu chữ ở phần cuối landing page."
                          icon={Palette}
                        >
                          <div className="space-y-2">
                            <Label>Thông tin footer</Label>
                            <Textarea
                              value={config.footer.template2FooterText ?? ""}
                              onChange={(event) =>
                                update({ footer: { ...config.footer, template2FooterText: event.target.value } })
                              }
                              placeholder="Ví dụ: Ban tổ chức sẽ liên hệ xác nhận thông tin tham dự trước sự kiện."
                              rows={4}
                            />
                          </div>
                          <div className="grid gap-4 mt-4">
                            <ColorInput
                              label="Màu Gradient bắt đầu"
                              value={config.footer.gradientFrom}
                              onChange={(value) => update({ footer: { ...config.footer, gradientFrom: value } })}
                            />
                            <ColorInput
                              label="Màu Gradient kết thúc"
                              value={config.footer.gradientTo}
                              onChange={(value) => update({ footer: { ...config.footer, gradientTo: value } })}
                            />
                            <ColorInput
                              label="Màu chữ"
                              value={config.footer.textColor}
                              onChange={(value) => update({ footer: { ...config.footer, textColor: value } })}
                            />
                          </div>
                        </SectionCard>
                        <SectionCard
                          title="Dress code"
                          description="Tiêu đề, mô tả và 4 chấm màu hiển thị ở cột trái footer."
                          icon={Sparkles}
                        >
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Tiêu đề dress code</Label>
                              <Input
                                value={config.footer.dressCodeTitle}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, dressCodeTitle: event.target.value } })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Mô tả dress code</Label>
                              <Input
                                value={config.footer.dressCodeDesc}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, dressCodeDesc: event.target.value } })
                                }
                              />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <ColorInput
                                label="Màu 1"
                                value={config.footer.dressDots.white}
                                onChange={(value) =>
                                  update({
                                    footer: {
                                      ...config.footer,
                                      dressDots: { ...config.footer.dressDots, white: value },
                                    },
                                  })
                                }
                              />
                              <ColorInput
                                label="Màu 2"
                                value={config.footer.dressDots.whitePink}
                                onChange={(value) =>
                                  update({
                                    footer: {
                                      ...config.footer,
                                      dressDots: { ...config.footer.dressDots, whitePink: value },
                                    },
                                  })
                                }
                              />
                              <ColorInput
                                label="Màu 3"
                                value={config.footer.dressDots.pink}
                                onChange={(value) =>
                                  update({
                                    footer: {
                                      ...config.footer,
                                      dressDots: { ...config.footer.dressDots, pink: value },
                                    },
                                  })
                                }
                              />
                              <ColorInput
                                label="Màu 4"
                                value={config.footer.dressDots.black}
                                onChange={(value) =>
                                  update({
                                    footer: {
                                      ...config.footer,
                                      dressDots: { ...config.footer.dressDots, black: value },
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </SectionCard>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="schedule" className="border-border/70 bg-background rounded-2xl border px-5">
                    <AccordionTrigger className="py-5 text-base">Lịch và địa điểm</AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="grid gap-5 xl:grid-cols-2">
                        <SectionCard
                          title="Ngày giờ sự kiện"
                          description="Cụm hiển thị ở cột giữa footer."
                          icon={Calendar}
                        >
                          <div className="grid gap-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label>Ngày</Label>
                                <Input
                                  value={config.footer.dateDay}
                                  onChange={(event) =>
                                    update({ footer: { ...config.footer, dateDay: event.target.value } })
                                  }
                                  placeholder="23"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tháng</Label>
                                <Input
                                  value={config.footer.dateMonth}
                                  onChange={(event) =>
                                    update({ footer: { ...config.footer, dateMonth: event.target.value } })
                                  }
                                  placeholder="12"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Năm</Label>
                                <Input
                                  value={config.footer.dateYear}
                                  onChange={(event) =>
                                    update({ footer: { ...config.footer, dateYear: event.target.value } })
                                  }
                                  placeholder="2025"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Khung giờ</Label>
                              <Input
                                value={config.footer.timeText}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, timeText: event.target.value } })
                                }
                                placeholder="13:00 - 17:00"
                              />
                            </div>
                          </div>
                        </SectionCard>

                        <SectionCard
                          title="Địa điểm"
                          description="Tên địa điểm và 2 dòng địa chỉ hiển thị ở cột phải footer."
                          icon={MapPin}
                        >
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label>Tên địa điểm</Label>
                              <Input
                                value={config.footer.placeName}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, placeName: event.target.value } })
                                }
                                placeholder="MRD Palace"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Dòng địa chỉ 1</Label>
                              <Input
                                value={config.footer.placeLine1}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, placeLine1: event.target.value } })
                                }
                                placeholder="8th floor, Viet Tower building"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Dòng địa chỉ 2</Label>
                              <Input
                                value={config.footer.placeLine2}
                                onChange={(event) =>
                                  update({ footer: { ...config.footer, placeLine2: event.target.value } })
                                }
                                placeholder="01 Thai Ha Street, Hanoi"
                              />
                            </div>
                          </div>
                        </SectionCard>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-w-0">
            <div className="space-y-4 xl:sticky xl:top-24">
              <Card className="border-border/70 bg-background/95 overflow-hidden shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    Thông tin nhanh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-border/70 bg-muted/20 overflow-hidden rounded-2xl border">
                    {config.header.headingImageUrl ? (
                      <img
                        src={config.header.headingImageUrl}
                        alt={config.header.headingAlt || "Heading"}
                        className="aspect-[16/9] w-full object-contain"
                      />
                    ) : (
                      <div className="text-muted-foreground flex aspect-[16/9] items-center justify-center text-sm">
                        Chưa có ảnh heading
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{templateStyleLabels[currentTemplateStyle]}</Badge>
                      <Badge variant="outline">
                        {config.footer.dateDay}/{config.footer.dateMonth}/{config.footer.dateYear}
                      </Badge>
                    </div>
                    <h3 className="text-lg leading-7 font-semibold">
                      {config.header.titleText || config.behavior.eventName || initialName}
                    </h3>
                    {config.header.descText ? (
                      <p className="text-muted-foreground text-sm leading-6">{config.header.descText}</p>
                    ) : null}
                    {config.header.subtitleText ? (
                      <p className="text-sm font-medium">{config.header.subtitleText}</p>
                    ) : null}
                  </div>

                  <div className="border-border/70 bg-muted/20 rounded-2xl border p-4">
                    <div className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                      Khối sự kiện
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="font-medium">{config.infoEvent.headline || "Chưa có headline"}</div>
                      {config.infoEvent.motto ? (
                        <p className="text-muted-foreground text-sm">{config.infoEvent.motto}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-border/70 bg-muted/20 rounded-2xl border p-4">
                    <div className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                      Form sẽ hiển thị
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleFieldLabels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                      {enabledQuestions.map((question) => (
                        <Badge key={question.id} variant="secondary">
                          {question.label}
                        </Badge>
                      ))}
                      {visibleFieldLabels.length === 0 && enabledQuestions.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Chưa có field nào đang bật.</span>
                      ) : null}
                    </div>
                  </div>

                  {config.infoEvent.logo1Url || config.infoEvent.logo2Url || config.infoEvent.logo3Url ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[config.infoEvent.logo1Url, config.infoEvent.logo2Url, config.infoEvent.logo3Url].map((logo, index) => (
                        <div
                          key={`logo-preview-${index + 1}`}
                          className="border-border/70 bg-muted/20 overflow-hidden rounded-2xl border"
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={`Logo ${index + 1}`}
                              className="aspect-[16/9] w-full object-contain p-3"
                            />
                          ) : (
                            <div className="text-muted-foreground flex aspect-[16/9] items-center justify-center text-xs">
                              Trống
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/95 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="size-4" />
                    Theme tokens
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {themeSwatches.map(({ color, key, label }) => (
                    <div key={key} className="border-border/70 bg-card flex items-center gap-3 rounded-xl border p-3">
                      <span
                        className="border-border/70 size-10 rounded-full border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-muted-foreground truncate font-mono text-xs">{color}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
