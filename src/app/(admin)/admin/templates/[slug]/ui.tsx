/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable security/detect-object-injection */
/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  FormInput,
  Globe,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  Loader2,
  MapPin,
  MessageSquare,
  Palette,
  Plug,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Settings2,
  Shirt,
  SlidersHorizontal,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { templateThemePresets } from "@/lib/form-template/default-config";
import type {
  FieldType,
  FormTemplateConfig,
  HiddenFieldKey,
  InfoEventConfig,
  TemplateStyle,
  TemplateTheme,
} from "@/lib/form-template/types";
import { cn } from "@/lib/utils";

import { saveTemplateAction } from "./actions";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const PUBLIC_LADIPAGE_BASE_URL = "https://srx.vn";
// Giữ khớp với MAX_AGENDA_ITEMS / LEGACY_AGENDA_ITEMS_LIMIT trong SRX_web StarryEventLanding.jsx.
const MAX_AGENDA_ITEMS = 6;
const LEGACY_AGENDA_ITEMS_LIMIT = 3;
const MAX_QUESTIONS = 5;
// Cùng thứ tự với config lưu trong DB — web render trường bổ sung theo thứ tự này.
const HIDDEN_FIELD_KEYS: HiddenFieldKey[] = ["user_id", "city", "role", "clinic", "full_name_nv"];

const templateStyleLabels: Record<TemplateStyle, string> = {
  default: "Template 1 · Bong bóng hồng",
  starry: "Template 2 · Webinar đỏ",
};

const questionTypeLabels: Record<FieldType, string> = {
  text: "Text",
  textarea: "Đoạn văn",
  select: "Dropdown",
  email: "Email",
  tel: "Số điện thoại",
};

const hiddenFieldLabels: Record<HiddenFieldKey, string> = {
  user_id: "User ID",
  city: "Khu vực",
  role: "Vai trò",
  clinic: "Đơn vị công tác",
  full_name_nv: "Sale tư vấn",
};

type InfoTextKey = "topText" | "headline" | "motto" | "organizerText" | "bottomText";

type InfoTextField = { label: string; placeholder: string; hint?: string; multiline?: boolean };

type TemplateCopy = {
  bannerHint: string;
  descTextLabel: string;
  subtitleLabel: string;
  subtitleHint: string;
  contentTitle: string;
  contentDescription: string;
  scheduleDescription: string;
  infoOrder: InfoTextKey[];
  infoFields: Record<InfoTextKey, InfoTextField>;
  themeTokens: { key: keyof TemplateTheme; label: string }[];
};

// Mỗi template dùng cùng một config nhưng đặt text ở vị trí khác nhau, nên nhãn trong editor đổi theo template.
const templateCopy: Record<TemplateStyle, TemplateCopy> = {
  default: {
    bannerHint: "Ảnh heading ở đầu trang.",
    descTextLabel: "Dòng mô tả trên tiêu đề",
    subtitleLabel: "Phụ đề",
    subtitleHint: "Hiển thị ngay dưới tiêu đề chính.",
    contentTitle: "Khối giới thiệu",
    contentDescription: "Hiển thị bên dưới form đăng ký, cùng hàng logo đối tác.",
    scheduleDescription: "Hiển thị ở footer của trang.",
    infoOrder: ["topText", "headline", "motto", "organizerText", "bottomText"],
    infoFields: {
      topText: { label: "Dòng chữ trên", placeholder: "Ví dụ: Trân trọng kính mời Quý khách tham dự" },
      headline: { label: "Headline", placeholder: "Ví dụ: SGA Renew Peel" },
      motto: { label: "Motto", placeholder: "Ví dụ: Đa tầng tác động, dứt vòng mụn thâm" },
      organizerText: {
        label: "Giới thiệu sự kiện",
        placeholder: "Ví dụ: Chương trình do EAC Group và SRX Laboratory tổ chức",
        multiline: true,
      },
      bottomText: {
        label: "Dòng chữ dưới",
        placeholder: "Ví dụ: Rất hân hạnh được đón tiếp Quý khách",
        multiline: true,
      },
    },
    themeTokens: [
      { key: "primary", label: "Màu chính" },
      { key: "primary2", label: "Màu chính 2" },
      { key: "text", label: "Chữ" },
      { key: "muted", label: "Chữ phụ" },
      { key: "bg", label: "Nền trang" },
      { key: "card", label: "Nền khung form" },
      { key: "ring", label: "Viền khi focus" },
    ],
  },
  starry: {
    bannerHint: "Nên dùng ảnh dọc tỉ lệ 4:5, hiển thị full chiều ngang ở đầu trang.",
    descTextLabel: "Badge trên tiêu đề",
    subtitleLabel: "Dòng nhấn dưới tiêu đề form",
    subtitleHint: "Chữ in hoa nhỏ, màu nhấn, nằm trong khung form đăng ký.",
    contentTitle: "Nội dung khung form",
    contentDescription: "Tiêu đề và mô tả bên trong khung form. Ba đoạn mô tả được nối liền thành một đoạn.",
    scheduleDescription: "Hiển thị ở 3 ô Ngày/Giờ/Địa điểm dưới tiêu đề và ở footer.",
    infoOrder: ["headline", "motto", "organizerText", "bottomText", "topText"],
    infoFields: {
      headline: { label: "Tiêu đề form", placeholder: "Đăng ký tham dự" },
      motto: {
        label: "Mô tả - đoạn 1",
        placeholder: "Ví dụ: Chương trình từ EAC GROUP và Similidiet Laboratories dành cho Bác sĩ, Spa/Clinic",
        multiline: true,
      },
      organizerText: {
        label: "Mô tả - đoạn 2",
        placeholder: "Ví dụ: mong muốn cập nhật kiến thức về lão hoá nội sinh...",
        multiline: true,
      },
      bottomText: {
        label: "Mô tả - đoạn 3",
        placeholder: "Ví dụ: Quý khách vui lòng hoàn thiện thông tin bên dưới để được hỗ trợ xác nhận tham dự.",
        multiline: true,
      },
      topText: {
        label: "Badge dự phòng",
        placeholder: "Ví dụ: Webinar miễn phí",
        hint: "Chỉ hiển thị khi ô Badge trên tiêu đề (tab Chung) để trống.",
      },
    },
    themeTokens: [
      { key: "primary", label: "Màu chính" },
      { key: "primary2", label: "Màu chính 2" },
      { key: "muted", label: "Màu nhấn (số, icon)" },
      { key: "bg", label: "Nền trang" },
    ],
  },
};

