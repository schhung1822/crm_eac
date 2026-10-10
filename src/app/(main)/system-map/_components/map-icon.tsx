"use client";

import {
  Bot,
  Boxes,
  CalendarDays,
  ChartColumn,
  Clock,
  Database,
  Footprints,
  Globe,
  Handshake,
  Image,
  KeyRound,
  LogIn,
  Mail,
  MessageSquareText,
  Package,
  QrCode,
  Radar,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Send,
  Server,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  UserRound,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  siFacebook,
  siGoogle,
  siGoogleanalytics,
  siMeta,
  siN8n,
  siTiktok,
  siZalo,
  type SimpleIcon as SimpleIconData,
} from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { cn } from "@/lib/utils";

import type { MapIconKey } from "./map-types";

const BRAND_ICONS = new Map<MapIconKey, SimpleIconData>([
  ["facebook", siFacebook],
  ["google", siGoogle],
  ["zalo", siZalo],
  ["meta", siMeta],
  ["n8n", siN8n],
  ["tiktok", siTiktok],
  ["google-analytics", siGoogleanalytics],
]);

const LUCIDE_ICONS = new Map<MapIconKey, LucideIcon>([
  ["organic", Footprints],
  ["share", Share2],
  ["store", Store],
  ["globe", Globe],
  ["qr", QrCode],
  ["calendar", CalendarDays],
  ["message", MessageSquareText],
  ["handshake", Handshake],
  ["login", LogIn],
  ["smartphone", Smartphone],
  ["radar", Radar],
  ["cart", ShoppingCart],
  ["webhook", Webhook],
  ["shield", ShieldCheck],
  ["server", Server],
  ["users", Users],
  ["clock", Clock],
  ["boxes", Boxes],
  ["bot", Bot],
  ["refresh", RefreshCw],
  ["receipt", ReceiptText],
  ["logs", ScrollText],
  ["user-round", UserRound],
  ["package", Package],
  ["image", Image],
  ["key", KeyRound],
  ["database", Database],
  ["send", Send],
  ["mail", Mail],
  ["chart", ChartColumn],
]);

export function MapIcon({ icon, color, className }: { icon: MapIconKey; color: string; className?: string }) {
  const brand = BRAND_ICONS.get(icon);

  if (brand) {
    // Logo đen (TikTok) dùng màu chữ hiện tại để vẫn thấy được trên nền tối.
    const isMonochrome = brand.hex === "000000";

    return (
      <SimpleIcon
        icon={brand}
        className={cn("size-[18px]", isMonochrome && "fill-foreground", className)}
        style={isMonochrome ? undefined : { fill: `#${brand.hex}` }}
      />
    );
  }

  return renderLucideIcon(LUCIDE_ICONS.get(icon) ?? Server, { className: cn("size-[18px]", className), color });
}

function renderLucideIcon(Icon: LucideIcon, { className, color }: { className: string; color: string }) {
  return <Icon className={className} style={{ color }} aria-hidden />;
}
