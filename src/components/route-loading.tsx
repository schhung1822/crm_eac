"use client";

import * as React from "react";

import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    __navLoadingStart?: () => void;
    __navLoadingDone?: () => void;
  }
}

function NavigationLoadingContent({
  text = "Cho mot chut",
  maxMs = 12000,
  minShowMs = 300,
}: {
  text?: string;
  maxMs?: number;
  minShowMs?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [show, setShow] = React.useState(false);
  const startedAtRef = React.useRef<number | null>(null);
  const maxTimerRef = React.useRef<number | null>(null);

  const start = React.useCallback(() => {
    if (show) return;
    startedAtRef.current = Date.now();
    setShow(true);

    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
    }

    maxTimerRef.current = window.setTimeout(() => {
      setShow(false);
      startedAtRef.current = null;
    }, maxMs);
  }, [show, maxMs]);

  const done = React.useCallback(() => {
    const startedAt = startedAtRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 0;

    const finish = () => {
      setShow(false);
      startedAtRef.current = null;
      if (maxTimerRef.current) {
        clearTimeout(maxTimerRef.current);
      }
      maxTimerRef.current = null;
    };

    if (show && elapsed < minShowMs) {
      setTimeout(finish, minShowMs - elapsed);
    } else {
      finish();
    }
  }, [show, minShowMs]);

  React.useEffect(() => {
    window.__navLoadingStart = start;
    window.__navLoadingDone = done;

    return () => {
      delete window.__navLoadingStart;
      delete window.__navLoadingDone;
    };
  }, [start, done]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a");

      if (!link) return;
      if (link.target === "_blank") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = link.getAttribute("href");
      if (!href) return;

      if (href.startsWith("/") && !href.startsWith("//")) {
        start();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  React.useEffect(() => {
    if (show) {
      done();
    }
  }, [pathname, searchParams, show, done]);

  if (!show) {
    return null;
  }

  return (
    <div className="nav-toast-in fixed right-8 bottom-8 z-[9999]">
      <div className="bg-background/90 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        <span className="font-medium">{text}</span>
        <span className="ml-1 inline-flex gap-1">
          <span className="bg-foreground/50 dot-bounce h-1 w-1 rounded-full" />
          <span className="bg-foreground/50 dot-bounce h-1 w-1 rounded-full delay-1" />
          <span className="bg-foreground/50 dot-bounce h-1 w-1 rounded-full delay-2" />
        </span>
      </div>
    </div>
  );
}

export function NavigationLoading(props: { text?: string; maxMs?: number; minShowMs?: number }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <NavigationLoadingContent {...props} />;
}
