import { NextRequest, NextResponse } from "next/server";

import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxActiveBannersByPosition } from "@/lib/srx-website";
import { srxBannerPositionSchema, type SrxBanner } from "@/lib/srx-website.shared";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = "GET, OPTIONS";
const DEFAULT_POSITION = "homepage_hero";

type PublicBanner = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  alt_text: string;
  button_label: string;
  link_type: SrxBanner["link_type"];
  link_target: string;
  open_in_new_tab: boolean;
  sort_order: number;
};

function toPublicBanner(banner: SrxBanner): PublicBanner {
  return {
    id: banner.id,
    title: banner.title,
    description: banner.description,
    image_url: banner.image_url,
    // Mini App hiển thị trên mobile nên ưu tiên ảnh mobile, thiếu thì dùng ảnh mặc định.
    mobile_image_url: banner.mobile_image_url || banner.image_url,
    alt_text: banner.alt_text || banner.title,
    button_label: banner.button_label,
    link_type: banner.link_type,
    link_target: banner.link_target,
    open_in_new_tab: banner.open_in_new_tab,
    sort_order: banner.sort_order,
  };
}

/**
 * Danh sách banner công khai cho Zalo Mini App / website.
 *
 * GET /api/srx/banners/public?position=homepage_hero
 * Mặc định trả về banner ở vị trí `homepage_hero`, chỉ gồm banner đang bật và
 * còn trong thời gian hiển thị, sắp xếp theo `sort_order`.
 */
export async function GET(request: NextRequest) {
  try {
    const rawPosition = request.nextUrl.searchParams.get("position")?.trim() || DEFAULT_POSITION;
    const parsedPosition = srxBannerPositionSchema.safeParse(rawPosition);

    if (!parsedPosition.success) {
      return withMiniAppCors(
        NextResponse.json({ message: "Vị trí banner không hợp lệ." }, { status: 400 }),
        request,
        ALLOWED_METHODS,
      );
    }

    const banners = await getSrxActiveBannersByPosition(parsedPosition.data);

    return withMiniAppCors(
      NextResponse.json({
        position: parsedPosition.data,
        banners: banners.map((banner) => toPublicBanner(banner)),
      }),
      request,
      ALLOWED_METHODS,
    );
  } catch (error) {
    console.error("Public banners error:", error);

    return withMiniAppCors(buildApiErrorResponse(error, "Không thể tải danh sách banner"), request, ALLOWED_METHODS);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request, ALLOWED_METHODS);
}
