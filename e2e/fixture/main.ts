import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import DrawLibre from "../../src/index";

declare global {
  interface Window {
    map: maplibregl.Map;
    draw: DrawLibre | null;
  }
}

const RECORDED_EVENTS = [
  "mdl:add",
  "mdl:pointremove",
  "mdl:moveend",
  "mdl:pointenter",
  "mdl:pointleave",
  "mdl:undo",
  "mdl:redo",
  "mdl:removeall",
  "mdl:save",
  "mdl:modechanged",
];

const params = new URLSearchParams(window.location.search);
const useAutoPreset = params.get("preset") === "auto";

if (params.get("offset") === "1") {
  const holder = document.getElementById("map") as HTMLElement;
  holder.style.marginLeft = "80px";
  holder.style.marginTop = "60px";
  holder.style.width = "calc(100% - 80px)";
  holder.style.height = "calc(100% - 60px)";
}
const log = document.getElementById("event-log") as HTMLUListElement;

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

const draw = DrawLibre.getInstance({
  modes: { initial: "line" },
  pointGeneration: useAutoPreset ? "auto" : "manual",
});
window.draw = draw;

function record(type: string, event: Record<string, unknown>) {
  const item = document.createElement("li");
  item.dataset.event = type;
  if (event.id !== undefined) item.dataset.id = String(event.id);
  if (event.total !== undefined) item.dataset.total = String(event.total);
  log.appendChild(item);
}

map.on("load", () => {
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(draw as unknown as maplibregl.IControl, "top-left");

  for (const name of RECORDED_EVENTS) {
    map.on(name as never, (event: Record<string, unknown>) => record(name, event));
  }

  document.body.dataset.ready = "true";
});

let idles = 0;

map.on("idle", () => {
  idles += 1;
  document.body.dataset.idles = String(idles);
});
