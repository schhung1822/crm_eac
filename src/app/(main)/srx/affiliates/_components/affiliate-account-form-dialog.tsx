/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { matchesSearchTerm } from "@/lib/search-utils";
import {
  srxAffiliateAccountStatusValues,
  srxAffiliateApplicationStatusValues,
  srxAffiliateCommissionTypeValues,
  srxAffiliateGenderValues,
  type SrxAffiliateAccount,
  type SrxAffiliateUserOption,
} from "@/lib/srx-affiliates.shared";

import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateApplicationStatusLabel,
  getAffiliateCommissionTypeLabel,
  getAffiliateGenderLabel,
  getAffiliateUserStatusLabel,
} from "./affiliate-presenters";

export type AffiliateAccountFormState = {
  user_mode: "existing" | "new";
  user_id: string;
  new_user_full_name: string;
  new_user_email: string;
  new_user_phone: string;
  new_user_password: string;
  user_full_name: string;
  user_email: string;
  user_phone: string;
  affiliate_code: string;
  status: SrxAffiliateAccount["status"];
  commission_type: SrxAffiliateAccount["commission_type"];
  commission_rate: string;
  cookie_duration_days: string;
  application_status: NonNullable<SrxAffiliateAccount["application_status"]>;
  review_note: string;
  legal_full_name: string;
  permanent_address: string;
  national_id_number: string;
  gender: SrxAffiliateAccount["application_gender"];
  contact_email: string;
  contact_phone: string;
  social_channel: string;
  website_url: string;
  facebook_url: string;
  tiktok_url: string;
  promotion_plan: string;
  bank_account_holder: string;
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;
};

const gridClass = "grid grid-cols-2 gap-4 max-[560px]:grid-cols-1";

const emptyFormState: AffiliateAccountFormState = {
  user_mode: "existing",
  user_id: "",
  new_user_full_name: "",
  new_user_email: "",
  new_user_phone: "",
  new_user_password: "",
  user_full_name: "",
  user_email: "",
  user_phone: "",
  affiliate_code: "",
  status: "active",
  commission_type: "percent",
  commission_rate: "5",
  cookie_duration_days: "30",
  application_status: "approved",
  review_note: "",
  legal_full_name: "",
  permanent_address: "",
  national_id_number: "",
  gender: "prefer_not_to_say",
  contact_email: "",
  contact_phone: "",
  social_channel: "",
  website_url: "",
  facebook_url: "",
  tiktok_url: "",
  promotion_plan: "",
  bank_account_holder: "",
  bank_name: "",
  bank_branch: "",
  bank_account_number: "",
};

function buildFormState(account: SrxAffiliateAccount | null): AffiliateAccountFormState {
  if (!account) {
    return emptyFormState;
  }

  return {
    ...emptyFormState,
    user_full_name: account.user_name,
    user_email: account.user_email,
    user_phone: account.user_phone,
    affiliate_code: account.affiliate_code,
    status: account.status,
    commission_type: account.commission_type,
    commission_rate: String(account.commission_rate),
    cookie_duration_days: String(account.cookie_duration_days),
    application_status: account.application_status ?? "approved",
    review_note: account.application_review_note,
    legal_full_name: account.application_legal_full_name,
    permanent_address: account.application_permanent_address,
    national_id_number: account.application_national_id_number,
    gender: account.application_gender,
    contact_email: account.application_contact_email,
    contact_phone: account.application_contact_phone,
    social_channel: account.application_social_channel,
    website_url: account.application_website_url,
    facebook_url: account.application_facebook_url,
    tiktok_url: account.application_tiktok_url,
    promotion_plan: account.application_promotion_plan,
    bank_account_holder: account.bank_account_holder,
    bank_name: account.bank_name,
    bank_branch: account.bank_branch,
    bank_account_number: account.bank_account_number,
  };
}

