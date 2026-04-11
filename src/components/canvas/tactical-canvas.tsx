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

export interface TacticalCanvasRef {
  fitView: () => void;
  setGridType: (type: GridType) => void;
  setGridSize: (size: number) => void;
}

export type GridType = "none" | "square" | "hex";

interface TacticalCanvasProps {
  mapId: string;
  imageUrl: string;
  initialGridType?: GridType;
  initialGridSize?: number;
}

const GRID_COLOR = "rgba(0, 255, 204, 0.12)";
const GRID_STROKE = 0.5;
const CANVAS_BG = "#060708";

// ─── Grid Drawing Helpers ────────────────────────────────────────────────────

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
    void Point; // suppress unused import warning
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

// ─── Component ───────────────────────────────────────────────────────────────

// eslint-disable-next-line react/display-name
const TacticalCanvas = forwardRef<TacticalCanvasRef, TacticalCanvasProps>(
  function TacticalCanvas(
    { mapId, imageUrl, initialGridType = "none", initialGridSize = 50 },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricCanvasType | null>(null);
    // Use any[] to avoid complex Fabric type gymnastics for the grid objects array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridObjectsRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bgImageRef = useRef<any>(null);
    const isPanningRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const isSpaceDownRef = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    const [gridType, setGridTypeState] = useState<GridType>(initialGridType);
    const [gridSize, setGridSizeState] = useState(initialGridSize);
    const [zoom, setZoom] = useState(1);
    const [imageLoaded, setImageLoaded] = useState(false);

    // ─── Fit-view ──────────────────────────────────────────────────────

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
      }),
      [fitView]
    );

    // ─── Canvas initialisation ─────────────────────────────────────────

    useEffect(() => {
      if (!canvasElRef.current || !containerRef.current) return;
      let disposed = false;

      async function init() {
        const fabric = await import("fabric");
        if (disposed) return;

        const container = containerRef.current!;
        const { clientWidth: w, clientHeight: h } = container;

        const canvas = new fabric.Canvas(canvasElRef.current!, {
          width: w,
          height: h,
          backgroundColor: CANVAS_BG,
          selection: false,
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;

        // ── Keyboard pan ──────────────────────────────────────────

        const onKeyDown = (e: KeyboardEvent) => {
          if (e.code === "Space" && !isSpaceDownRef.current) {
            isSpaceDownRef.current = true;
            canvas.defaultCursor = "grab";
            canvas.requestRenderAll();
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

        // ── Mouse pan ─────────────────────────────────────────────

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
          canvas.selection = true;
          canvas.defaultCursor = isSpaceDownRef.current ? "grab" : "default";
        });

        // ── Scroll-wheel zoom ─────────────────────────────────────

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

        // ── Load background image ─────────────────────────────────

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

          // Fit on load
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

        // ── Resize observer ────────────────────────────────────────

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

    // ─── Grid re-render ────────────────────────────────────────────────

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !imageLoaded) return;
      let active = true;

      async function applyGrid() {
        const fabric = await import("fabric");
        if (!active || !fabricRef.current) return;
        const c = fabricRef.current;

        // Remove old grid
        for (const obj of gridObjectsRef.current) c.remove(obj);
        gridObjectsRef.current = [];

        if (gridType === "none") {
          c.requestRenderAll();
          return;
        }

        // Build large enough to cover canvas at any pan position
        const cw = c.getWidth() * 4;
        const ch = c.getHeight() * 4;
        const offset = -c.getWidth();

        const objects =
          gridType === "square"
            ? buildSquareGrid(fabric, cw, ch, gridSize)
            : buildHexGrid(fabric, cw, ch, gridSize);

        for (const obj of objects) {
          obj.set({ left: (obj.left ?? 0) + offset, top: (obj.top ?? 0) + offset });
          c.add(obj);
          // Keep grid above bg but below markers: index 1
          if (bgImageRef.current) c.moveObjectTo(obj, 1);
        }

        gridObjectsRef.current = objects;
        c.requestRenderAll();
      }

      applyGrid();
      return () => { active = false; };
    }, [gridType, gridSize, imageLoaded]);

    // ─── Render ────────────────────────────────────────────────────────

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fabric = (window as any).__fabric__;
            void fabric;
            import("fabric").then(({ Point }) => {
              c.zoomToPoint(
                new Point(c.getWidth() / 2, c.getHeight() / 2),
                z
              );
              setZoom(z);
            });
          }}
          onZoomOut={() => {
            const c = fabricRef.current;
            if (!c) return;
            const z = Math.max(c.getZoom() / 1.2, 0.05);
            import("fabric").then(({ Point }) => {
              c.zoomToPoint(
                new Point(c.getWidth() / 2, c.getHeight() / 2),
                z
              );
              setZoom(z);
            });
          }}
          onFitView={fitView}
          onGridTypeChange={setGridTypeState}
          onGridSizeChange={setGridSizeState}
        />

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-bg-void">
          <canvas ref={canvasElRef} className="absolute inset-0" />

          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-void z-10">
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

          <div className="absolute bottom-3 right-3 pointer-events-none">
            <span className="font-mono text-[9px] text-text-muted tracking-widest bg-bg-surface/80 px-2 py-0.5">
              SCROLL: ZOOM · SPACE+DRAG / MMB: PAN
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default TacticalCanvas;
