/**
 * Helpers for creating/reconstructing Fabric.js objects from persisted
 * drawings. Centralised here so tactical-canvas.tsx stays manageable.
 *
 * Supported drawing types (v1):
 *   - line       : straight segment (2 points)
 *   - arrow      : line with arrowhead at p1 → p2 (rendered as Path)
 *   - rectangle  : axis-aligned rect (2 opposite corners)
 *   - circle     : center + edge point (radius = distance)
 */

import type { MapDrawing } from "@/types/database";

// ─── Supported UI tools ───────────────────────────────────────────────────────

export type DrawTool =
  | "select"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle";

export const DRAW_COLORS: { value: string; label: string }[] = [
  { value: "#00ffcc", label: "Cyan" },
  { value: "#F0A500", label: "Amber" },
  { value: "#FF2442", label: "Red" },
  { value: "#E6E8EC", label: "White" },
];

export const DRAW_WIDTHS: number[] = [2, 4, 6];

// ─── Arrow path builder ──────────────────────────────────────────────────────

/**
 * Builds an SVG-style path string for an arrow from (x1,y1) → (x2,y2).
 * The arrowhead is drawn at the endpoint, 14 units long, 30° half-angle.
 */
export function buildArrowPathString(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  headSize = 14
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hx1 = x2 - headSize * Math.cos(angle - Math.PI / 6);
  const hy1 = y2 - headSize * Math.sin(angle - Math.PI / 6);
  const hx2 = x2 - headSize * Math.cos(angle + Math.PI / 6);
  const hy2 = y2 - headSize * Math.sin(angle + Math.PI / 6);
  return `M ${x1} ${y1} L ${x2} ${y2} M ${hx1} ${hy1} L ${x2} ${y2} L ${hx2} ${hy2}`;
}

// ─── Factory: build a Fabric object from a persisted drawing ─────────────────

/**
 * Creates a Fabric object from a persisted `MapDrawing` row. Stamps
 * `__drawingId` on the returned object so the canvas can find it later
 * by DB id (e.g. for realtime remove).
 *
 * Returns null if the drawing cannot be reconstructed (malformed points).
 */
export function createFabricDrawing(
  fabric: typeof import("fabric"),
  drawing: MapDrawing,
  selectable: boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any | null {
  const { drawing_type, points, stroke_color, stroke_width } = drawing;
  const color = stroke_color ?? "#00ffcc";
  const width = stroke_width ?? 2;

  const commonOpts = {
    stroke: color,
    strokeWidth: width,
    fill: "transparent",
    selectable,
    evented: selectable,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    hasBorders: true,
    perPixelTargetFind: true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obj: any = null;

  switch (drawing_type) {
    case "line": {
      if (points.length < 2) return null;
      obj = new fabric.Line(
        [points[0].x, points[0].y, points[1].x, points[1].y],
        { ...commonOpts, strokeLineCap: "round" }
      );
      break;
    }

    case "arrow": {
      if (points.length < 2) return null;
      const pathStr = buildArrowPathString(
        points[0].x,
        points[0].y,
        points[1].x,
        points[1].y
      );
      obj = new fabric.Path(pathStr, {
        ...commonOpts,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
      break;
    }

    case "rectangle": {
      if (points.length < 2) return null;
      obj = new fabric.Rect({
        ...commonOpts,
        left: Math.min(points[0].x, points[1].x),
        top: Math.min(points[0].y, points[1].y),
        width: Math.abs(points[1].x - points[0].x),
        height: Math.abs(points[1].y - points[0].y),
      });
      break;
    }

    case "circle": {
      if (points.length < 2) return null;
      const r = Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y
      );
      obj = new fabric.Circle({
        ...commonOpts,
        left: points[0].x,
        top: points[0].y,
        radius: r,
        originX: "center",
        originY: "center",
      });
      break;
    }

    // polyline / polygon / freehand — not supported in v1
    default:
      return null;
  }

  if (obj) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).__drawingId = drawing.id;
  }
  return obj;
}
