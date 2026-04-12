"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { Canvas as FabricCanvasType } from "fabric";
import CanvasToolbar from "./canvas-toolbar";
import { getNatoDataUrl } from "./nato-icons";
import {
  buildArrowPathString,
  createFabricDrawing,
  type DrawTool,
} from "./drawing-helpers";
import type {
  TacticalMarker,
  MarkerType,
  MarkerAffiliation,
  MapDrawing,
  DrawingType,
} from "@/types/database";

export interface TacticalCanvasRef {
  fitView: () => void;
  setGridType: (type: GridType) => void;
  setGridSize: (size: number) => void;
  // ─── Realtime marker manipulation ─────────────────
  /** Returns true if a marker with this DB id already exists on the canvas. */
  hasMarker: (markerId: string) => boolean;
  /** Adds a marker from an external source (realtime event). Adopts any
   *  pending (no-id-yet) fabric object at matching coords to avoid duplicates. */
  addMarker: (marker: TacticalMarker) => void;
  /** Updates the position of a marker already on the canvas. */
  updateMarkerPos: (markerId: string, x: number, y: number) => void;
  /** Removes a marker from the canvas by DB id. */
  removeMarker: (markerId: string) => void;
  // ─── Realtime drawing manipulation ────────────────
  /** Returns true if a drawing with this DB id already exists on the canvas. */
  hasDrawing: (drawingId: string) => boolean;
  /** Adds a drawing from an external source (realtime or initial load). */
  addDrawing: (drawing: MapDrawing) => void;
  /** Removes a drawing from the canvas by DB id. */
  removeDrawing: (drawingId: string) => void;
}

export type GridType = "none" | "square" | "hex";

export interface CreateDrawingPayload {
  drawingType: DrawingType;
  points: Array<{ x: number; y: number }>;
  strokeColor: string;
  strokeWidth: number;
}

interface TacticalCanvasProps {
  mapId: string;
  imageUrl: string;
  initialGridType?: GridType;
  initialGridSize?: number;
  // ─── Marker props ──────────────────────────────────
  initialMarkers?: TacticalMarker[];
  canEdit?: boolean;
  /** Rendered as an absolute overlay inside the canvas area */
  palette?: React.ReactNode;
  /** Called on drop; resolves to the new marker's DB id (or "" on error) */
  onMarkerDrop?: (
    type: MarkerType,
    affiliation: MarkerAffiliation,
    x: number,
    y: number
  ) => Promise<string>;
  /** Called when a marker is dragged to a new position */
  onMarkerMoved?: (markerId: string, x: number, y: number) => void;
  /** Called when Delete/Backspace is pressed with a marker selected */
  onMarkerDeleted?: (markerId: string) => void;
  // ─── Drawing props ─────────────────────────────────
  initialDrawings?: MapDrawing[];
  /** Called when a new drawing is finalised; resolves to the new DB id ("" on error) */
  onDrawingCreate?: (payload: CreateDrawingPayload) => Promise<string>;
  /** Called when Delete is pressed with a drawing selected */
  onDrawingDeleted?: (drawingId: string) => void;
  // ─── Scale ─────────────────────────────────────────
  /** Pixels-per-unit ratio for the measurement tool (default 1.0 = 1px per unit) */
  scaleFactor?: number;
}

const GRID_COLOR = "rgba(0, 255, 204, 0.12)";
const GRID_STROKE = 0.5;
const CANVAS_BG = "#060708";

// ─── Grid Helpers ─────────────────────────────────────────────────────────────

function buildSquareGrid(
  fabric: typeof import("fabric"),
  areaW: number,
  areaH: number,
  gridSize: number
) {
  const { Line, Point } = fabric;
  const lines = [];
  const cols = Math.ceil(areaW / gridSize) + 1;
  const rows = Math.ceil(areaH / gridSize) + 1;

  for (let c = 0; c <= cols; c++) {
    lines.push(
      new Line([c * gridSize, 0, c * gridSize, rows * gridSize], {
        stroke: GRID_COLOR,
        strokeWidth: GRID_STROKE,
        selectable: false,
        evented: false,
      })
    );
    void Point;
  }
  for (let r = 0; r <= rows; r++) {
    lines.push(
      new Line([0, r * gridSize, cols * gridSize, r * gridSize], {
        stroke: GRID_COLOR,
        strokeWidth: GRID_STROKE,
        selectable: false,
        evented: false,
      })
    );
  }
  return lines;
}

