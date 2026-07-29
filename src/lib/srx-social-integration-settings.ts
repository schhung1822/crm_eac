import "server-only";

import { getSrxConnectionSecret, getSrxConnectionValues, getSrxSchedulerSecret } from "@/lib/srx-connections";

export type SrxSocialIntegrationSettings = {
  facebookGraphApiVersion: string;
  facebookPageAccessToken: string;
  facebookPageId: string;
  schedulerLimit: string;
  schedulerSecret: string;
  zaloArticleAuthor: string;
  zaloArticleCreateUrl: string;
  zaloArticleDeleteUrl: string;
  zaloArticleListUrl: string;
  zaloArticleUpdateUrl: string;
};

export const defaultSrxSocialIntegrationSettings: SrxSocialIntegrationSettings = {
  facebookGraphApiVersion: "v20.0",
  facebookPageAccessToken: "",
  facebookPageId: "1149491654916679",
  schedulerLimit: "20",
  schedulerSecret: "",
  zaloArticleAuthor: "SRX",
  zaloArticleCreateUrl: "https://openapi.zalo.me/v2.0/article/create",
  zaloArticleDeleteUrl: "https://openapi.zalo.me/v2.0/article/remove",
  zaloArticleListUrl: "https://openapi.zalo.me/v2.0/article/getlist",
  zaloArticleUpdateUrl: "https://openapi.zalo.me/v2.0/article/update",
};

/**
 * Cấu hình Facebook / Zalo giờ nằm trong store kết nối (trang /ai).
 * Hàm này chỉ là lớp đọc để luồng đăng bài social dùng lại như trước.
 */
export async function readSrxSocialIntegrationSettings(): Promise<SrxSocialIntegrationSettings> {
  const [facebookToken, facebookValues, zaloValues, schedulerSecret] = await Promise.all([
    getSrxConnectionSecret("facebook"),
    getSrxConnectionValues("facebook"),
    getSrxConnectionValues("zalo"),
    getSrxSchedulerSecret(),
  ]);

  const defaults = defaultSrxSocialIntegrationSettings;

  return {
    facebookGraphApiVersion: facebookValues.graphApiVersion || defaults.facebookGraphApiVersion,
    facebookPageAccessToken: facebookToken,
    facebookPageId: facebookValues.pageId || defaults.facebookPageId,
    schedulerLimit: facebookValues.schedulerLimit || defaults.schedulerLimit,
    schedulerSecret,
    zaloArticleAuthor: zaloValues.articleAuthor || defaults.zaloArticleAuthor,
    zaloArticleCreateUrl: zaloValues.articleCreateUrl || defaults.zaloArticleCreateUrl,
    zaloArticleDeleteUrl: zaloValues.articleDeleteUrl || defaults.zaloArticleDeleteUrl,
    zaloArticleListUrl: zaloValues.articleListUrl || defaults.zaloArticleListUrl,
    zaloArticleUpdateUrl: zaloValues.articleUpdateUrl || defaults.zaloArticleUpdateUrl,
  };
}