type DefaultFieldConfig = FormTemplateConfig["fields"]["full_name"];
type HiddenFieldConfig = FormTemplateConfig["fields"]["hidden"][HiddenFieldKey];
type QuestionConfig = FormTemplateConfig["questions"][number];
type LadipageStatus = "draft" | "published" | "archived";

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

// Config cũ chưa có agendaItems: web tự lấy nhãn câu hỏi đang bật, không có thì lấy headline/motto/organizer.
function getLegacyAgendaItems(config: FormTemplateConfig): string[] {
  const questionLabels = config.questions
    .map((question, index) => ({ enabled: question.enabled, label: question.label.trim() || `Câu hỏi ${index + 1}` }))
    .filter((question) => question.enabled)
    .map((question) => question.label);
  const fallbackItems = [config.infoEvent.headline, config.infoEvent.motto, config.infoEvent.organizerText]
    .map((item) => item.trim())
    .filter(Boolean);

  return (questionLabels.length ? questionLabels : fallbackItems).slice(0, LEGACY_AGENDA_ITEMS_LIMIT);
}

function normalizePublicPath(currentTemplateSlug: string) {
  return `/events/${currentTemplateSlug}`;
}

function buildPublicUrl(pathOrUrl: string, baseUrl?: string) {
  const trimmedPath = pathOrUrl.trim();

  if (!trimmedPath) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const trimmedBaseUrl = baseUrl?.trim() ?? "";

  try {
    return new URL(trimmedPath, `${trimmedBaseUrl === "" ? PUBLIC_LADIPAGE_BASE_URL : trimmedBaseUrl}/`).toString();
  } catch {
    return trimmedPath;
  }
}

// <input type="color"> chỉ nhận #rrggbb; các giá trị rgba(...) vẫn giữ nguyên trong ô text bên cạnh.
function toColorInputValue(value: string) {
  const trimmed = value.trim();

  if (/^#[\da-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^#[\da-f]{3}$/i.test(trimmed)) {
    return `#${[...trimmed.slice(1)].map((char) => char + char).join("")}`;
  }

  return "#000000";
}

function Section({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card text-card-foreground rounded-xl border shadow-xs">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-6 font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground text-sm leading-5">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-foreground mb-3 text-sm font-semibold">{children}</h3>;
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs leading-5">{hint}</p> : null}
    </div>
  );
}

function InlineSwitch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = React.useId();

  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className={disabled ? undefined : "cursor-pointer"}>
        {label}
      </Label>
    </div>
  );
}

function StatusBadge({ status }: { status: LadipageStatus }) {
  if (status === "published") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
        Đã xuất bản
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-muted">
      {status === "archived" ? "Lưu trữ" : "Nháp"}
    </Badge>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-foreground">{label}</Label>
      <div className="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-9 items-center gap-2 rounded-md border pr-2 pl-1.5 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
        <span
          className="relative size-6 shrink-0 overflow-hidden rounded-[5px] border shadow-xs"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            aria-label={`Chọn ${label.toLowerCase()}`}
            value={toColorInputValue(value)}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none"
        />
      </div>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  hint,
  layout = "row",
  previewClassName = "size-20",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  layout?: "row" | "stack";
  previewClassName?: string;
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
      toast.success(`Đã tải ${label.toLowerCase()} lên`);
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
    <div className="min-w-0 space-y-1.5">
      <Label className="text-foreground">{label}</Label>
      <div className={layout === "stack" ? "space-y-2" : "flex items-start gap-3"}>
        <div
          className={cn(
            "bg-muted/60 text-muted-foreground flex shrink-0 items-center justify-center overflow-hidden rounded-lg border",
            previewClassName,
          )}
        >
          {value ? (
            <img src={value} alt={label} className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/upload/events/ten-anh.jpg"
            className="font-mono text-xs"
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
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => inputReference.current?.click()}
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {isUploading ? "Đang tải..." : value ? "Đổi ảnh" : "Tải ảnh"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isUploading}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange("")}
              >
                <X />
                Xóa
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {hint ? <p className="text-muted-foreground text-xs leading-5">{hint}</p> : null}
    </div>
  );
}