function buildHexGrid(
  fabric: typeof import("fabric"),
  areaW: number,
  areaH: number,
  gridSize: number
) {
  const { Polygon } = fabric;
  const hexes = [];
  const r = gridSize / 2;
  const w = r * 2;
  const h = Math.sqrt(3) * r;
  const cols = Math.ceil(areaW / (w * 0.75)) + 2;
  const rows = Math.ceil(areaH / h) + 2;

  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * w * 0.75;
      const cy = row * h + (col % 2 === 0 ? 0 : h / 2);
      hexes.push(
        new Polygon(
          [
            { x: cx + r, y: cy },
            { x: cx + r / 2, y: cy - h / 2 },
            { x: cx - r / 2, y: cy - h / 2 },
            { x: cx - r, y: cy },
            { x: cx - r / 2, y: cy + h / 2 },
            { x: cx + r / 2, y: cy + h / 2 },
          ],
          {
            fill: "transparent",
            stroke: GRID_COLOR,
            strokeWidth: GRID_STROKE,
            selectable: false,
            evented: false,
          }
        )
      );
    }
  }
  return hexes;
}

// ─── Custom property helpers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkerId(obj: any): string {
  return (obj?.__markerId as string) ?? "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDrawingId(obj: any): string {
  return (obj?.__drawingId as string) ?? "";
}

// ─── Component ───────────────────────────────────────────────────────────────

