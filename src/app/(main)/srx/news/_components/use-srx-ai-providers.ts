"use client";

import * as React from "react";

import type { SrxAiTextProviderId } from "@/lib/srx-ai-models.shared";

export type SrxAiProviderState = {
  id: SrxAiTextProviderId;
  label: string;
  hasApiKey: boolean;
};

/**
 * Đọc danh sách nhà cung cấp AI đã có API key (cấu hình ở trang /ai). Chỉ gọi khi
 * hộp thoại mở để không tốn request lúc chỉ soạn bài tay.
 */
export function useSrxAiProviders(enabled: boolean) {
  const [providers, setProviders] = React.useState<SrxAiProviderState[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || providers.length > 0) {
      return;
    }

    let isMounted = true;

    async function loadProviders() {
      try {
        setIsLoading(true);

        const response = await fetch("/api/srx/ai-settings");

        if (!response.ok) {
          throw new Error("Không đọc được cấu hình AI");
        }

        const result = (await response.json()) as { providers?: SrxAiProviderState[] };

        if (!isMounted) return;

        setProviders(result.providers ?? []);
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Không đọc được cấu hình AI");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, [enabled, providers.length]);

  return { providers, isLoading, error };
}
