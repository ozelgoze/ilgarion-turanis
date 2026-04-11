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
import type { TacticalMarker, MarkerType, MarkerAffiliation } from "@/types/database";

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
}

export type GridType = "none" | "square" | "hex";

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

    // Keep callbacks in a ref so event handlers always see the latest version
    const cbRef = useRef({ onMarkerDrop, onMarkerMoved, onMarkerDeleted });
    useEffect(() => {
      cbRef.current = { onMarkerDrop, onMarkerMoved, onMarkerDeleted };
    }, [onMarkerDrop, onMarkerMoved, onMarkerDeleted]);

    const [gridType, setGridTypeState] = useState<GridType>(initialGridType);
    const [gridSize, setGridSizeState] = useState(initialGridSize);
    const [zoom, setZoom] = useState(1);
    const [imageLoaded, setImageLoaded] = useState(false);

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
      }),
      [fitView, canEdit]
    );

    // ─── Canvas initialisation ────────────────────────────────────────────

    useEffect(() => {
      if (!canvasElRef.current || !containerRef.current) return;
      let disposed = false;
      markersLoadedRef.current = false;

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

        // ── Keyboard: pan (Space) + delete marker ──────────────────
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
            if (!markerId) return;
            canvas.remove(active);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            cbRef.current.onMarkerDeleted?.(markerId);
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

        // ── Mouse pan ────────────────────────────────────────────
        canvas.on("mouse:down", (opt) => {
          const evt = opt.e as MouseEvent;
          if (evt.button === 1 || isSpaceDownRef.current) {
            isPanningRef.current = true;
            lastPosRef.current = { x: evt.clientX, y: evt.clientY };
            canvas.defaultCursor = "grabbing";
            canvas.selection = false;
            evt.preventDefault();
          }
        });

        canvas.on("mouse:move", (opt) => {
          if (!isPanningRef.current) return;
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
        });

        canvas.on("mouse:up", () => {
          isPanningRef.current = false;
          canvas.selection = canEdit;
          canvas.defaultCursor = isSpaceDownRef.current ? "grab" : "default";
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
                ? "SCROLL: ZOOM · SPACE+DRAG: PAN · DEL: REMOVE MARKER"
                : "SCROLL: ZOOM · SPACE+DRAG / MMB: PAN"}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default TacticalCanvas;
