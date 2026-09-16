import type { ControlPosition } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type DrawLibreInstance from "../../src/index";
import type { DrawLibreSubscription, DrawOptions } from "../../src/index";
import { DRAW_EVENTS, serializePayload, type DrawEventName, type EventChannel } from "../support/events";
import { loadMaplibreWorker, maplibregl } from "../support/maplibre";

type DrawLibreModule = typeof import("../../src/index");
type DrawLibreClass = DrawLibreModule["default"];

interface Probe {
  draw: DrawLibreInstance;
  name: DrawEventName;
  count: number;
  listener: () => void;
  subscription: DrawLibreSubscription;
}

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

function record(channel: EventChannel, type: string, event: object) {
  const fields = event as Record<string, unknown>;
  const item = document.createElement("li");
  item.dataset.channel = channel;
  item.dataset.event = type;
  if (fields.id !== undefined) item.dataset.id = String(fields.id);
  if (fields.total !== undefined) item.dataset.total = String(fields.total);
  item.dataset.targetIsMap = String(fields.target === map);
  item.dataset.payload = serializePayload(fields);
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
  fadeDuration: 0,
});

window.map = map;
window.draw = null;
window.mapErrors = [];

map.on("error", (event) => window.mapErrors.push(event.error.message));

for (const name of DRAW_EVENTS) {
  map.on(name as never, (event: Record<string, unknown>) => record("map", name, event));
}

let idles = 0;

map.on("idle", () => {
  idles += 1;
  document.body.dataset.idles = String(idles);
});

map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  const DrawLibre = await loadDrawLibre();

  const logged = new WeakSet<DrawLibreInstance>();
  const logDrawChannel = (draw: DrawLibreInstance) => {
    if (logged.has(draw)) return;
    logged.add(draw);
    for (const name of DRAW_EVENTS) {
      draw.on(name, (event) => record("draw", name, event));
    }
  };

  window.mountDraw = (options?: DrawOptions) => {
    try {
      const draw = DrawLibre.getInstance(options);
      logDrawChannel(draw);
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

  const probes = new Map<string, Probe>();

  const probeOf = (id: string) => {
    const probe = probes.get(id);
    if (!probe) throw new Error(`there is no probe ${id}`);
    return probe;
  };

  const addProbe = (name: DrawEventName, once: boolean) => {
    const draw = window.draw ?? DrawLibre.getInstance(initialOptions);
    const probe: Probe = {
      draw,
      name,
      count: 0,
      listener: () => (probe.count += 1),
      subscription: { unsubscribe: () => {} },
    };
    probe.subscription = once ? draw.once(name, probe.listener) : draw.on(name, probe.listener);
    const id = `probe-${probes.size}`;
    probes.set(id, probe);
    return id;
  };

  window.probeDraw = {
    on: (name) => addProbe(name, false),
    once: (name) => addProbe(name, true),
    off: (id) => {
      const probe = probeOf(id);
      probe.draw.off(probe.name, probe.listener);
    },
    unsubscribe: (id) => probeOf(id).subscription.unsubscribe(),
    count: (id) => probeOf(id).count,
  };

  window.reentrancy = {
    removeControlOnSave: () => {
      const draw = window.draw;
      if (!draw) throw new Error("the draw control is not mounted");
      const seen = { map: 0, draw: 0 };
      const onMap = () => {
        seen.map += 1;
        map.removeControl(draw);
      };
      const subscription = draw.on("mdl:save", () => {
        seen.draw += 1;
      });

      map.on("mdl:save" as never, onMap);
      draw.save();
      map.off("mdl:save" as never, onMap);
      subscription.unsubscribe();

      return seen;
    },
    clearOnSave: () => {
      const draw = window.draw;
      if (!draw) throw new Error("the draw control is not mounted");
      const order: { map: DrawEventName[]; draw: DrawEventName[] } = { map: [], draw: [] };
      const recorded: { name: DrawEventName; listener: () => void }[] = [];
      const subscriptions: DrawLibreSubscription[] = [];

      for (const name of ["mdl:save", "mdl:removeall"] as DrawEventName[]) {
        const listener = () => order.map.push(name);
        recorded.push({ name, listener });
        map.on(name as never, listener);
        subscriptions.push(draw.on(name, () => order.draw.push(name)));
      }

      const clear = () => draw.clear();
      map.on("mdl:save" as never, clear);
      draw.save();
      map.off("mdl:save" as never, clear);
      for (const entry of recorded) map.off(entry.name as never, entry.listener);
      for (const subscription of subscriptions) subscription.unsubscribe();

      return order;
    },
  };

  if (mountOnLoad) window.mountDraw(initialOptions);
  document.body.dataset.ready = "true";
});
