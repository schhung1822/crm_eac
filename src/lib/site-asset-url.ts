import "server-only";

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function getNormalizedSiteUrl(): string | null {
  const rawValue =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SRX_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.APP_URL?.trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawValue);
    const normalizedPath = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname.replace(/\/+$/, "");
    return `${parsedUrl.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

function isAbsoluteUrl(value: string): boolean {
  return ABSOLUTE_URL_PATTERN.test(value) || value.startsWith("//");
}

function normalizeRelativeAssetPath(value: string): string {
  if (value.startsWith("/")) {
    return value;
  }

  return `/${value.replace(/^\.?\//, "")}`;
}

function replaceHtmlAttribute(
  html: string,
  attributeName: "poster" | "src",
  resolver: (value: string) => string,
): string {
  const attributePattern = new RegExp(`\\b${attributeName}\\s*=\\s*(\"([^\"]*)\"|'([^']*)')`, "gi");

  return html.replace(attributePattern, (match, quotedValue: string, doubleQuotedValue: string, singleQuotedValue: string) => {
    const rawValue = doubleQuotedValue ?? singleQuotedValue ?? "";
    const normalizedValue = resolver(rawValue);

    if (!normalizedValue || normalizedValue === rawValue) {
      return match;
    }

    const quote = quotedValue.startsWith('"') ? '"' : "'";
    return `${attributeName}=${quote}${normalizedValue}${quote}`;
  });
}

function replaceHtmlSrcsetAttribute(html: string, resolver: (value: string) => string): string {
  const srcsetPattern = /\bsrcset\s*=\s*("([^"]*)"|'([^']*)')/gi;

  return html.replace(srcsetPattern, (match, quotedValue: string, doubleQuotedValue: string, singleQuotedValue: string) => {
    const rawValue = doubleQuotedValue ?? singleQuotedValue ?? "";

    if (!rawValue.trim()) {
      return match;
    }

    const normalizedValue = rawValue
      .split(",")
      .map((candidate) => {
        const trimmedCandidate = candidate.trim();

        if (!trimmedCandidate) {
          return trimmedCandidate;
        }

        const [urlPart, ...descriptorParts] = trimmedCandidate.split(/\s+/);
        const normalizedUrl = resolver(urlPart);

        return [normalizedUrl, ...descriptorParts].filter(Boolean).join(" ");
      })
      .join(", ");

    if (!normalizedValue || normalizedValue === rawValue) {
      return match;
    }

    const quote = quotedValue.startsWith('"') ? '"' : "'";
    return `srcset=${quote}${normalizedValue}${quote}`;
  });
}

function replaceHtmlAssetAttributes(html: string, resolver: (value: string) => string): string {
  return replaceHtmlSrcsetAttribute(replaceHtmlAttribute(replaceHtmlAttribute(html, "src", resolver), "poster", resolver), resolver);
}

export function resolveSiteAssetUrl(value: string | null | undefined): string {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (isAbsoluteUrl(trimmedValue)) {
    return trimmedValue;
  }

  const siteUrl = getNormalizedSiteUrl();

  if (!siteUrl) {
    return trimmedValue;
  }

  return `${siteUrl}${normalizeRelativeAssetPath(trimmedValue)}`;
}

export function resolveNullableSiteAssetUrl(value: string | null | undefined): string | null {
  const normalizedValue = resolveSiteAssetUrl(value);
  return normalizedValue ? normalizedValue : null;
}

export function resolveSiteAssetUrls(values: readonly string[]): string[] {
  return values.map((value) => resolveSiteAssetUrl(value)).filter(Boolean);
}

export function resolveSiteAssetUrlForStorage(value: string | null | undefined): string {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (isAbsoluteUrl(trimmedValue)) {
    return trimmedValue;
  }

  const normalizedPath = normalizeRelativeAssetPath(trimmedValue);
  const siteUrl = getNormalizedSiteUrl();

  if (!siteUrl) {
    return normalizedPath;
  }

  return `${siteUrl}${normalizedPath}`;
}

export function resolveNullableSiteAssetUrlForStorage(value: string | null | undefined): string | null {
  const normalizedValue = resolveSiteAssetUrlForStorage(value);
  return normalizedValue ? normalizedValue : null;
}

export function resolveSiteAssetUrlsForStorage(values: readonly string[]): string[] {
  return values.map((value) => resolveSiteAssetUrlForStorage(value)).filter(Boolean);
}

export function resolveHtmlAssetUrls(html: string | null | undefined): string {
  const trimmedValue = String(html ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  return replaceHtmlAssetAttributes(trimmedValue, resolveSiteAssetUrl);
}

export function resolveHtmlAssetUrlsForStorage(html: string | null | undefined): string {
  const trimmedValue = String(html ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  return replaceHtmlAssetAttributes(trimmedValue, resolveSiteAssetUrlForStorage);
}
