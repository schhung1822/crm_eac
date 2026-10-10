"use client";

import * as React from "react";

import type { Box, Point } from "./map-geometry";

export interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

type KeyAction = () => void;

interface Gesture {
  origin: ViewTransform;
  start: Point;
  distance: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 4;
const KEY_PAN_STEP = 80;
/** Chừa chỗ cho hàng tiêu đề làn dính ở mép trên khi căn giữa / thu phóng vừa khung. */
const TOP_INSET = 44;

/** Phần tử nằm trong vùng này (thẻ thông tin, nút điều khiển) không kích hoạt kéo / zoom bản đồ. */
export const MAP_OVERLAY_ATTRIBUTE = "data-map-overlay";

function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpointOf(points: Point[]): Point {
  const [first, second = first] = points;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function isInsideOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(`[${MAP_OVERLAY_ATTRIBUTE}]`));
}

export function useMapViewport(viewportRef: React.RefObject<HTMLDivElement | null>, initialBox: Box) {
  const [transform, setTransform] = React.useState<ViewTransform | null>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const transformRef = React.useRef<ViewTransform>({ x: 0, y: 0, k: 1 });
  const pointers = React.useRef(new Map<number, Point>());
  const gesture = React.useRef<Gesture | null>(null);
  const dragDistance = React.useRef(0);
  const panningRef = React.useRef(false);

  const apply = React.useCallback((next: ViewTransform, animate: boolean) => {
    transformRef.current = next;
    setIsAnimating(animate);
    setTransform(next);
  }, []);

  const getViewportSize = React.useCallback(() => {
    const element = viewportRef.current;
    return { width: element?.clientWidth ?? 0, height: element?.clientHeight ?? 0 };
  }, [viewportRef]);

  const fitBox = React.useCallback(
    (box: Box, options: { animate?: boolean; padding?: number; maxZoom?: number } = {}) => {
      const { width, height } = getViewportSize();

      if (!width || !height) return;

      const padding = options.padding ?? 32;
      const usableHeight = height - TOP_INSET;
      const k = clampZoom(
        Math.min((width - padding * 2) / box.w, (usableHeight - padding * 2) / box.h, options.maxZoom ?? 1.1),
      );

      apply(
        { k, x: width / 2 - (box.x + box.w / 2) * k, y: TOP_INSET + usableHeight / 2 - (box.y + box.h / 2) * k },
        options.animate ?? true,
      );
    },
    [apply, getViewportSize],
  );

  const zoomAt = React.useCallback(
    (factor: number, origin?: Point, animate = false) => {
      const { width, height } = getViewportSize();
      const current = transformRef.current;
      const k = clampZoom(current.k * factor);
      const point = origin ?? { x: width / 2, y: height / 2 };
      const ratio = k / current.k;

      apply({ k, x: point.x - (point.x - current.x) * ratio, y: point.y - (point.y - current.y) * ratio }, animate);
    },
    [apply, getViewportSize],
  );

  const panBy = React.useCallback(
    (dx: number, dy: number) => {
      const current = transformRef.current;
      apply({ ...current, x: current.x + dx, y: current.y + dy }, true);
    },
    [apply],
  );

  /** Đưa một node vào giữa màn hình, phóng to vừa đủ để đọc được chữ. */
  const centerOnBox = React.useCallback(
    (box: Box) => {
      const { width, height } = getViewportSize();
      const k = Math.max(transformRef.current.k, 0.9);
      const centerY = TOP_INSET + (height - TOP_INSET) / 2;

      apply({ k, x: width / 2 - (box.x + box.w / 2) * k, y: centerY - (box.y + box.h / 2) * k }, true);
    },
    [apply, getViewportSize],
  );

  React.useEffect(() => {
    const element = viewportRef.current;

    if (!element) return;

    let hasFitted = false;
    const observer = new ResizeObserver(() => {
      setViewportSize({ width: element.clientWidth, height: element.clientHeight });

      if (!hasFitted && element.clientWidth > 0 && element.clientHeight > 0) {
        hasFitted = true;
        fitBox(initialBox, { animate: false });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [fitBox, initialBox, viewportRef]);

  React.useEffect(() => {
    const element = viewportRef.current;

    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (isInsideOverlay(event.target)) return;

      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : 1;
      const speed = event.ctrlKey ? 0.01 : 0.0015;

      zoomAt(Math.exp(-event.deltaY * unit * speed), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [viewportRef, zoomAt]);

  const startGesture = React.useCallback(() => {
    const points = [...pointers.current.values()];

    if (!points.length) {
      gesture.current = null;
      return;
    }

    gesture.current = {
      origin: transformRef.current,
      start: midpointOf(points),
      distance: points.length >= 2 ? distanceBetween(points[0], points[1]) : 0,
    };
  }, []);

  const handlePinch = React.useCallback(
    (current: Gesture, points: Point[]) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      const mid = midpointOf(points);
      const k = clampZoom((current.origin.k * distanceBetween(points[0], points[1])) / current.distance);
      const ratio = k / current.origin.k;
      const originX = current.start.x - (rect?.left ?? 0);
      const originY = current.start.y - (rect?.top ?? 0);

      dragDistance.current = Number.POSITIVE_INFINITY;
      apply(
        {
          k,
          x: originX - (originX - current.origin.x) * ratio + (mid.x - current.start.x),
          y: originY - (originY - current.origin.y) * ratio + (mid.y - current.start.y),
        },
        false,
      );
    },
    [apply, viewportRef],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if ((event.pointerType === "mouse" && event.button !== 0) || isInsideOverlay(event.target)) return;

      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size === 1) {
        dragDistance.current = 0;
      }

      startGesture();
    },
    [startGesture],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const current = gesture.current;

      if (!current || !pointers.current.has(event.pointerId)) return;

      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...pointers.current.values()];

      if (points.length >= 2 && current.distance > 0) {
        handlePinch(current, points);
        return;
      }

      const dx = event.clientX - current.start.x;
      const dy = event.clientY - current.start.y;
      dragDistance.current = Math.max(dragDistance.current, Math.hypot(dx, dy));

      if (dragDistance.current < DRAG_THRESHOLD) return;

      // Chỉ bắt con trỏ khi đã thật sự kéo, để cú click đơn vẫn tới được node.
      if (!panningRef.current) {
        panningRef.current = true;
        setIsPanning(true);
        viewportRef.current?.setPointerCapture(event.pointerId);
      }

      apply({ ...current.origin, x: current.origin.x + dx, y: current.origin.y + dy }, false);
    },
    [apply, handlePinch, viewportRef],
  );

  const onPointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);

      if (pointers.current.size > 0) {
        startGesture();
        return;
      }

      gesture.current = null;
      panningRef.current = false;
      setIsPanning(false);
    },
    [startGesture],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const actions = new Map<string, KeyAction>([
        ["+", () => zoomAt(1.25, undefined, true)],
        ["=", () => zoomAt(1.25, undefined, true)],
        ["-", () => zoomAt(0.8, undefined, true)],
        ["0", () => fitBox(initialBox)],
        ["ArrowLeft", () => panBy(KEY_PAN_STEP, 0)],
        ["ArrowRight", () => panBy(-KEY_PAN_STEP, 0)],
        ["ArrowUp", () => panBy(0, KEY_PAN_STEP)],
        ["ArrowDown", () => panBy(0, -KEY_PAN_STEP)],
      ]);
      const action = actions.get(event.key);

      if (!action || isInsideOverlay(event.target)) return;

      event.preventDefault();
      action();
    },
    [fitBox, initialBox, panBy, zoomAt],
  );

  const wasDragged = React.useCallback(() => dragDistance.current >= DRAG_THRESHOLD, []);

  return {
    transform,
    viewportSize,
    isAnimating,
    isPanning,
    fitBox,
    zoomAt,
    centerOnBox,
    wasDragged,
    viewportHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
    },
  };
}
