# DrawLibre

### [LIVE DEMO](https://www.drawlibre.dev/)

A drawing tool for [MapLibre GL](https://maplibre.org/) and [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) maps. Draw linestrings (open and closed) and polygons with undo/redo, geometry breaking, and full style customization.

Works with maplibre-gl v2–v6, mapbox-gl v1–v3, and all projections.

In the [playground](https://www.drawlibre.dev/) you can flip every option on a live map, watch the events fire, and copy the generated code.

**React users:** check out [draw-libre-react](https://github.com/UsikianLevon/draw-libre-react).

## Features

- Draw linestrings and polygons
- Close open linestrings, break closed geometries
- Undo/redo
- Remove a point with the cross button that appears when you hover or tap it
- Midpoints: manual (click on a segment to insert a point) or auto (generated between every two points)
- Initialize from existing GeoJSON
- Customizable controls, labels, and layer styles
- Event-driven: subscribe to point add/remove/move, mode changes, save, etc.

## Installation

```bash
npm install draw-libre
```

## Quick start

```javascript
import * as maplibregl from "maplibre-gl";
import DrawLibre from "draw-libre";
import "draw-libre/dist/index.css";

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
});

const draw = new DrawLibre();

map.on("load", (e) => {
  e.target.addControl(draw, "top-left");
});
```

## Configuration

All options are optional. You can click a config together in the [playground](https://www.drawlibre.dev/) and copy the result from the Code tab.

```javascript
const draw = new DrawLibre({
  // "manual" (default) — click on a segment to add a point
  // "auto" — midpoints are generated automatically
  pointGeneration: "manual",

  modes: {
    initial: null, // starting mode: null | "line" | "polygon"
    breakGeometry: { visible: true },
    line: {
      closeGeometry: true, // allow closing a linestring
      visible: true,
    },
    polygon: { visible: true },
  },

  panel: {
    size: "medium", // "small" | "medium" | "large"
    // Every button is hidden by default and the panel appears only when at least one is visible: true
    buttons: {
      delete: { visible: true },
      redo: { visible: true },
      undo: { visible: true },
      save: {
        clearOnSave: true, // clear drawing after save
        visible: true,
      },
    },
  },

  locale: {
    break: "Split",
    closeLine: "Close the line",
    createPolygon: "Create a polygon",
    delete: "Delete all",
    line: "Line",
    polygon: "Polygon",
    removePoint: "Remove point",
    save: "Save",
    undo: "Undo",
    redo: "Redo",
  },

  // Override layer paint properties.
  // See MapLibre style spec for available options. Mapbox-only paint properties are accepted too.
  layersPaint: {
    onLinePoint: {}, // CircleLayerSpecification["paint"]
    firstPoint: {}, // CircleLayerSpecification["paint"]
    firstPointClosable: {}, // CircleLayerSpecification["paint"] drawn over firstPoint while a click on it would close the geometry.
    points: {}, // CircleLayerSpecification["paint"]
    auxiliaryPoint: {}, // CircleLayerSpecification["paint"]
    line: {}, // LineLayerSpecification["paint"]
    dynamicLine: {}, // LineLayerSpecification["paint"]; defaults to `line` + a dash pattern
    polygon: {}, // FillLayerSpecification["paint"]
    breakLine: {}, // LineLayerSpecification["paint"]
  },

  // Override layer layout properties, same keys as layersPaint except firstPointClosable.
  // visibility is not accepted, the library toggles it. Hit areas for clicks are not affected.
  layersLayout: {
    onLinePoint: {}, // CircleLayerSpecification["layout"] without visibility
    firstPoint: {}, // CircleLayerSpecification["layout"] without visibility
    points: {}, // CircleLayerSpecification["layout"] without visibility
    auxiliaryPoint: {}, // CircleLayerSpecification["layout"] without visibility
    line: {}, // LineLayerSpecification["layout"] without visibility
    dynamicLine: {}, // LineLayerSpecification["layout"] without visibility; defaults to `line`
    polygon: {}, // FillLayerSpecification["layout"] without visibility
    breakLine: {}, // LineLayerSpecification["layout"] without visibility
  },

  // Show a dynamic line following the cursor after placing the first point.
  // Always false on devices without hover, such as touch screens.
  dynamicLine: true,

  // Initialize with existing geometry
  initial: {
    geometry: "line", // "line" | "polygon"
    // true draws a closed shape: the first and last steps must match, with at least three different points.
    // A polygon with false starts as an open line in polygon mode; a click on its first point closes and fills it.
    closeGeometry: false,
    generateId: true, // generate IDs for steps without one; with false every step needs an id
    steps: [
      // { id?: string, lat: number, lng: number }
      { lat: 40, lng: 30 },
      { lat: 31, lng: 21 },
      { lat: 35, lng: 25 },
    ],
  },
});
```

### Layer styling examples

Round line joins and caps, the dynamic line follows `line` unless it gets its own layout:

```javascript
new DrawLibre({
  layersLayout: {
    line: { "line-join": "round", "line-cap": "round" },
  },
});
```

A blue highlight instead of the red ring on the first point while the geometry can be closed:

```javascript
new DrawLibre({
  layersPaint: {
    firstPointClosable: {
      "circle-stroke-color": "#2563EB",
      "circle-radius": 8,
    },
  },
});
```

## Events

```javascript
const draw = new DrawLibre();

const subscription = draw.on("mdl:add", (event) => {
  console.log(event.id, event.coordinates);
});

// later
subscription.unsubscribe();

draw.once("mdl:save", (event) => {
  console.log(event.steps);
});

const onModeChange = (event) => console.log(event.mode);
draw.on("mdl:modechanged", onModeChange);
draw.off("mdl:modechanged", onModeChange);
```

Listeners can be added before `map.addControl(draw)` and keep working after `map.removeControl(draw)` when the same instance is added again. In TypeScript every event name and payload is typed, `DrawLibreEventType` maps each name to its payload type.

If a listener throws, delivery of that event stops there: later listeners do not run, the instance channel does not receive it when the throw came from a map listener, and an event fired from inside a listener is dropped. The error reaches the call that triggered the event.

The same events are also fired on the map, so `map.on("mdl:add", …)` keeps working with every supported version. With maplibre-gl v6 the map typings accept only built-in event names, so in TypeScript use `draw.on`.

| Event                  | Type                   | Description              |
| ---------------------- | ---------------------- | ------------------------ |
| `mdl:add`              | `PointAddEvent`        | Point added              |
| `mdl:pointremove`      | `PointRemoveEvent`     | Point removed            |
| `mdl:pointenter`       | `PointEnterEvent`      | Cursor entered a point   |
| `mdl:pointleave`       | `PointLeaveEvent`      | Cursor left a point      |
| `mdl:moveend`          | `PointMoveEvent`       | Point drag finished      |
| `mdl:undo`             | `UndoEvent`            | Undo triggered           |
| `mdl:redo`             | `RedoEvent`            | Redo triggered           |
| `mdl:removeall`        | `RemoveAllEvent`       | All points deleted       |
| `mdl:save`             | `SaveEvent`            | Save triggered           |
| `mdl:break`            | `BreakEvent`           | Line split in break mode |
| `mdl:modechanged`      | `ModeChangeEvent`      | Drawing mode changed     |
| `mdl:undostackchanged` | `UndoStackChangeEvent` | Undo stack updated       |
| `mdl:redostackchanged` | `RedoStackChangeEvent` | Redo stack updated       |

## Methods

```javascript
const draw = new DrawLibre();

// Find a step or node by ID, null for an unknown ID
draw.findStepById(id: string)
draw.findNodeById(id: string)

// Get all steps as an array or a circular doubly linked list
draw.getAllSteps(type?: "array" | "linkedlist")

// Replace all steps. IDs are generated if not provided.
draw.setSteps(steps: { lat: number; lng: number; id?: string }[])

// Remove all steps, an alias of clear()
draw.removeAllSteps()
```

The built-in panel is off by default. Without it you can drive the drawing programmatically:

```javascript
draw.undo(); // undo last action, pass a DOM event to forward it as originalEvent
draw.redo(); // redo last undone action, same for the event
draw.clear(); // remove all steps
draw.save(); // trigger save
```

Check `mdl:undostackchanged` / `mdl:redostackchanged` to know when undo/redo are available.

## One control at a time

Only one `DrawLibre` control can be mounted per loaded copy of the library, including across different maps.
Remove the current control before adding another.

Adding or removing a control from a listener running during `addControl` or `removeControl` throws.
Removing it from a later event, such as `mdl:save`, is supported.

Every state method — `setSteps`, `getAllSteps`, `findStepById`, `findNodeById`, `undo`, `redo`, `clear`,
`save`, `removeAllSteps` — throws before the control is added to a map and after it is removed. `on`, `once`
and `off` work before `addControl` and keep working across a remove and add cycle.

### Recovery after a failed mount

Add the control after the map style has loaded. `addSource` throws while the style is still loading, and that
is a normal reason for a mount to fail.

When a mount fails, the control removes what it created, releases the guard and rethrows the error, so a new
`addControl` is allowed. If a part of the control did not finish setting itself up, some of its map handlers or
DOM nodes may survive. Reload the page when you need to be sure nothing is left over.

Once a control is mounted, the guard is released only by `removeControl`. `map.remove()` calls `onRemove` on
every control, so destroying a map frees it, but dropping a map reference without calling `map.remove()` leaves
the guard held and no new `DrawLibre` can be mounted on that page.

## TypeScript

The type declarations do not import maplibre-gl or mapbox-gl, `map.addControl(draw)` type-checks with both. With mapbox-gl v3 and `skipLibCheck: false`, install `@types/geojson`, the mapbox-gl typings need it.

`event.target` and `UnifiedMap` are typed as `MapLike`. Cast them to the `Map` type of your engine to call its methods, for example `event.target as maplibregl.Map`.

## License

[MIT](https://opensource.org/licenses/MIT)
