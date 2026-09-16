import type * as maplibregl from "maplibre-gl";

import type DrawLibre from "../../src/index";
import type { DrawOptions } from "../../src/index";
import type { DrawEventName } from "./events";

declare global {
  interface Window {
    map: maplibregl.Map;
    draw: DrawLibre | null;
    mapErrors: string[];
    createDraw: (options?: DrawOptions) => DrawLibre;
    remountDraw: () => void;
    mountDraw: (options?: DrawOptions) => void;
    unmountDraw: () => void;
    disposeDraw: () => void;
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
    lifecycleProbe: {
      secondControlOnSameMap: () => string | null;
      secondControlOnOtherMap: () => string | null;
      sameControlTwice: () => string | null;
      addFromModeChanged: () => string | null;
      removeFromModeChanged: () => string | null;
      throwFromModeChanged: () => string | null;
      removeForeignControl: () => void;
      callBeforeMount: (method: string) => string | null;
    };
  }
}
