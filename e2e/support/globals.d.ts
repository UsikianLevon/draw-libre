import type * as maplibregl from "maplibre-gl";

import type DrawLibre from "../../src/index";
import type { DrawOptions } from "../../src/index";
import type { DrawEventName } from "./events";

declare global {
  interface Window {
    map: maplibregl.Map;
    draw: DrawLibre | null;
    mapErrors: string[];
    mountDraw: (options?: DrawOptions) => void;
    unmountDraw: () => void;
    disposeDraw: () => void;
    getInstanceReturnsTheMountedControl: () => boolean;
    probeDraw: {
      on: (name: DrawEventName) => string;
      once: (name: DrawEventName) => string;
      off: (id: string) => void;
      unsubscribe: (id: string) => void;
      count: (id: string) => number;
    };
    reentrancy: {
      removeControlOnSave: () => { map: number; draw: number };
      clearOnSave: () => { map: DrawEventName[]; draw: DrawEventName[] };
    };
  }
}