function FieldTypeSelect({ value, onChange }: { value: FieldType; onChange: (type: FieldType) => void }) {
  return (
    <Select value={value} onValueChange={(type: FieldType) => onChange(type)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(questionTypeLabels) as FieldType[]).map((type) => (
          <SelectItem key={type} value={type}>
            {questionTypeLabels[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Giữ text thô ở state riêng: nếu lọc dòng trống ngay khi gõ thì phím Enter bị "nuốt" và không thêm được lựa chọn mới.
function OptionsTextarea({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const [text, setText] = React.useState(() => options.join("\n"));

  return (
    <Textarea
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(
          event.target.value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        );
      }}
      placeholder={"Lựa chọn 1\nLựa chọn 2\nLựa chọn 3"}
      rows={4}
    />
  );
}

function AgendaItemsEditor({
  items,
  isLegacy,
  onChange,
}: {
  items: string[];
  isLegacy: boolean;
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {isLegacy && items.length ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          Sự kiện này chưa có danh sách riêng nên trang public đang tự lấy nhãn câu hỏi bổ sung. Sửa, thêm hoặc xóa một
          dòng bất kỳ để cố định nội dung.
        </p>
      ) : null}

      {items.length ? (
        items.map((item, index) => (
          <div key={`agenda-item-${index + 1}`} className="flex items-start gap-3">
            <span className="bg-primary text-primary-foreground mt-1 flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Textarea
              value={item}
              onChange={(event) =>
                onChange(items.map((current, itemIndex) => (itemIndex === index ? event.target.value : current)))
              }
              placeholder="Ví dụ: Cập nhật cơ chế lão hoá nội sinh"
              rows={1}
              className="min-h-9 resize-none py-1.5"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa dòng ${index + 1}`}
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 />
            </Button>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
          Chưa có dòng nào, khối đánh số sẽ được ẩn trên trang public.
        </p>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={items.length >= MAX_AGENDA_ITEMS}
        onClick={() => onChange([...items, ""])}
      >
        <Plus />
        Thêm dòng ({items.length}/{MAX_AGENDA_ITEMS})
      </Button>
    </div>
  );
}

function DefaultFieldRow({
  title,
  field,
  onChange,
}: {
  title: string;
  field: DefaultFieldConfig;
  onChange: (patch: Partial<DefaultFieldConfig>) => void;
}) {
  return (
    <div className={cn("rounded-lg border", field.enabled ? "bg-card" : "bg-muted/50")}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <span className={cn("font-medium", !field.enabled && "text-muted-foreground")}>{title}</span>
        <div className="flex items-center gap-5">
          <InlineSwitch label="Hiển thị" checked={field.enabled} onChange={(value) => onChange({ enabled: value })} />
          <InlineSwitch
            label="Bắt buộc"
            checked={field.required}
            disabled={!field.enabled}
            onChange={(value) => onChange({ required: value })}
          />
        </div>
      </div>

      {field.enabled ? (
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
          <Field label="Nhãn hiển thị">
            <Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
          </Field>
          <Field label="Placeholder">
            <Input
              value={field.placeholder}
              onChange={(event) => onChange({ placeholder: event.target.value })}
              placeholder="Để trống sẽ dùng gợi ý mặc định"
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

function QuestionItem({
  index,
  question,
  onChange,
}: {
  index: number;
  question: QuestionConfig;
  onChange: (patch: Partial<QuestionConfig>) => void;
}) {
  return (
    <div className={cn("rounded-lg border", question.enabled ? "bg-card" : "bg-muted/50")}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("truncate font-medium", !question.enabled && "text-muted-foreground")}>
            {question.label.trim() || `Câu hỏi ${index + 1}`}
          </span>
          {question.enabled ? <Badge variant="outline">{questionTypeLabels[question.type]}</Badge> : null}
          {question.enabled && question.required ? <Badge variant="outline">Bắt buộc</Badge> : null}
        </div>
        <Switch
          checked={question.enabled}
          onCheckedChange={(value) => onChange({ enabled: value })}
          aria-label={`Bật câu hỏi ${index + 1}`}
        />
      </div>

      {question.enabled ? (
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
          <Field label="Nhãn câu hỏi" className="sm:col-span-2">
            <Input
              value={question.label}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="Ví dụ: Bạn quan tâm nội dung nào?"
            />
          </Field>
          <Field label="Loại input">
            <FieldTypeSelect value={question.type} onChange={(type) => onChange({ type })} />
          </Field>
          <Field label="Placeholder">
            <Input
              value={question.placeholder ?? ""}
              onChange={(event) => onChange({ placeholder: event.target.value })}
              placeholder="Ví dụ: Nhập câu trả lời..."
            />
          </Field>
          {question.type === "select" ? (
            <Field label="Các lựa chọn" hint="Mỗi dòng là một lựa chọn." className="sm:col-span-2">
              <OptionsTextarea options={question.options ?? []} onChange={(options) => onChange({ options })} />
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <InlineSwitch
              label="Bắt buộc trả lời"
              checked={question.required}
              onChange={(value) => onChange({ required: value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HiddenFieldItem({
  fieldKey,
  field,
  onChange,
}: {
  fieldKey: HiddenFieldKey;
  field: HiddenFieldConfig;
  onChange: (patch: Partial<HiddenFieldConfig>) => void;
}) {
  const fieldType = field.type ?? "text";
  const isShownOnForm = field.enabled && Boolean(field.visible);

  return (
    <div className={cn("rounded-lg border", field.enabled ? "bg-card" : "bg-muted/50")}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate font-medium", !field.enabled && "text-muted-foreground")}>
            {field.label?.trim() ? field.label : hiddenFieldLabels[fieldKey]}
          </span>
          <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">{fieldKey}</code>
        </div>
        <div className="flex items-center gap-5">
          <InlineSwitch
            label="Lưu dữ liệu"
            checked={field.enabled}
            onChange={(value) => onChange({ enabled: value })}
          />
          <InlineSwitch
            label="Hiện trên form"
            checked={Boolean(field.visible)}
            disabled={!field.enabled}
            onChange={(value) => onChange({ visible: value })}
          />
        </div>
      </div>

      {isShownOnForm ? (
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
          <Field label="Nhãn hiển thị">
            <Input
              value={field.label ?? ""}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder={hiddenFieldLabels[fieldKey]}
            />
          </Field>
          <Field label="Placeholder">
            <Input
              value={field.placeholder ?? ""}
              onChange={(event) => onChange({ placeholder: event.target.value })}
            />
          </Field>
          <Field label="Loại input">
            <FieldTypeSelect value={fieldType} onChange={(type) => onChange({ type })} />
          </Field>
          <div className="flex items-end pb-2">
            <InlineSwitch
              label="Bắt buộc nhập"
              checked={Boolean(field.required)}
              onChange={(value) => onChange({ required: value })}
            />
          </div>
          {fieldType === "select" ? (
            <Field label="Các lựa chọn" hint="Mỗi dòng là một lựa chọn." className="sm:col-span-2">
              <OptionsTextarea options={field.options ?? []} onChange={(options) => onChange({ options })} />
            </Field>
          ) : null}
        </div>
      ) : field.enabled ? (
        <p className="text-muted-foreground border-t px-4 py-2.5 text-xs leading-5">
          Không hiện trên form, giá trị được tự điền từ tham số trên đường dẫn (xem tab Tích hợp).
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <dt className="text-muted-foreground w-16 shrink-0">{label}</dt>
      <dd className={cn("min-w-0 break-words", value ? "font-medium" : "text-muted-foreground italic")}>
        {value || "Chưa nhập"}
      </dd>
    </div>
  );
}

export default function AdminTemplateEditor({
  slug,
  initialName,
  initialConfig,
  initialStatus = "draft",
  editorTitle,
  publicBaseUrl,
  publicPath,
  redirectToEditBasePath,
}: {
  slug: string;
  initialName: string;
  initialConfig: FormTemplateConfig;
  /** Trạng thái hiện tại của Ladipage, để hiện đúng nhãn xuất bản. */
  initialStatus?: LadipageStatus;
  editorTitle?: string;
  publicBaseUrl?: string;
  publicPath?: string;
  redirectToEditBasePath?: string;
}) {
  const router = useRouter();
  const [config, setConfig] = React.useState<FormTemplateConfig>(initialConfig);
  const [saving, setSaving] = React.useState<"draft" | "publish" | null>(null);
  const [status, setStatus] = React.useState(initialStatus);
  const [templateSlug, setTemplateSlug] = React.useState(slug);
  const [currentSlug, setCurrentSlug] = React.useState(slug);
  const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify({ config: initialConfig, slug }));

  const update = React.useCallback((patch: Partial<FormTemplateConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const isDirty = React.useMemo(
    () => JSON.stringify({ config, slug: templateSlug }) !== savedSnapshot,
    [config, savedSnapshot, templateSlug],
  );

  // Đường dẫn public do slug quyết định; chỉ giữ publicPath cũ khi nó được đặt tay khác mặc định.
  const resolvedPublicPath = React.useMemo(() => {
    const customPath = publicPath?.trim();
    return customPath && customPath !== normalizePublicPath(slug) ? customPath : normalizePublicPath(templateSlug);
  }, [publicPath, slug, templateSlug]);
  const publicUrl = React.useMemo(
    () => buildPublicUrl(resolvedPublicPath, publicBaseUrl),
    [publicBaseUrl, resolvedPublicPath],
  );
  const hasSlug = templateSlug.trim() !== "";

  const currentTemplateStyle = config.templateStyle ?? "default";
  const copy = templateCopy[currentTemplateStyle] ?? templateCopy.default;
  const isStarry = currentTemplateStyle === "starry";
  const isLegacyAgenda = config.infoEvent.agendaItems === undefined;
  const agendaItems = React.useMemo(() => config.infoEvent.agendaItems ?? getLegacyAgendaItems(config), [config]);
  const enabledQuestionsCount = config.questions.slice(0, MAX_QUESTIONS).filter((question) => question.enabled).length;

  // Cùng thứ tự với form trên web: trường mặc định → trường bổ sung đang hiện → câu hỏi.
  const formFieldLabels = React.useMemo(
    () => [
      ...[config.fields.full_name, config.fields.phone, config.fields.email]
        .filter((field) => field.enabled)
        .map((field) => field.label),
      ...HIDDEN_FIELD_KEYS.filter((key) => config.fields.hidden[key].enabled && config.fields.hidden[key].visible).map(
        (key) => (config.fields.hidden[key].label ?? "").trim() || hiddenFieldLabels[key],
      ),
      ...config.questions
        .slice(0, MAX_QUESTIONS)
        .map((question, index) => (question.enabled ? question.label.trim() || `Câu hỏi ${index + 1}` : ""))
        .filter(Boolean),
    ],
    [config.fields, config.questions],
  );
  const summarySwatches = [
    ...copy.themeTokens.map((token) => ({ label: token.label, color: config.theme[token.key] })),
    { label: "Footer - màu đầu", color: config.footer.gradientFrom },
    { label: "Footer - màu cuối", color: config.footer.gradientTo },
  ];

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

  const updateHeader = (patch: Partial<FormTemplateConfig["header"]>) =>
    update({ header: { ...config.header, ...patch } });
  const updateInfoEvent = (patch: Partial<InfoEventConfig>) => update({ infoEvent: { ...config.infoEvent, ...patch } });
  const updateFooter = (patch: Partial<FormTemplateConfig["footer"]>) =>
    update({ footer: { ...config.footer, ...patch } });
  const updateBehavior = (patch: Partial<FormTemplateConfig["behavior"]>) =>
    update({ behavior: { ...config.behavior, ...patch } });

  const updateDefaultField = (fieldKey: "full_name" | "phone" | "email", patch: Partial<DefaultFieldConfig>) =>
    update({ fields: { ...config.fields, [fieldKey]: { ...config.fields[fieldKey], ...patch } } });

  const updateHiddenField = (fieldKey: HiddenFieldKey, patch: Partial<HiddenFieldConfig>) =>
    update({
      fields: {
        ...config.fields,
        hidden: { ...config.fields.hidden, [fieldKey]: { ...config.fields.hidden[fieldKey], ...patch } },
      },
    });

  const updateQuestion = (index: number, patch: Partial<QuestionConfig>) => {
    const nextQuestions = [...config.questions];
    nextQuestions[index] = { ...nextQuestions[index], ...patch };
    update({ questions: nextQuestions });
  };

  async function handleCopyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Đã sao chép URL trang public.");
    } catch {
      toast.error("Không thể sao chép URL trang public.");
    }
  }

  async function onSave(publish: boolean) {
    try {
      setSaving(publish ? "publish" : "draft");
      const nextSlug = templateSlug.trim();
      const result = await saveTemplateAction(
        currentSlug,
        nextSlug,
        config.behavior.eventName.trim() || initialName,
        config,
        { publish },
      );
      setCurrentSlug(nextSlug);
      setTemplateSlug(nextSlug);
      setStatus(result.status);
      setSavedSnapshot(JSON.stringify({ config, slug: nextSlug }));

      const normalizedRedirectBasePath = redirectToEditBasePath?.trim();

      if (normalizedRedirectBasePath && result.eventId) {
        const nextEditPath = `${normalizedRedirectBasePath}/${encodeURIComponent(result.eventId)}/edit`;

        if (window.location.pathname !== nextEditPath) {
          router.replace(nextEditPath);
        }
      }

      toast.success(
        publish ? "Đã xuất bản, trang public đã cập nhật." : "Đã lưu nháp. Trang public giữ nguyên bản cũ.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình ladipage.");
      console.error(error);
    } finally {
      setSaving(null);
    }
  }

  const tabTriggerClassName =
    "text-foreground/70 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-border h-8 flex-1 px-2 sm:flex-none sm:px-3 max-sm:[&_svg]:hidden";

  return (
    // Bù lại padding của layout để nền xám và thanh tiêu đề phủ kín vùng nội dung.
    <div className="ladipage-editor bg-muted dark:bg-background -m-4 min-h-[calc(100svh-3rem)] md:-m-6">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/85 top-0 z-20 border-b backdrop-blur md:sticky [header[data-navbar-style=sticky]~div_&]:top-12">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            {redirectToEditBasePath ? (
              <Link
                href={redirectToEditBasePath}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
              >
                <ArrowLeft className="size-3.5" />
                Ladipage sự kiện
              </Link>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {config.behavior.eventName.trim() || (editorTitle ?? initialName)}
              </h1>
              <StatusBadge status={status} />
              {isDirty ? (
                <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                  Chưa lưu thay đổi
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasSlug ? (
              <Button type="button" variant="ghost" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  <span className="max-sm:sr-only">Xem trang</span>
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void onSave(false)} disabled={saving !== null}>
              {saving === "draft" ? <Loader2 className="animate-spin" /> : <Save />}
              {saving === "draft" ? "Đang lưu..." : "Lưu nháp"}
            </Button>
            <Button type="button" onClick={() => void onSave(true)} disabled={saving !== null}>
              {saving === "publish" ? <Loader2 className="animate-spin" /> : <Rocket />}
              {saving === "publish" ? "Đang xuất bản..." : status === "published" ? "Cập nhật bản public" : "Xuất bản"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Tabs defaultValue="general" className="min-w-0 gap-5">
          <TabsList className="bg-muted h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border p-1 sm:w-fit">
            <TabsTrigger value="general" className={tabTriggerClassName}>
              <Settings2 />
              Chung
            </TabsTrigger>
            <TabsTrigger value="content" className={tabTriggerClassName}>
              <FileText />
              Nội dung
            </TabsTrigger>
            <TabsTrigger value="form" className={tabTriggerClassName}>
              <FormInput />
              Form
            </TabsTrigger>
            <TabsTrigger value="integration" className={tabTriggerClassName}>
              <Plug />
              Tích hợp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-5">
            <Section title="Thông tin trang" description="Tên sự kiện, template và đường dẫn public." icon={Globe}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tên sự kiện" className="md:col-span-2">
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
                    placeholder="Ví dụ: Webinar trẻ hoá đa tầng"
                  />
                </Field>
                <Field label="Template" hint="Đổi template sẽ áp dụng lại bộ màu mặc định của template đó.">
                  <Select
                    value={currentTemplateStyle}
                    onValueChange={(value: TemplateStyle) => applyTemplateStyle(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{templateStyleLabels.default}</SelectItem>
                      <SelectItem value="starry">{templateStyleLabels.starry}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Slug trang" hint="Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.">
                  <Input
                    value={templateSlug}
                    onChange={(event) => setTemplateSlug(event.target.value)}
                    placeholder="webinar-tre-hoa"
                    className="font-mono"
                  />
                </Field>
                <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 md:col-span-2">
                  <Link2 className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {hasSlug ? publicUrl : "Nhập slug để tạo đường dẫn public"}
                  </span>
                  {hasSlug ? (
                    <div className="flex items-center gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => void handleCopyPublicUrl()}>
                        <Copy />
                        Sao chép
                      </Button>
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                          <ExternalLink />
                          Mở
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section title="Banner & tiêu đề" description="Phần đầu tiên khách nhìn thấy khi mở trang." icon={Type}>
              <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                <ImageField
                  label="Ảnh banner"
                  layout="stack"
                  previewClassName={cn("w-full", isStarry ? "aspect-[4/5] max-w-48" : "aspect-video")}
                  value={config.header.headingImageUrl}
                  onChange={(url) => updateHeader({ headingImageUrl: url })}
                  hint={copy.bannerHint}
                />
                <div className="grid content-start gap-4">
                  <Field label="Tiêu đề chính">
                    <Input
                      value={config.header.titleText}
                      onChange={(event) => updateHeader({ titleText: event.target.value })}
                      placeholder="Ví dụ: Webinar trẻ hoá đa tầng"
                    />
                  </Field>
                  <Field label={copy.descTextLabel}>
                    <Input
                      value={config.header.descText}
                      onChange={(event) => updateHeader({ descText: event.target.value })}
                      placeholder="Ví dụ: EAC Group x Similidiet"
                    />
                  </Field>
                  <Field label={copy.subtitleLabel} hint={copy.subtitleHint}>
                    <Input
                      value={config.header.subtitleText ?? ""}
                      onChange={(event) => updateHeader({ subtitleText: event.target.value })}
                      placeholder="Ví dụ: Miễn phí cho Bác sĩ, Spa/Clinic"
                    />
                  </Field>
                  <Field label="Mô tả ảnh (alt)" hint="Hỗ trợ SEO và trình đọc màn hình.">
                    <Input
                      value={config.header.headingAlt}
                      onChange={(event) => updateHeader({ headingAlt: event.target.value })}
                      placeholder="Ví dụ: Banner webinar trẻ hoá đa tầng"
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {isStarry ? (
              <Section
                title="Danh sách đánh số"
                description="Các dòng 01, 02, 03... nằm dưới 3 ô Ngày/Giờ/Địa điểm, ngay phía trên form đăng ký."
                icon={ListOrdered}
              >
                <AgendaItemsEditor
                  items={agendaItems}
                  isLegacy={isLegacyAgenda}
                  onChange={(nextItems) => updateInfoEvent({ agendaItems: nextItems })}
                />
              </Section>
            ) : null}

            <Section
              title="Màu sắc"
              description="Chỉ hiện những màu mà template đang chọn sử dụng."
              icon={Palette}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyTemplateStyle(currentTemplateStyle)}
                >
                  <RotateCcw />
                  Màu mặc định
                </Button>
              }
            >
              <div className="space-y-5">
                <div>
                  <SubHeading>Giao diện</SubHeading>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {copy.themeTokens.map((token) => (
                      <ColorField
                        key={token.key}
                        label={token.label}
                        value={config.theme[token.key]}
                        onChange={(value) => update({ theme: { ...config.theme, [token.key]: value } })}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t pt-5">
                  <SubHeading>Footer</SubHeading>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <ColorField
                      label="Màu đầu"
                      value={config.footer.gradientFrom}
                      onChange={(value) => updateFooter({ gradientFrom: value })}
                    />
                    <ColorField
                      label="Màu cuối"
                      value={config.footer.gradientTo}
                      onChange={(value) => updateFooter({ gradientTo: value })}
                    />
                    <ColorField
                      label="Màu chữ"
                      value={config.footer.textColor}
                      onChange={(value) => updateFooter({ textColor: value })}
                    />
                  </div>
                </div>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="content" className="space-y-5">
            <Section title={copy.contentTitle} description={copy.contentDescription} icon={FileText}>
              <div className="grid gap-4 md:grid-cols-2">
                {copy.infoOrder.map((key) => {
                  const field = copy.infoFields[key];

                  return (
                    <Field key={key} label={field.label} hint={field.hint} className="md:col-span-2">
                      {field.multiline ? (
                        <Textarea
                          value={config.infoEvent[key]}
                          onChange={(event) => updateInfoEvent({ [key]: event.target.value })}
                          placeholder={field.placeholder}
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={config.infoEvent[key]}
                          onChange={(event) => updateInfoEvent({ [key]: event.target.value })}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Section>

            <Section title="Thời gian & địa điểm" description={copy.scheduleDescription} icon={CalendarDays}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <SubHeading>Thời gian</SubHeading>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Ngày">
                      <Input
                        value={config.footer.dateDay}
                        onChange={(event) => updateFooter({ dateDay: event.target.value })}
                        placeholder="23"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="Tháng">
                      <Input
                        value={config.footer.dateMonth}
                        onChange={(event) => updateFooter({ dateMonth: event.target.value })}
                        placeholder="12"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="Năm">
                      <Input
                        value={config.footer.dateYear}
                        onChange={(event) => updateFooter({ dateYear: event.target.value })}
                        placeholder="2026"
                        inputMode="numeric"
                      />
                    </Field>
                  </div>
                  <Field label="Khung giờ">
                    <Input
                      value={config.footer.timeText}
                      onChange={(event) => updateFooter({ timeText: event.target.value })}
                      placeholder="Ví dụ: 19:30 - 21:00"
                    />
                  </Field>
                </div>
                <div className="space-y-4">
                  <SubHeading>Địa điểm</SubHeading>
                  <Field label="Tên địa điểm / hình thức">
                    <Input
                      value={config.footer.placeName}
                      onChange={(event) => updateFooter({ placeName: event.target.value })}
                      placeholder="Ví dụ: Online qua Zoom"
                    />
                  </Field>
                  <Field label="Địa chỉ - dòng 1">
                    <Input
                      value={config.footer.placeLine1}
                      onChange={(event) => updateFooter({ placeLine1: event.target.value })}
                      placeholder="Ví dụ: Tầng 8, toà nhà Viet Tower"
                    />
                  </Field>
                  <Field label="Địa chỉ - dòng 2">
                    <Input
                      value={config.footer.placeLine2}
                      onChange={(event) => updateFooter({ placeLine2: event.target.value })}
                      placeholder="Ví dụ: 01 Thái Hà, Hà Nội"
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section
              title="Logo đối tác"
              description="Tối đa 3 logo, xếp thành một hàng ngang. Nên dùng ảnh PNG nền trong suốt."
              icon={ImageIcon}
            >
              <div className="grid gap-5 sm:grid-cols-3">
                {(["logo1Url", "logo2Url", "logo3Url"] as const).map((key, index) => (
                  <ImageField
                    key={key}
                    label={`Logo ${index + 1}`}
                    layout="stack"
                    previewClassName="aspect-video w-full"
                    value={config.infoEvent[key] ?? ""}
                    onChange={(url) => updateInfoEvent({ [key]: url })}
                  />
                ))}
              </div>
            </Section>

            {isStarry ? (
              <Section title="Ghi chú cuối trang" description="Đoạn chữ trong khung ở cuối footer." icon={FileText}>
                <Textarea
                  value={config.footer.template2FooterText ?? ""}
                  onChange={(event) => updateFooter({ template2FooterText: event.target.value })}
                  placeholder="Ví dụ: Ban tổ chức sẽ liên hệ xác nhận thông tin tham dự trước sự kiện."
                  rows={3}
                />
              </Section>
            ) : (
              <Section title="Dress code" description="Tiêu đề, mô tả và 4 chấm màu hiển thị ở footer." icon={Shirt}>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tiêu đề">
                      <Input
                        value={config.footer.dressCodeTitle}
                        onChange={(event) => updateFooter({ dressCodeTitle: event.target.value })}
                        placeholder="Ví dụ: Dress code"
                      />
                    </Field>
                    <Field label="Mô tả">
                      <Input
                        value={config.footer.dressCodeDesc}
                        onChange={(event) => updateFooter({ dressCodeDesc: event.target.value })}
                        placeholder="Ví dụ: Trắng - Hồng - Đen"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {(["white", "whitePink", "pink", "black"] as const).map((dotKey, index) => (
                      <ColorField
                        key={dotKey}
                        label={`Màu ${index + 1}`}
                        value={config.footer.dressDots[dotKey]}
                        onChange={(value) =>
                          updateFooter({ dressDots: { ...config.footer.dressDots, [dotKey]: value } })
                        }
                      />
                    ))}
                  </div>
                </div>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="form" className="space-y-5">
            <Section
              title="Trường mặc định"
              description="Họ tên, số điện thoại và email luôn đứng đầu form."
              icon={FormInput}
            >
              <div className="space-y-3">
                <DefaultFieldRow
                  title="Họ và tên"
                  field={config.fields.full_name}
                  onChange={(patch) => updateDefaultField("full_name", patch)}
                />
                <DefaultFieldRow
                  title="Số điện thoại"
                  field={config.fields.phone}
                  onChange={(patch) => updateDefaultField("phone", patch)}
                />
                <DefaultFieldRow
                  title="Email"
                  field={config.fields.email}
                  onChange={(patch) => updateDefaultField("email", patch)}
                />
              </div>
            </Section>

            <Section
              title="Trường bổ sung"
              description="Đơn vị công tác, khu vực, sale tư vấn... Có thể hiện trên form hoặc gửi ngầm theo đường dẫn."
              icon={SlidersHorizontal}
            >
              <div className="space-y-3">
                {HIDDEN_FIELD_KEYS.map((key) => (
                  <HiddenFieldItem
                    key={key}
                    fieldKey={key}
                    field={config.fields.hidden[key]}
                    onChange={(patch) => updateHiddenField(key, patch)}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Câu hỏi tùy chỉnh"
              description="Tối đa 5 câu hỏi, hiển thị cuối form. Chỉ bật những câu thật sự cần."
              icon={MessageSquare}
              action={
                <Badge variant="outline">
                  {enabledQuestionsCount}/{MAX_QUESTIONS} đang bật
                </Badge>
              }
            >
              <div className="space-y-3">
                {config.questions.slice(0, MAX_QUESTIONS).map((question, index) => (
                  <QuestionItem
                    key={question.id}
                    index={index}
                    question={question}
                    onChange={(patch) => updateQuestion(index, patch)}
                  />
                ))}
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="integration" className="space-y-5">
            <Section
              title="Webhook & nguồn dữ liệu"
              description="Dùng khi cần đồng bộ đăng ký sang hệ thống khác."
              icon={Plug}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Webhook URL"
                  hint="Để trống nếu không cần gửi dữ liệu ra ngoài."
                  className="md:col-span-2"
                >
                  <Input
                    value={config.webhookUrl}
                    onChange={(event) => update({ webhookUrl: event.target.value })}
                    placeholder="https://example.com/webhook"
                    className="font-mono"
                  />
                </Field>
                <Field label="Source" hint="Gắn kèm mỗi lượt đăng ký để phân biệt nguồn.">
                  <Input
                    value={config.behavior.source}
                    onChange={(event) => updateBehavior({ source: event.target.value })}
                    className="font-mono"
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="Tự điền từ đường dẫn"
              description="Tên tham số trên URL dùng để tự điền trường bổ sung. Ví dụ ?userid=123&city=HN."
              icon={Link2}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tham số User ID">
                  <Input
                    value={config.behavior.readUserIdFromQueryKey}
                    onChange={(event) => updateBehavior({ readUserIdFromQueryKey: event.target.value })}
                    placeholder="userid"
                    className="font-mono"
                  />
                </Field>
                <Field label="Tham số Khu vực">
                  <Input
                    value={config.behavior.prefillKeys.city ?? ""}
                    onChange={(event) =>
                      updateBehavior({ prefillKeys: { ...config.behavior.prefillKeys, city: event.target.value } })
                    }
                    placeholder="city"
                    className="font-mono"
                  />
                </Field>
                <Field label="Tham số Vai trò">
                  <Input
                    value={config.behavior.prefillKeys.role ?? ""}
                    onChange={(event) =>
                      updateBehavior({ prefillKeys: { ...config.behavior.prefillKeys, role: event.target.value } })
                    }
                    placeholder="role"
                    className="font-mono"
                  />
                </Field>
              </div>
            </Section>
          </TabsContent>
        </Tabs>

        <aside className="min-w-0">
          <div className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-xs xl:sticky xl:top-36">
            <div className="bg-muted/60 flex aspect-[16/10] items-center justify-center border-b">
              {config.header.headingImageUrl ? (
                <img
                  src={config.header.headingImageUrl}
                  alt={config.header.headingAlt || "Banner"}
                  className="size-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-sm">
                  <ImageIcon className="size-5" />
                  Chưa có ảnh banner
                </div>
              )}
            </div>

            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Badge variant="outline">{templateStyleLabels[currentTemplateStyle]}</Badge>
                <h3 className="leading-6 font-semibold">
                  {config.header.titleText || config.behavior.eventName || initialName}
                </h3>
                {config.header.descText ? (
                  <p className="text-muted-foreground text-sm leading-5">{config.header.descText}</p>
                ) : null}
              </div>

              <dl className="space-y-2">
                <SummaryRow
                  icon={CalendarDays}
                  label="Ngày"
                  value={[config.footer.dateDay, config.footer.dateMonth, config.footer.dateYear]
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .join("/")}
                />
                <SummaryRow icon={Clock3} label="Giờ" value={config.footer.timeText.trim()} />
                <SummaryRow icon={MapPin} label="Địa điểm" value={config.footer.placeName.trim()} />
              </dl>

              <div className="space-y-2 border-t pt-4">
                <div className="text-sm font-semibold">Trường trên form</div>
                <div className="flex flex-wrap gap-1.5">
                  {formFieldLabels.length ? (
                    formFieldLabels.map((label, index) => (
                      <Badge key={`form-field-${index + 1}`} variant="outline">
                        {label}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Chưa có trường nào đang bật.</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="text-sm font-semibold">Màu sắc</div>
                <div className="flex flex-wrap gap-1.5">
                  {summarySwatches.map((swatch) => (
                    <span
                      key={swatch.label}
                      title={`${swatch.label}: ${swatch.color}`}
                      className="size-6 rounded-full border shadow-xs"
                      style={{ backgroundColor: swatch.color }}
                    />
                  ))}
                </div>
              </div>

              {hasSlug ? (
                <div className="space-y-2 border-t pt-4">
                  <div className="text-sm font-semibold">Trang public</div>
                  <div className="flex items-center gap-1">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary min-w-0 flex-1 truncate font-mono text-xs underline-offset-4 hover:underline"
                    >
                      {publicUrl}
                    </a>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Sao chép URL trang public"
                      onClick={() => void handleCopyPublicUrl()}
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
