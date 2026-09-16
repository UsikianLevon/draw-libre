import DrawLibre, {
  type BreakEvent,
  type DrawLibreControl,
  type DrawLibreEventType,
  type DrawLibreSubscription,
  type DrawOptions,
  type LatLng,
  type MapLike,
  type ModeChangeEvent,
  type PointAddEvent,
  type PointEnterEvent,
  type PointLeaveEvent,
  type PointMoveEvent,
  type PointRemoveEvent,
  type RedoEvent,
  type RedoStackChangeEvent,
  type RemoveAllEvent,
  type RequiredDrawOptions,
  type SaveEvent,
  type Step,
  type StepId,
  type UndoEvent,
  type UndoStackChangeEvent,
  type UnifiedMap,
} from "draw-libre";

declare const map: MapLike;
declare const click: MouseEvent;

const options = {
  pointGeneration: "auto",
  modes: {
    initial: "line",
    line: { closeGeometry: true, visible: true },
    polygon: { visible: true },
    breakGeometry: { visible: true },
  },
  panel: {
    size: "small",
    buttons: {
      undo: { visible: true },
      redo: { visible: true },
      delete: { visible: true },
      save: { visible: true, clearOnSave: false },
    },
  },
  locale: {
    break: "Break",
    closeLine: "Close",
    createPolygon: "Create",
    delete: "Delete",
    line: "Line",
    polygon: "Polygon",
    removePoint: "Remove point",
    save: "Save",
    undo: "Undo",
    redo: "Redo",
  },
  layersPaint: {
    line: { "line-color": "#ff0000" },
    polygon: { "fill-color": "#00ff00" },
    points: { "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 7, 5] },
  },
  dynamicLine: false,
  initial: {
    geometry: "line",
    closeGeometry: false,
    generateId: true,
    steps: [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ],
  },
} satisfies DrawOptions;

declare const required: RequiredDrawOptions;
void required;

export const draw: DrawLibre = new DrawLibre(options);

const control: DrawLibreControl = draw;
const legacyMap: UnifiedMap = map;
void control;
void legacyMap;

const all = draw.getAllSteps("array");
if (Array.isArray(all)) {
  const first: Step | undefined = all[0];
  void first;
}

const found: Step | null = draw.findStepById("some-id" as StepId);
void found;

draw.setSteps([{ lat: 1, lng: 2 }] satisfies LatLng[]);
draw.setSteps([{ id: "a", lat: 1, lng: 2 }] satisfies Step[]);
draw.undo(click);
draw.redo(click);
draw.clear();
draw.save();
draw.removeAllSteps();

const coordinates: LatLng = { lat: 0, lng: 0 };
const mode = { geometry: "line", closedGeometry: false } as const;
const steps: Step[] = [{ id: "a", lat: 0, lng: 0, isAuxiliary: false }];

({ type: "mdl:add", id: "a", coordinates, total: 1, timestamp: 0, target: map, mode }) satisfies PointAddEvent;
({ type: "mdl:pointremove", id: "a", coordinates, total: 1, timestamp: 0, target: map }) satisfies PointRemoveEvent;
({ type: "mdl:pointenter", id: "a", coordinates, total: 1, timestamp: 0, target: map }) satisfies PointEnterEvent;
({ type: "mdl:pointleave", id: "a", coordinates, total: 1, timestamp: 0, target: map }) satisfies PointLeaveEvent;
({
  type: "mdl:moveend",
  id: "a",
  start_coordinates: coordinates,
  end_coordinates: coordinates,
  total: 1,
  timestamp: 0,
  target: map,
}) satisfies PointMoveEvent;
({
  type: "mdl:undo",
  id: "a",
  coordinates,
  total: 1,
  timestamp: 0,
  target: map,
  originalEvent: click,
}) satisfies UndoEvent;
({ type: "mdl:undo", total: 0, timestamp: 0, target: map }) satisfies UndoEvent;
({ type: "mdl:redo", id: "a", coordinates, total: 1, timestamp: 0, target: map }) satisfies RedoEvent;
({ type: "mdl:redo", total: 0, timestamp: 0, target: map }) satisfies RedoEvent;
({ type: "mdl:removeall", originalEvent: click, target: map }) satisfies RemoveAllEvent;
({ type: "mdl:removeall", target: map }) satisfies RemoveAllEvent;
({ type: "mdl:save", timestamp: 0, steps, mode, target: map }) satisfies SaveEvent;
({ type: "mdl:save", timestamp: 0, steps, mode, target: map, originalEvent: click }) satisfies SaveEvent;
({ type: "mdl:modechanged", mode: "break", target: map }) satisfies ModeChangeEvent;
({ type: "mdl:modechanged", mode: null, target: map }) satisfies ModeChangeEvent;
({ type: "mdl:undostackchanged", length: 2, target: map }) satisfies UndoStackChangeEvent;
({ type: "mdl:redostackchanged", length: 0, target: map }) satisfies RedoStackChangeEvent;
({ type: "mdl:break", target: map }) satisfies BreakEvent;

const names: Record<keyof DrawLibreEventType, true> = {
  "mdl:add": true,
  "mdl:pointremove": true,
  "mdl:pointenter": true,
  "mdl:pointleave": true,
  "mdl:moveend": true,
  "mdl:undo": true,
  "mdl:redo": true,
  "mdl:removeall": true,
  "mdl:save": true,
  "mdl:break": true,
  "mdl:modechanged": true,
  "mdl:undostackchanged": true,
  "mdl:redostackchanged": true,
};
void names;

const added: DrawLibreSubscription = draw.on("mdl:add", (event) => {
  const id: StepId = event.id;
  const total: number = event.total;
  const geometry: "line" | "polygon" | null = event.mode.geometry;
  const target: MapLike = event.target;
  void [id, total, geometry, target];
  // @ts-expect-error
  void event.steps;
});
added.unsubscribe();

const saved: DrawLibreSubscription = draw.once("mdl:save", (event) => {
  const savedSteps: Step[] = event.steps;
  void savedSteps;
});
saved.unsubscribe();

const onModeChange = (event: ModeChangeEvent) => {
  void event.mode;
};
draw.on("mdl:modechanged", onModeChange);
draw.off("mdl:modechanged", onModeChange);

// @ts-expect-error
draw.on("mdl:unknown", () => {});

// @ts-expect-error
draw.on("mdl:modechanged", (event: PointAddEvent) => void event);

interface MapboxOnlyCirclePaint {
  "circle-emissive-strength": number;
}
declare const mapboxOnlyCirclePaint: MapboxOnlyCirclePaint;
new DrawLibre({ layersPaint: { points: mapboxOnlyCirclePaint } });
