import type * as MaplibreTypes from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import DrawLibre from "../src/index";
import type { DrawLibreEventType } from "../src/index";
import type { DrawOptions, Initial, Step } from "../src/app/types/index";
import type { Mode } from "../src/components/map/mode/types";
import { loadMaplibreWorker, maplibregl } from "../e2e/support/maplibre";

declare global {
  interface Window {
    map: MaplibreTypes.Map;
    draw: DrawLibre | null;
  }
}

const STORAGE_KEY = "draw-libre-debug";
const LOG_LIMIT = 200;

const RECORDED_EVENTS: (keyof DrawLibreEventType)[] = [
  "mdl:add",
  "mdl:pointremove",
  "mdl:moveend",
  "mdl:pointenter",
  "mdl:pointleave",
  "mdl:undo",
  "mdl:redo",
  "mdl:undostackchanged",
  "mdl:redostackchanged",
  "mdl:removeall",
  "mdl:save",
  "mdl:modechanged",
  "mdl:break",
];

const CHECKBOXES = [
  "mode-line",
  "close-geometry",
  "mode-polygon",
  "mode-break",
  "btn-undo",
  "btn-redo",
  "btn-delete",
  "btn-save",
  "clear-on-save",
  "dynamic-line",
];

const SELECTS = ["initial-mode", "panel-size", "initial-geometry"];

const LINE_STEPS: Step[] = [
  { id: "debug-a", lat: 10, lng: -10 },
  { id: "debug-b", lat: 20, lng: 0 },
  { id: "debug-c", lat: 10, lng: 10 },
];

const POLYGON_STEPS: Step[] = [...LINE_STEPS, { id: "debug-d", lat: 10, lng: -10 }];

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`debug page is missing #${id}`);
  }
  return node as T;
};

const checked = (id: string) => byId<HTMLInputElement>(id).checked;
const selected = (id: string) => byId<HTMLSelectElement>(id).value;
const generation = () => document.querySelector<HTMLInputElement>('input[name="generation"]:checked')?.value;

const log = byId<HTMLUListElement>("log");

function initialGeometry(): Initial | null {
  const kind = selected("initial-geometry");
  if (kind === "line") {
    return { steps: LINE_STEPS, geometry: "line", closeGeometry: false };
  }
  if (kind === "polygon") {
    return { steps: POLYGON_STEPS, geometry: "polygon", closeGeometry: true };
  }
  return null;
}

function readOptions(): DrawOptions {
  const initialMode = selected("initial-mode");
  return {
    pointGeneration: generation() === "auto" ? "auto" : "manual",
    panel: {
      size: selected("panel-size") as "small" | "medium" | "large",
      buttons: {
        undo: { visible: checked("btn-undo") },
        redo: { visible: checked("btn-redo") },
        delete: { visible: checked("btn-delete") },
        save: { visible: checked("btn-save"), clearOnSave: checked("clear-on-save") },
      },
    },
    modes: {
      initial: initialMode === "none" ? null : (initialMode as Mode),
      line: { visible: checked("mode-line"), closeGeometry: checked("close-geometry") },
      polygon: { visible: checked("mode-polygon") },
      breakGeometry: { visible: checked("mode-break") },
    },
    dynamicLine: checked("dynamic-line"),
    initial: initialGeometry(),
  };
}

function saveState() {
  const state: Record<string, string | boolean> = { generation: generation() ?? "manual" };
  for (const id of CHECKBOXES) {
    state[id] = checked(id);
  }
  for (const id of SELECTS) {
    state[id] = selected(id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const state = JSON.parse(raw) as Record<string, string | boolean | undefined>;
    for (const id of CHECKBOXES) {
      const stored = state[id];
      if (typeof stored === "boolean") {
        byId<HTMLInputElement>(id).checked = stored;
      }
    }
    for (const id of SELECTS) {
      const stored = state[id];
      if (typeof stored === "string") {
        byId<HTMLSelectElement>(id).value = stored;
      }
    }
    const radio = document.querySelector<HTMLInputElement>(`input[name="generation"][value="${state.generation}"]`);
    if (radio) {
      radio.checked = true;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function summarize(event: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof event.id === "string") {
    parts.push(`id=${event.id.slice(0, 8)}`);
  }
  if (event.total !== undefined) {
    parts.push(`total=${String(event.total)}`);
  }
  if (typeof event.mode === "string") {
    parts.push(`mode=${event.mode}`);
  }
  if (event.mode && typeof event.mode === "object") {
    const mode = event.mode as { geometry?: unknown; closedGeometry?: unknown };
    parts.push(`geometry=${String(mode.geometry)}`, `closed=${String(mode.closedGeometry)}`);
  }
  if (Array.isArray(event.steps)) {
    parts.push(`steps=${event.steps.length}`);
  }
  return parts.join(" ");
}

function record(name: string, event: Record<string, unknown>) {
  const item = document.createElement("li");
  const stamp = document.createElement("time");
  stamp.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const label = document.createElement("b");
  label.textContent = name;
  item.append(stamp, " ", label, summarize(event));
  log.prepend(item);
  while (log.childElementCount > LOG_LIMIT) {
    log.lastElementChild?.remove();
  }
}

await loadMaplibreWorker();

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
});

window.map = map;

let draw: DrawLibre | null = null;

function mount() {
  if (draw) {
    map.removeControl(draw);
  }
  draw = new DrawLibre(readOptions());
  for (const name of RECORDED_EVENTS) {
    draw.on(name, (event) => record(name, { ...event }));
  }
  map.addControl(draw, "top-left");
  window.draw = draw;
}

map.on("load", () => {
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  restoreState();
  mount();
});

byId("side").addEventListener("change", () => {
  saveState();
  mount();
});

byId("reset").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

byId("clear-log").addEventListener("click", () => {
  log.replaceChildren();
});
