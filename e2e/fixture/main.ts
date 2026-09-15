import maplibregl, { type ControlPosition } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { DrawOptions } from "../../src/index";
import { DRAW_EVENTS, serializePayload } from "../support/events";

type DrawLibreModule = typeof import("../../src/index");
type DrawLibreClass = DrawLibreModule["default"];

const params = new URLSearchParams(window.location.search);
const rawOptions = params.get("options");
const initialOptions: DrawOptions | undefined = rawOptions === null ? undefined : JSON.parse(rawOptions);
const mountOnLoad = params.get("mount") !== "0";
const fromBundle = params.get("bundle") === "dist";
const position = (params.get("position") ?? "top-left") as ControlPosition;

if (params.get("offset") === "1") {
  const holder = document.getElementById("map") as HTMLElement;
  holder.style.marginLeft = "80px";
  holder.style.marginTop = "60px";
  holder.style.width = "calc(100% - 80px)";
  holder.style.height = "calc(100% - 60px)";
}

const log = document.getElementById("event-log") as HTMLUListElement;

function record(type: string, event: Record<string, unknown>) {
  const item = document.createElement("li");
  item.dataset.event = type;
  if (event.id !== undefined) item.dataset.id = String(event.id);
  if (event.total !== undefined) item.dataset.total = String(event.total);
  item.dataset.payload = serializePayload(event);
  log.appendChild(item);
}

async function loadDrawLibre(): Promise<DrawLibreClass> {
  if (!fromBundle) return (await import("../../src/index")).default;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/dist/index.css";
  document.head.appendChild(stylesheet);

  const bundlePath = "/dist/index.js";
  const bundle = (await import(bundlePath)) as { default: DrawLibreClass };
  return bundle.default;
}

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {},
    layers: [{ id: "background", type: "background", paint: { "background-color": "#e8e8e8" } }],
  },
  center: [0, 0],
  zoom: 4,
  attributionControl: false,
  fadeDuration: 0,
});

window.map = map;
window.draw = null;
window.mapErrors = [];

map.on("error", (event) => window.mapErrors.push(event.error.message));

for (const name of DRAW_EVENTS) {
  map.on(name as never, (event: Record<string, unknown>) => record(name, event));
}

let idles = 0;

map.on("idle", () => {
  idles += 1;
  document.body.dataset.idles = String(idles);
});

map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  const DrawLibre = await loadDrawLibre();

  window.mountDraw = (options?: DrawOptions) => {
    try {
      const draw = DrawLibre.getInstance(options);
      map.addControl(draw, position);
      window.draw = draw;
    } catch (error) {
      DrawLibre.instance = null;
      window.draw = null;
      throw error;
    }
  };

  window.unmountDraw = () => {
    if (window.draw) map.removeControl(window.draw);
  };

  window.disposeDraw = () => {
    window.unmountDraw();
    DrawLibre.instance = null;
    window.draw = null;
  };

  window.getInstanceReturnsTheMountedControl = () => {
    if (!window.draw) throw new Error("the draw control is not mounted");
    const first = DrawLibre.getInstance();
    const second = DrawLibre.getInstance();
    return first === second && first === window.draw;
  };

  if (mountOnLoad) window.mountDraw(initialOptions);
  document.body.dataset.ready = "true";
});