function UserPicker({
  userOptions,
  selectedUserId,
  onSelect,
}: {
  userOptions: SrxAffiliateUserOption[];
  selectedUserId: string;
  onSelect: (user: SrxAffiliateUserOption) => void;
}) {
  const [userSearchTerm, setUserSearchTerm] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    return userOptions
      .filter((user) => matchesSearchTerm(userSearchTerm, [user.full_name, user.email, user.phone]))
      .slice(0, 50);
  }, [userOptions, userSearchTerm]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="affiliate-user-search">Chọn người dùng website</Label>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="affiliate-user-search"
          className="pl-10"
          value={userSearchTerm}
          onChange={(event) => setUserSearchTerm(event.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
        />
      </div>

      <div className="nice-scroll max-h-56 overflow-y-auto rounded-md border">
        {filteredUsers.length === 0 ? (
          <div className="text-muted-foreground p-4 text-sm">
            Không có người dùng phù hợp. Chỉ hiển thị người dùng chưa có tài khoản affiliate.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className={`hover:bg-muted/60 flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 ${
                selectedUserId === user.id ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{user.full_name}</span>
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {getAffiliateUserStatusLabel(user.status)}
                </Badge>
              </div>
              <span className="text-muted-foreground text-xs">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ""}
                {user.has_application ? " · đã có hồ sơ đăng ký" : ""}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function AffiliateExistingUserFields({
  form,
  setForm,
}: {
  form: AffiliateAccountFormState;
  setForm: React.Dispatch<React.SetStateAction<AffiliateAccountFormState>>;
}) {
  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className={gridClass}>
        <div className="grid gap-2">
          <Label htmlFor="affiliate-user-name">Họ và tên</Label>
          <Input
            id="affiliate-user-name"
            value={form.user_full_name}
            onChange={(event) => setForm((current) => ({ ...current, user_full_name: event.target.value }))}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="affiliate-user-email">Email đăng nhập</Label>
          <Input
            id="affiliate-user-email"
            type="email"
            value={form.user_email}
            onChange={(event) => setForm((current) => ({ ...current, user_email: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="affiliate-user-phone">Số điện thoại</Label>
        <Input
          id="affiliate-user-phone"
          value={form.user_phone}
          onChange={(event) => setForm((current) => ({ ...current, user_phone: event.target.value }))}
          placeholder="Chưa có"
        />
      </div>
    </div>
  );
}

function AffiliateNewUserFields({
  form,
  setForm,
}: {
  form: AffiliateAccountFormState;
  setForm: React.Dispatch<React.SetStateAction<AffiliateAccountFormState>>;
}) {
  return (
    <>
      <div className={gridClass}>
        <div className="grid gap-2">
          <Label htmlFor="affiliate-new-name">Họ và tên</Label>
          <Input
            id="affiliate-new-name"
            value={form.new_user_full_name}
            onChange={(event) => setForm((current) => ({ ...current, new_user_full_name: event.target.value }))}
            placeholder="Nguyễn Văn A"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="affiliate-new-email">Email đăng nhập</Label>
          <Input
            id="affiliate-new-email"
            type="email"
            value={form.new_user_email}
            onChange={(event) => setForm((current) => ({ ...current, new_user_email: event.target.value }))}
            placeholder="affiliate@example.com"
          />
        </div>
      </div>

      <div className={gridClass}>
        <div className="grid gap-2">
          <Label htmlFor="affiliate-new-phone">Số điện thoại</Label>
          <Input
            id="affiliate-new-phone"
            value={form.new_user_phone}
            onChange={(event) => setForm((current) => ({ ...current, new_user_phone: event.target.value }))}
            placeholder="0912345678"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="affiliate-new-password">Mật khẩu đăng nhập</Label>
          <Input
            id="affiliate-new-password"
            type="text"
            value={form.new_user_password}
            onChange={(event) => setForm((current) => ({ ...current, new_user_password: event.target.value }))}
            placeholder="Tối thiểu 8 ký tự"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Tài khoản website sẽ được tạo ở trạng thái hoạt động. Hãy gửi mật khẩu này cho affiliate và nhắc họ đổi lại sau
        khi đăng nhập.
      </p>
    </>
  );
}

function AffiliateUserSection({
  mode,
  form,
  setForm,
  userOptions,
}: {
  mode: "create" | "edit";
  form: AffiliateAccountFormState;
  setForm: React.Dispatch<React.SetStateAction<AffiliateAccountFormState>>;
  userOptions: SrxAffiliateUserOption[];
}) {
  if (mode === "edit") {
    return <AffiliateExistingUserFields form={form} setForm={setForm} />;
  }

  const selectedUser = userOptions.find((user) => user.id === form.user_id) ?? null;

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="grid gap-2">
        <Label htmlFor="affiliate-user-mode">Người dùng affiliate</Label>
        <Select
          value={form.user_mode}
          onValueChange={(value) =>
            setForm((current) => ({ ...current, user_mode: value as AffiliateAccountFormState["user_mode"] }))
          }
        >
          <SelectTrigger id="affiliate-user-mode">
            <SelectValue placeholder="Chọn nguồn người dùng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="existing">Dùng tài khoản website có sẵn</SelectItem>
            <SelectItem value="new">Tạo tài khoản website mới</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.user_mode === "new" ? (
        <AffiliateNewUserFields form={form} setForm={setForm} />
      ) : (
        <>
          <UserPicker
            userOptions={userOptions}
            selectedUserId={form.user_id}
            onSelect={(user) =>
              setForm((current) => ({
                ...current,
                user_id: user.id,
                contact_email: current.contact_email || user.email,
                contact_phone: current.contact_phone || user.phone,
                legal_full_name: current.legal_full_name || user.full_name,
                bank_account_holder: current.bank_account_holder || user.full_name,
              }))
            }
          />
          <div className="text-muted-foreground text-xs">
            {selectedUser ? `Đã chọn: ${selectedUser.full_name} (${selectedUser.email})` : "Chưa chọn người dùng nào."}
          </div>
        </>
      )}
    </div>
  );
}

export function AffiliateAccountFormDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  userOptions,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValue: SrxAffiliateAccount | null;
  userOptions: SrxAffiliateUserOption[];
  isSubmitting: boolean;
  onSubmit: (value: AffiliateAccountFormState) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<AffiliateAccountFormState>(() => buildFormState(initialValue));
  const [activeTab, setActiveTab] = React.useState("account");

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(mode === "edit" ? initialValue : null));
    setActiveTab("account");
  }, [initialValue, mode, open]);

  function updateField<Key extends keyof AffiliateAccountFormState>(key: Key, value: AffiliateAccountFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[640px]">
        <DrawerHeader>
          <DrawerTitle>{mode === "edit" ? "Chỉnh sửa affiliate" : "Thêm affiliate"}</DrawerTitle>
          <DrawerDescription>
            {mode === "edit"
              ? "Cập nhật tài khoản, hoa hồng, hồ sơ cá nhân và tài khoản ngân hàng của affiliate."
              : "Tạo tài khoản affiliate trực tiếp trong CRM cho người dùng website SRX."}
          </DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            {mode === "edit" && initialValue ? (
              <div className="mb-4 grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
                <div className="space-y-1">
                  <div className="font-medium">{initialValue.user_name}</div>
                  <div className="text-muted-foreground">Mã: {initialValue.affiliate_code}</div>
                  <div className="text-muted-foreground">Duyệt lúc: {formatDateTime(initialValue.approved_at)}</div>
                </div>
                <div className="space-y-1 md:text-right">
                  <div className="text-muted-foreground">
                    Click: {initialValue.total_clicks} · Đơn: {initialValue.total_orders}
                  </div>
                  <div className="text-muted-foreground">
                    Chờ duyệt: {formatCurrency(initialValue.pending_commission_amount)}
                  </div>
                  <div className="text-muted-foreground">
                    Đã chi: {formatCurrency(initialValue.paid_commission_amount)}
                  </div>
                </div>
              </div>
            ) : null}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="account">Tài khoản</TabsTrigger>
                <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
                <TabsTrigger value="bank">Ngân hàng</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="mt-4 grid gap-4">
                <AffiliateUserSection mode={mode} form={form} setForm={setForm} userOptions={userOptions} />

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-code">Mã affiliate</Label>
                    <Input
                      id="affiliate-code"
                      value={form.affiliate_code}
                      onChange={(event) => updateField("affiliate_code", event.target.value.toUpperCase())}
                      placeholder={mode === "create" ? "Để trống để tự sinh" : "SRXABC123"}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-status">Trạng thái tài khoản</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => updateField("status", value as AffiliateAccountFormState["status"])}
                    >
                      <SelectTrigger id="affiliate-status">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {srxAffiliateAccountStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getAffiliateAccountStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-commission-type">Kiểu hoa hồng</Label>
                    <Select
                      value={form.commission_type}
                      onValueChange={(value) =>
                        updateField("commission_type", value as AffiliateAccountFormState["commission_type"])
                      }
                    >
                      <SelectTrigger id="affiliate-commission-type">
                        <SelectValue placeholder="Chọn kiểu hoa hồng" />
                      </SelectTrigger>
                      <SelectContent>
                        {srxAffiliateCommissionTypeValues.map((commissionType) => (
                          <SelectItem key={commissionType} value={commissionType}>
                            {getAffiliateCommissionTypeLabel(commissionType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-commission-rate">
                      {form.commission_type === "percent" ? "Tỷ lệ hoa hồng (%)" : "Hoa hồng cố định (VND)"}
                    </Label>
                    <Input
                      id="affiliate-commission-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.commission_rate}
                      onChange={(event) => updateField("commission_rate", event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-cookie">Thời hạn cookie (ngày)</Label>
                    <Input
                      id="affiliate-cookie"
                      type="number"
                      min="1"
                      max="3650"
                      value={form.cookie_duration_days}
                      onChange={(event) => updateField("cookie_duration_days", event.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-application-status">Trạng thái hồ sơ</Label>
                    <Select
                      value={form.application_status}
                      onValueChange={(value) =>
                        updateField("application_status", value as AffiliateAccountFormState["application_status"])
                      }
                    >
                      <SelectTrigger id="affiliate-application-status">
                        <SelectValue placeholder="Chọn trạng thái hồ sơ" />
                      </SelectTrigger>
                      <SelectContent>
                        {srxAffiliateApplicationStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getAffiliateApplicationStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="mt-4 grid gap-4">
                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-legal-name">Họ tên trên giấy tờ</Label>
                    <Input
                      id="affiliate-legal-name"
                      value={form.legal_full_name}
                      onChange={(event) => updateField("legal_full_name", event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-national-id">Số CCCD/CMND</Label>
                    <Input
                      id="affiliate-national-id"
                      value={form.national_id_number}
                      onChange={(event) => updateField("national_id_number", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="affiliate-address">Địa chỉ thường trú</Label>
                  <Input
                    id="affiliate-address"
                    value={form.permanent_address}
                    onChange={(event) => updateField("permanent_address", event.target.value)}
                  />
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-gender">Giới tính</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(value) => updateField("gender", value as AffiliateAccountFormState["gender"])}
                    >
                      <SelectTrigger id="affiliate-gender">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        {srxAffiliateGenderValues.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {getAffiliateGenderLabel(gender)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-contact-phone">Điện thoại liên hệ</Label>
                    <Input
                      id="affiliate-contact-phone"
                      value={form.contact_phone}
                      onChange={(event) => updateField("contact_phone", event.target.value)}
                    />
                  </div>
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-contact-email">Email liên hệ</Label>
                    <Input
                      id="affiliate-contact-email"
                      value={form.contact_email}
                      onChange={(event) => updateField("contact_email", event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-social-channel">Kênh xã hội chính</Label>
                    <Input
                      id="affiliate-social-channel"
                      value={form.social_channel}
                      onChange={(event) => updateField("social_channel", event.target.value)}
                      placeholder="Facebook, TikTok, Zalo..."
                    />
                  </div>
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-facebook">Facebook</Label>
                    <Input
                      id="affiliate-facebook"
                      value={form.facebook_url}
                      onChange={(event) => updateField("facebook_url", event.target.value)}
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-tiktok">TikTok</Label>
                    <Input
                      id="affiliate-tiktok"
                      value={form.tiktok_url}
                      onChange={(event) => updateField("tiktok_url", event.target.value)}
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="affiliate-website">Website</Label>
                  <Input
                    id="affiliate-website"
                    value={form.website_url}
                    onChange={(event) => updateField("website_url", event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="affiliate-promotion-plan">Kế hoạch quảng bá</Label>
                  <Textarea
                    id="affiliate-promotion-plan"
                    className="min-h-24"
                    value={form.promotion_plan}
                    onChange={(event) => updateField("promotion_plan", event.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bank" className="mt-4 grid gap-4">
                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-bank-holder">Chủ tài khoản</Label>
                    <Input
                      id="affiliate-bank-holder"
                      value={form.bank_account_holder}
                      onChange={(event) => updateField("bank_account_holder", event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-bank-name">Ngân hàng</Label>
                    <Input
                      id="affiliate-bank-name"
                      value={form.bank_name}
                      onChange={(event) => updateField("bank_name", event.target.value)}
                      placeholder="Vietcombank, Techcombank..."
                    />
                  </div>
                </div>

                <div className={gridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-bank-branch">Chi nhánh</Label>
                    <Input
                      id="affiliate-bank-branch"
                      value={form.bank_branch}
                      onChange={(event) => updateField("bank_branch", event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="affiliate-bank-number">Số tài khoản</Label>
                    <Input
                      id="affiliate-bank-number"
                      value={form.bank_account_number}
                      onChange={(event) => updateField("bank_account_number", event.target.value)}
                    />
                  </div>
                </div>

                <p className="text-muted-foreground text-xs">
                  Để trống toàn bộ nếu affiliate chưa cung cấp tài khoản ngân hàng. Khi đã nhập, cần đủ chủ tài khoản,
                  tên ngân hàng và số tài khoản.
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="affiliate-review-note">Ghi chú nội bộ</Label>
                  <Textarea
                    id="affiliate-review-note"
                    className="min-h-24"
                    value={form.review_note}
                    onChange={(event) => updateField("review_note", event.target.value)}
                    placeholder="Ghi chú duyệt hồ sơ, thỏa thuận hoa hồng..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : mode === "edit" ? "Lưu thay đổi" : "Tạo affiliate"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
