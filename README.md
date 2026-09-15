# DrawLibre

A drawing tool for [MapLibre GL](https://maplibre.org/) and [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) maps. Draw linestrings (open and closed) and polygons with undo/redo, geometry breaking, and full style customization.

Works with maplibre-gl v2–v5, mapbox-gl v1–v3, and all projections.

**React users:** check out [draw-libre-react](https://github.com/UsikianLevon/draw-libre-react).

## Features

- Draw linestrings and polygons
- Close open linestrings, break closed geometries
- Undo/redo
- Remove a point with the cross button that appears when you hover or tap it
- Manual or automatic midpoint generation
- Initialize from existing GeoJSON
- Customizable controls, labels, and layer styles
- Event-driven — subscribe to point add/remove/move, mode changes, save, etc.

### Point generation modes

**Manual** — click on a line segment to insert a point:

<img src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDZscnowMHNndmtiZzcwb3Bvc2Y2b29qbHdndndndGE3Mzk5Z2Q0cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/m6lig0ZCfL45FZQo7b/giphy.gif" width="800" alt="Manual point generation">

**Auto** — midpoints are generated between every two primary points:

<img src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2VieG1rd3ZkaWt5azVhYWpqaWEwZnVybGdjYW90d2xwNWwzeWtzayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6ohjkf9L1NWUESTaQA/giphy.gif" width="800" alt="Automatic point generation">

## Installation

```bash
npm install draw-libre
```

## Quick start

```javascript
import maplibregl from "maplibre-gl";
import DrawLibre from "draw-libre";
import "draw-libre/dist/index.css";

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
});

const draw = DrawLibre.getInstance();

map.on("load", (e) => {
  e.target.addControl(draw, "top-left");
});
```

## Configuration

All options are optional.

```javascript
const draw = DrawLibre.getInstance({
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
  // See MapLibre style spec for available options.
  layersPaint: {
    onLinePoint: {}, // CircleLayerSpecification["paint"]
    firstPoint: {}, // CircleLayerSpecification["paint"]
    points: {}, // CircleLayerSpecification["paint"]
    auxiliaryPoint: {}, // CircleLayerSpecification["paint"]
    line: {}, // LineLayerSpecification["paint"]
    dynamicLine: {}, // LineLayerSpecification["paint"]; defaults to `line` + a dash pattern
    polygon: {}, // FillLayerSpecification["paint"]
    breakLine: {}, // LineLayerSpecification["paint"]
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

## Events

```javascript
import DrawLibre, { type PointAddEvent } from "draw-libre";

map.on("mdl:add", (event: PointAddEvent) => {
  console.log(event);
});
```

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
const draw = DrawLibre.getInstance(); // one shared instance, options of later calls are ignored

// Find a step or node by ID, null for an unknown ID
draw.findStepById(id: string)
draw.findNodeById(id: string)

// Get all steps as an array or a circular doubly linked list
draw.getAllSteps(type?: "array" | "linkedlist")

// Replace all steps. IDs are generated if not provided.
draw.setSteps(steps: { lat: number; lng: number; id?: string }[])

// Remove all steps, the same as clear()
draw.removeAllSteps()
```

If you hide the built-in panel, you can drive the drawing programmatically:

```javascript
draw.clear(); // remove all steps
draw.save(); // trigger save
draw.undo(e); // undo last action (the DOM event is what makes mdl:undo fire)
draw.redo(e); // redo last undone action (same for mdl:redo)
```

Check `mdl:undostackchanged` / `mdl:redostackchanged` to know when undo/redo are available.

## License

[MIT](https://opensource.org/licenses/MIT)