// eslint-disable-next-line react/display-name
const TacticalCanvas = forwardRef<TacticalCanvasRef, TacticalCanvasProps>(
  function TacticalCanvas(
    {
      mapId,
      imageUrl,
      initialGridType = "none",
      initialGridSize = 50,
      initialMarkers = [],
      canEdit = false,
      palette,
      onMarkerDrop,
      onMarkerMoved,
      onMarkerDeleted,
      initialDrawings = [],
      onDrawingCreate,
      onDrawingDeleted,
      scaleFactor = 1.0,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricCanvasType | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridObjectsRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bgImageRef = useRef<any>(null);
    const isPanningRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const isSpaceDownRef = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);
    const markersLoadedRef = useRef(false);
    const initialMarkersRef = useRef(initialMarkers);
    const drawingsLoadedRef = useRef(false);
    const initialDrawingsRef = useRef(initialDrawings);
    const scaleFactorRef = useRef(scaleFactor);
    useEffect(() => { scaleFactorRef.current = scaleFactor; }, [scaleFactor]);

    // Ephemeral measurement objects (not persisted, cleared on next measure or tool switch)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const measureObjectsRef = useRef<any[]>([]);

    // Keep callbacks in a ref so event handlers always see the latest version
    const cbRef = useRef({
      onMarkerDrop,
      onMarkerMoved,
      onMarkerDeleted,
      onDrawingCreate,
      onDrawingDeleted,
    });
    useEffect(() => {
      cbRef.current = {
        onMarkerDrop,
        onMarkerMoved,
        onMarkerDeleted,
        onDrawingCreate,
        onDrawingDeleted,
      };
    }, [
      onMarkerDrop,
      onMarkerMoved,
      onMarkerDeleted,
      onDrawingCreate,
      onDrawingDeleted,
    ]);

    const [gridType, setGridTypeState] = useState<GridType>(initialGridType);
    const [gridSize, setGridSizeState] = useState(initialGridSize);
    const [zoom, setZoom] = useState(1);
    const [imageLoaded, setImageLoaded] = useState(false);

    // ─── Drawing tool state ──────────────────────────────────────────────
    const [drawTool, setDrawTool] = useState<DrawTool>("select");
    const [drawColor, setDrawColor] = useState<string>("#00ffcc");
    const [drawStrokeWidth, setDrawStrokeWidth] = useState<number>(4);

    // Refs so mouse handlers read the latest tool/color/width without re-binding
    const drawStyleRef = useRef({ drawTool, drawColor, drawStrokeWidth });
    useEffect(() => {
      drawStyleRef.current = { drawTool, drawColor, drawStrokeWidth };
    }, [drawTool, drawColor, drawStrokeWidth]);

    // In-progress drawing state (set on mouse:down, consumed on mouse:up)
    const drawingStateRef = useRef<{
      active: boolean;
      startX: number;
      startY: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      previewObj: any | null;
      tool: DrawTool;
      color: string;
      width: number;
    }>({
      active: false,
      startX: 0,
      startY: 0,
      previewObj: null,
      tool: "select",
      color: "#00ffcc",
      width: 4,
    });

    // ─── Fit-view ────────────────────────────────────────────────────────

    const fitView = useCallback(() => {
      const canvas = fabricRef.current;
      const bg = bgImageRef.current;
      if (!canvas || !bg) return;

      const pad = 40;
      const cw = canvas.getWidth() - pad * 2;
      const ch = canvas.getHeight() - pad * 2;
      const iw = (bg.width ?? 1) * (bg.scaleX ?? 1);
      const ih = (bg.height ?? 1) * (bg.scaleY ?? 1);
      const scale = Math.min(cw / iw, ch / ih, 1);
      const vpx = pad + (cw - iw * scale) / 2;
      const vpy = pad + (ch - ih * scale) / 2;

      canvas.setViewportTransform([scale, 0, 0, scale, vpx, vpy]);
      canvas.requestRenderAll();
      setZoom(scale);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        fitView,
        setGridType: (t: GridType) => setGridTypeState(t),
        setGridSize: (s: number) => setGridSizeState(s),

        // ─── Realtime marker manipulation ─────────────────────────
        hasMarker: (markerId: string) => {
          const c = fabricRef.current;
          if (!c || !markerId) return false;
          return c.getObjects().some((obj) => getMarkerId(obj) === markerId);
        },

        addMarker: (marker: TacticalMarker) => {
          const c = fabricRef.current;
          if (!c) return;

          // Already present? no-op
          if (c.getObjects().some((o) => getMarkerId(o) === marker.id)) return;

          // Race-recovery: adopt a pending (empty id) fabric object at
          // matching coordinates. This happens when a user drops a marker
          // and the realtime INSERT event arrives before / races with the
          // server-action response.
          const pending = c.getObjects().find((o) => {
            if (getMarkerId(o) !== "") return false;
            const dx = (o.left ?? 0) - marker.x;
            const dy = (o.top ?? 0) - marker.y;
            return dx * dx + dy * dy < 1; // within 1px
          });
          if (pending) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pending as any).__markerId = marker.id;
            return;
          }

          // Otherwise load & add a fresh marker image
          import("fabric").then(async (fabric) => {
            if (!fabricRef.current) return;
            const dataUrl = getNatoDataUrl(marker.marker_type, marker.affiliation);
            const img = await fabric.FabricImage.fromURL(dataUrl);
            if (!fabricRef.current) return;
            img.set({
              left: marker.x,
              top: marker.y,
              originX: "center",
              originY: "center",
              selectable: canEdit,
              evented: canEdit,
              hasControls: false,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (img as any).__markerId = marker.id;
            fabricRef.current.add(img);
            fabricRef.current.requestRenderAll();
          });
        },

        updateMarkerPos: (markerId: string, x: number, y: number) => {
          const c = fabricRef.current;
          if (!c) return;
          const target = c
            .getObjects()
            .find((obj) => getMarkerId(obj) === markerId);
          if (!target) return;
          // Don't fight an in-progress user drag of this same object
          if (c.getActiveObject() === target) return;
          target.set({ left: x, top: y });
          target.setCoords();
          c.requestRenderAll();
        },

        removeMarker: (markerId: string) => {
          const c = fabricRef.current;
          if (!c) return;
          const target = c
            .getObjects()
            .find((obj) => getMarkerId(obj) === markerId);
          if (!target) return;
          if (c.getActiveObject() === target) c.discardActiveObject();
          c.remove(target);
          c.requestRenderAll();
        },

        // ─── Realtime drawing manipulation ────────────────────────
        hasDrawing: (drawingId: string) => {
          const c = fabricRef.current;
          if (!c || !drawingId) return false;
          return c.getObjects().some((obj) => getDrawingId(obj) === drawingId);
        },

        addDrawing: (drawing: MapDrawing) => {
          const c = fabricRef.current;
          if (!c) return;
          // Skip dup
          if (c.getObjects().some((o) => getDrawingId(o) === drawing.id)) return;

          import("fabric").then((fabric) => {
            if (!fabricRef.current) return;
            const obj = createFabricDrawing(fabric, drawing, canEdit);
            if (!obj) return;
            fabricRef.current.add(obj);
            fabricRef.current.requestRenderAll();
          });
        },

        removeDrawing: (drawingId: string) => {
          const c = fabricRef.current;
          if (!c) return;
          const target = c
            .getObjects()
            .find((obj) => getDrawingId(obj) === drawingId);
          if (!target) return;
          if (c.getActiveObject() === target) c.discardActiveObject();
          c.remove(target);
          c.requestRenderAll();
        },
      }),
      [fitView, canEdit]
    );

    // ─── Canvas initialisation ────────────────────────────────────────────

    useEffect(() => {
      if (!canvasElRef.current || !containerRef.current) return;
      let disposed = false;
      markersLoadedRef.current = false;
      drawingsLoadedRef.current = false;

      async function init() {
        const fabric = await import("fabric");
        if (disposed) return;

        const container = containerRef.current!;
        const { clientWidth: w, clientHeight: h } = container;

        const canvas = new fabric.Canvas(canvasElRef.current!, {
          width: w,
          height: h,
          backgroundColor: CANVAS_BG,
          selection: canEdit,
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;

        // ── Keyboard: pan (Space) + delete marker/drawing ──────────
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.code === "Space" && !isSpaceDownRef.current) {
            isSpaceDownRef.current = true;
            canvas.defaultCursor = "grab";
            canvas.requestRenderAll();
          }
          if (
            (e.code === "Delete" || e.code === "Backspace") &&
            canEdit
          ) {
            const active = canvas.getActiveObject();
            if (!active) return;
            const markerId = getMarkerId(active);
            if (markerId) {
              canvas.remove(active);
              canvas.discardActiveObject();
              canvas.requestRenderAll();
              cbRef.current.onMarkerDeleted?.(markerId);
              return;
            }
            const drawingId = getDrawingId(active);
            if (drawingId) {
              canvas.remove(active);
              canvas.discardActiveObject();
              canvas.requestRenderAll();
              cbRef.current.onDrawingDeleted?.(drawingId);
              return;
            }
          }
        };
        const onKeyUp = (e: KeyboardEvent) => {
          if (e.code === "Space") {
            isSpaceDownRef.current = false;
            canvas.defaultCursor = "default";
            canvas.requestRenderAll();
          }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        // ── Helper: convert a fabric pointer event to world coords ──
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toWorld = (e: MouseEvent): { x: number; y: number } => {
          const vpt = canvas.viewportTransform;
          const rect = (canvas.upperCanvasEl ?? canvasElRef.current!).getBoundingClientRect();
          const ox = e.clientX - rect.left;
          const oy = e.clientY - rect.top;
          return {
            x: (ox - vpt[4]) / vpt[0],
            y: (oy - vpt[5]) / vpt[3],
          };
        };

        // ── Mouse down: pan OR begin drawing ────────────────────────
        canvas.on("mouse:down", (opt) => {
          const evt = opt.e as MouseEvent;

          // Middle-button or Space → pan (takes priority over draw)
          if (evt.button === 1 || isSpaceDownRef.current) {
            isPanningRef.current = true;
            lastPosRef.current = { x: evt.clientX, y: evt.clientY };
            canvas.defaultCursor = "grabbing";
            canvas.selection = false;
            evt.preventDefault();
            return;
          }

          // Left-button + a draw tool selected → begin drawing
          if (!canEdit) return;
          if (evt.button !== 0) return;
          const { drawTool: tool, drawColor: color, drawStrokeWidth: width } =
            drawStyleRef.current;
          if (tool === "select") return;
          // If the user clicked on an existing selectable object, let select handle it
          if (opt.target) return;

          const { x, y } = toWorld(evt);
          drawingStateRef.current = {
            active: true,
            startX: x,
            startY: y,
            previewObj: null,
            tool,
            color,
            width,
          };
          // Suppress fabric selection during draw
          canvas.selection = false;
          evt.preventDefault();
        });

        // ── Mouse move: pan OR update drawing preview ───────────────
        canvas.on("mouse:move", (opt) => {
          // Panning
          if (isPanningRef.current) {
            const evt = opt.e as MouseEvent;
            const dx = evt.clientX - lastPosRef.current.x;
            const dy = evt.clientY - lastPosRef.current.y;
            const vpt = canvas.viewportTransform;
            canvas.setViewportTransform([
              vpt[0], vpt[1], vpt[2], vpt[3],
              vpt[4] + dx, vpt[5] + dy,
            ]);
            lastPosRef.current = { x: evt.clientX, y: evt.clientY };
            canvas.requestRenderAll();
            return;
          }

          // Drawing
          const ds = drawingStateRef.current;
          if (!ds.active) return;
          const evt = opt.e as MouseEvent;
          const { x, y } = toWorld(evt);
          const { startX: sx, startY: sy, tool, color, width } = ds;

          // Remove previous preview (simpler than mutating)
          if (ds.previewObj) {
            canvas.remove(ds.previewObj);
            ds.previewObj = null;
          }

          const common = {
            stroke: color,
            strokeWidth: width,
            fill: "transparent",
            selectable: false,
            evented: false,
            strokeLineCap: "round" as const,
            strokeLineJoin: "round" as const,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let preview: any = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let extraObjs: any[] = [];
          switch (tool) {
            case "line":
              preview = new fabric.Line([sx, sy, x, y], common);
              break;
            case "arrow": {
              const pathStr = buildArrowPathString(sx, sy, x, y);
              preview = new fabric.Path(pathStr, common);
              break;
            }
            case "rectangle":
              preview = new fabric.Rect({
                ...common,
                left: Math.min(sx, x),
                top: Math.min(sy, y),
                width: Math.abs(x - sx),
                height: Math.abs(y - sy),
              });
              break;
            case "circle": {
              const r = Math.hypot(x - sx, y - sy);
              preview = new fabric.Circle({
                ...common,
                left: sx,
                top: sy,
                radius: r,
                originX: "center",
                originY: "center",
              });
              break;
            }
            case "measure": {
              const measureCommon = {
                ...common,
                stroke: "#F0A500",
                strokeDashArray: [6, 4],
              };
              preview = new fabric.Line([sx, sy, x, y], measureCommon);
              // Distance label
              const dist = Math.hypot(x - sx, y - sy) * scaleFactorRef.current;
              const mx = (sx + x) / 2;
              const my = (sy + y) / 2;
              const label = new fabric.Text(
                `${dist.toFixed(1)}u`,
                {
                  left: mx,
                  top: my - 14,
                  fontSize: 12,
                  fontFamily: "monospace",
                  fill: "#F0A500",
                  selectable: false,
                  evented: false,
                  originX: "center",
                  originY: "center",
                }
              );
              extraObjs = [label];
              break;
            }
            default:
              break;
          }

          // For measure tool, also remove previous extra objects
          if (ds.previewObj?.__measureExtras) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const o of ds.previewObj.__measureExtras) canvas.remove(o);
          }

          if (preview) {
            if (extraObjs.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (preview as any).__measureExtras = extraObjs;
            }
            ds.previewObj = preview;
            canvas.add(preview);
            for (const o of extraObjs) canvas.add(o);
            canvas.requestRenderAll();
          }
        });

        // ── Mouse up: finalise pan OR finalise drawing ──────────────
        canvas.on("mouse:up", (opt) => {
          if (isPanningRef.current) {
            isPanningRef.current = false;
            canvas.selection = canEdit;
            canvas.defaultCursor = isSpaceDownRef.current ? "grab" : "default";
            return;
          }

          const ds = drawingStateRef.current;
          if (!ds.active) return;

          const evt = opt.e as MouseEvent;
          const { x: ex, y: ey } = toWorld(evt);
          const { startX: sx, startY: sy, tool, color, width, previewObj } = ds;

          // Clear preview + any measure extras
          if (previewObj) {
            canvas.remove(previewObj);
            if (previewObj.__measureExtras) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              for (const o of previewObj.__measureExtras) canvas.remove(o);
            }
          }
          drawingStateRef.current = {
            active: false,
            startX: 0,
            startY: 0,
            previewObj: null,
            tool: "select",
            color: "#00ffcc",
            width: 4,
          };
          canvas.selection = canEdit;

          // Ignore micro-clicks (no real drag)
          const dragDist = Math.hypot(ex - sx, ey - sy);
          if (dragDist < 4) {
            canvas.requestRenderAll();
            return;
          }

          // ── Measure tool: ephemeral (not persisted) ─────────────
          if (tool === "measure") {
            // Clear previous measurement
            for (const mo of measureObjectsRef.current) canvas.remove(mo);
            measureObjectsRef.current = [];

            const measureLine = new fabric.Line([sx, sy, ex, ey], {
              stroke: "#F0A500",
              strokeWidth: 2,
              strokeDashArray: [6, 4],
              fill: "transparent",
              selectable: false,
              evented: false,
              strokeLineCap: "round" as const,
            });
            const dist = dragDist * scaleFactorRef.current;
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;
            const label = new fabric.Text(
              `${dist.toFixed(1)} units`,
              {
                left: mx,
                top: my - 16,
                fontSize: 13,
                fontFamily: "monospace",
                fill: "#F0A500",
                selectable: false,
                evented: false,
                originX: "center",
                originY: "center",
              }
            );
            // Endpoint dots
            const dot1 = new fabric.Circle({
              left: sx, top: sy, radius: 3,
              fill: "#F0A500", selectable: false, evented: false,
              originX: "center", originY: "center",
            });
            const dot2 = new fabric.Circle({
              left: ex, top: ey, radius: 3,
              fill: "#F0A500", selectable: false, evented: false,
              originX: "center", originY: "center",
            });

            const objs = [measureLine, label, dot1, dot2];
            for (const o of objs) canvas.add(o);
            measureObjectsRef.current = objs;
            canvas.requestRenderAll();
            return;
          }

          // Persist & adopt
          const drawingType: DrawingType = tool as DrawingType;
          const points = [
            { x: sx, y: sy },
            { x: ex, y: ey },
          ];

          // Build a committed (selectable) version of the shape locally
          const commonCommitted = {
            stroke: color,
            strokeWidth: width,
            fill: "transparent",
            selectable: canEdit,
            evented: canEdit,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: true,
            perPixelTargetFind: true,
            strokeLineCap: "round" as const,
            strokeLineJoin: "round" as const,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let committed: any = null;
          switch (tool) {
            case "line":
              committed = new fabric.Line([sx, sy, ex, ey], commonCommitted);
              break;
            case "arrow": {
              const pathStr = buildArrowPathString(sx, sy, ex, ey);
              committed = new fabric.Path(pathStr, commonCommitted);
              break;
            }
            case "rectangle":
              committed = new fabric.Rect({
                ...commonCommitted,
                left: Math.min(sx, ex),
                top: Math.min(sy, ey),
                width: Math.abs(ex - sx),
                height: Math.abs(ey - sy),
              });
              break;
            case "circle": {
              const r = Math.hypot(ex - sx, ey - sy);
              committed = new fabric.Circle({
                ...commonCommitted,
                left: sx,
                top: sy,
                radius: r,
                originX: "center",
                originY: "center",
              });
              break;
            }
            default:
              break;
          }

          if (!committed) {
            canvas.requestRenderAll();
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (committed as any).__drawingId = ""; // pending DB id
          canvas.add(committed);
          canvas.requestRenderAll();

          // Call server action and stamp the real id on the object
          cbRef.current.onDrawingCreate
            ?.({
              drawingType,
              points,
              strokeColor: color,
              strokeWidth: width,
            })
            .then((dbId) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (committed as any).__drawingId = dbId ?? "";
            });
        });

        // ── Scroll zoom ──────────────────────────────────────────
        canvas.on("mouse:wheel", (opt) => {
          const { e } = opt;
          const delta = (e as WheelEvent).deltaY;
          let z = canvas.getZoom();
          z *= 0.999 ** delta;
          z = Math.min(Math.max(z, 0.05), 20);
          const pt = new fabric.Point(
            (e as MouseEvent).offsetX,
            (e as MouseEvent).offsetY
          );
          canvas.zoomToPoint(pt, z);
          setZoom(z);
          e.preventDefault();
          e.stopPropagation();
        });

        // ── Marker move: save on object:modified ─────────────────
        canvas.on("object:modified", (opt) => {
          if (!canEdit || !opt.target) return;
          const markerId = getMarkerId(opt.target);
          if (!markerId) return;
          const { left = 0, top = 0 } = opt.target;
          cbRef.current.onMarkerMoved?.(markerId, left, top);
        });

        // ── Background image ────────────────────────────────────
        try {
          const img = await fabric.FabricImage.fromURL(imageUrl, {
            crossOrigin: "anonymous",
          });
          if (disposed) return;

          img.set({ selectable: false, evented: false, left: 0, top: 0 });
          canvas.add(img);
          canvas.sendObjectToBack(img);
          bgImageRef.current = img;
          setImageLoaded(true);

          const iw = img.width ?? 1;
          const ih = img.height ?? 1;
          const pad = 40;
          const scale = Math.min(
            (w - pad * 2) / iw,
            (h - pad * 2) / ih,
            1
          );
          const vpx = pad + (w - pad * 2 - iw * scale) / 2;
          const vpy = pad + (h - pad * 2 - ih * scale) / 2;
          canvas.setViewportTransform([scale, 0, 0, scale, vpx, vpy]);
          canvas.requestRenderAll();
          setZoom(scale);
        } catch {
          setImageLoaded(true);
        }

        // ── Resize observer ─────────────────────────────────────
        const ro = new ResizeObserver((entries) => {
          const { width: rw, height: rh } = entries[0].contentRect;
          canvas.setDimensions({ width: rw, height: rh });
          canvas.requestRenderAll();
        });
        ro.observe(container);

        cleanupRef.current = () => {
          ro.disconnect();
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
          canvas.dispose();
        };
      }

      init();

      return () => {
        disposed = true;
        cleanupRef.current?.();
        cleanupRef.current = null;
        fabricRef.current = null;
        bgImageRef.current = null;
        gridObjectsRef.current = [];
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageUrl, mapId]);

    // ─── Load initial markers ─────────────────────────────────────────────

    useEffect(() => {
      if (!imageLoaded || markersLoadedRef.current) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      markersLoadedRef.current = true;

      const markers = initialMarkersRef.current;
      if (markers.length === 0) return;

      let active = true;

      async function loadMarkers() {
        const fabric = await import("fabric");
        if (!active || !fabricRef.current) return;
        const c = fabricRef.current;

        const imgs = await Promise.all(
          markers.map(async (m) => {
            const dataUrl = getNatoDataUrl(m.marker_type, m.affiliation);
            const img = await fabric.FabricImage.fromURL(dataUrl);
            img.set({
              left: m.x,
              top: m.y,
              originX: "center",
              originY: "center",
              selectable: canEdit,
              evented: canEdit,
              hasControls: false,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (img as any).__markerId = m.id;
            return img;
          })
        );

        if (!active || !fabricRef.current) return;
        for (const img of imgs) c.add(img);
        c.requestRenderAll();
      }

      loadMarkers();
      return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageLoaded]);

    // ─── Load initial drawings ────────────────────────────────────────────

    useEffect(() => {
      if (!imageLoaded || drawingsLoadedRef.current) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      drawingsLoadedRef.current = true;

      const drawings = initialDrawingsRef.current;
      if (drawings.length === 0) return;

      let active = true;

      async function loadDrawings() {
        const fabric = await import("fabric");
        if (!active || !fabricRef.current) return;
        const c = fabricRef.current;

        for (const d of drawings) {
          const obj = createFabricDrawing(fabric, d, canEdit);
          if (obj) c.add(obj);
        }
        c.requestRenderAll();
      }

      loadDrawings();
      return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageLoaded]);

    // ─── Grid re-render ───────────────────────────────────────────────────

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !imageLoaded) return;
      let active = true;

      async function applyGrid() {
        const fabric = await import("fabric");
        if (!active || !fabricRef.current) return;
        const c = fabricRef.current;

        for (const obj of gridObjectsRef.current) c.remove(obj);
        gridObjectsRef.current = [];

        if (gridType === "none") {
          c.requestRenderAll();
          return;
        }

        const cw = c.getWidth() * 4;
        const ch = c.getHeight() * 4;
        const offset = -c.getWidth();

        const objects =
          gridType === "square"
            ? buildSquareGrid(fabric, cw, ch, gridSize)
            : buildHexGrid(fabric, cw, ch, gridSize);

        for (const obj of objects) {
          obj.set({
            left: (obj.left ?? 0) + offset,
            top: (obj.top ?? 0) + offset,
          });
          c.add(obj);
          if (bgImageRef.current) c.moveObjectTo(obj, 1);
        }

        gridObjectsRef.current = objects;
        c.requestRenderAll();
      }

      applyGrid();
      return () => { active = false; };
    }, [gridType, gridSize, imageLoaded]);

    // ─── Drag-and-drop handlers ───────────────────────────────────────────

    const handleDragOver = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        if (!canEdit) return;
        if (e.dataTransfer.types.includes("application/x-nato-marker")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      },
      [canEdit]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        if (!canEdit) return;
        e.preventDefault();

        const raw = e.dataTransfer.getData("application/x-nato-marker");
        if (!raw) return;

        let parsed: { type: MarkerType; affiliation: MarkerAffiliation };
        try {
          parsed = JSON.parse(raw);
        } catch {
          return;
        }
        const { type, affiliation } = parsed;

        const canvas = fabricRef.current;
        const canvasEl = canvasElRef.current;
        if (!canvas || !canvasEl) return;

        // Convert client coords → canvas world coords
        const rect = canvasEl.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const vpt = canvas.viewportTransform;
        const worldX = (offsetX - vpt[4]) / vpt[0];
        const worldY = (offsetY - vpt[5]) / vpt[3];

        // Place optimistically on canvas
        async function place() {
          const fabric = await import("fabric");
          if (!fabricRef.current) return;
          const c = fabricRef.current;

          const dataUrl = getNatoDataUrl(type, affiliation);
          const img = await fabric.FabricImage.fromURL(dataUrl);
          img.set({
            left: worldX,
            top: worldY,
            originX: "center",
            originY: "center",
            selectable: true,
            evented: true,
            hasControls: false,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (img as any).__markerId = ""; // pending DB confirmation
          c.add(img);
          c.setActiveObject(img);
          c.requestRenderAll();

          // Persist and get DB id
          const dbId = (await cbRef.current.onMarkerDrop?.(
            type,
            affiliation,
            worldX,
            worldY
          )) ?? "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (img as any).__markerId = dbId;
        }

        place();
      },
      [canEdit]
    );

    // ─── Render ───────────────────────────────────────────────────────────

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <CanvasToolbar
          zoom={zoom}
          gridType={gridType}
          gridSize={gridSize}
          onZoomIn={() => {
            const c = fabricRef.current;
            if (!c) return;
            const z = Math.min(c.getZoom() * 1.2, 20);
            import("fabric").then(({ Point }) => {
              c.zoomToPoint(new Point(c.getWidth() / 2, c.getHeight() / 2), z);
              setZoom(z);
            });
          }}
          onZoomOut={() => {
            const c = fabricRef.current;
            if (!c) return;
            const z = Math.max(c.getZoom() / 1.2, 0.05);
            import("fabric").then(({ Point }) => {
              c.zoomToPoint(new Point(c.getWidth() / 2, c.getHeight() / 2), z);
              setZoom(z);
            });
          }}
          onFitView={fitView}
          onGridTypeChange={setGridTypeState}
          onGridSizeChange={setGridSizeState}
          canEdit={canEdit}
          drawTool={drawTool}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          onDrawToolChange={setDrawTool}
          onDrawColorChange={setDrawColor}
          onDrawStrokeWidthChange={setDrawStrokeWidth}
        />

        {/* Canvas container — also the drop zone */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-bg-void"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <canvas ref={canvasElRef} className="absolute inset-0" />

          {/* Icon palette overlay */}
          {palette}

          {/* Loading overlay */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-void z-10 pointer-events-none">
              <div className="text-center">
                <div
                  className="w-8 h-8 border border-accent/30 animate-spin mx-auto mb-3"
                  style={{ borderTopColor: "#00ffcc" }}
                />
                <p className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
                  Loading Map Image...
                </p>
              </div>
            </div>
          )}

          {/* Hint bar */}
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <span className="font-mono text-[9px] text-text-muted tracking-widest bg-bg-surface/80 px-2 py-0.5">
              {canEdit
                ? drawTool === "measure"
                  ? "MEASURE: CLICK+DRAG TO MEASURE DISTANCE"
                  : drawTool !== "select"
                  ? `DRAW: ${drawTool.toUpperCase()} · CLICK+DRAG · ESC TOOL = SELECT`
                  : "SCROLL: ZOOM · SPACE+DRAG: PAN · DEL: REMOVE"
                : "SCROLL: ZOOM · SPACE+DRAG / MMB: PAN"}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default TacticalCanvas;
