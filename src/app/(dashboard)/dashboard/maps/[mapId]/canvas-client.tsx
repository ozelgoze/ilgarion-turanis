"use client";

import TacticalCanvas from "@/components/canvas/tactical-canvas";
import type { GridType } from "@/components/canvas/tactical-canvas";

interface CanvasClientProps {
  mapId: string;
  imageUrl: string;
  initialGridType: GridType;
  initialGridSize: number;
}

export default function CanvasClient(props: CanvasClientProps) {
  return <TacticalCanvas {...props} />;
}
