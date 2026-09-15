import type maplibregl from "maplibre-gl";

import type DrawLibre from "../../src/index";
import type { DrawOptions } from "../../src/index";

declare global {
  interface Window {
    map: maplibregl.Map;
    draw: DrawLibre | null;
    mapErrors: string[];
    mountDraw: (options?: DrawOptions) => void;
    unmountDraw: () => void;
    disposeDraw: () => void;
    getInstanceReturnsTheMountedControl: () => boolean;
  }
}
