<section >
<h1>DrawLibre</h1>
<img width=600 alt="GIF" src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDZscnowMHNndmtiZzcwb3Bvc2Y2b29qbHdndndndGE3Mzk5Z2Q0cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/m6lig0ZCfL45FZQo7b/giphy.gif" />
</section>

## Features

- Draw linestrings (including closed ones) and polygons
- Compatible with maplibre-gl.js and mapbox-gl.js (currently supports Mercator projection only)
- Customizable UI and controls
- Event-driven architecture for easy integration

## Installation

```bash
npm install draw-libre
```

## Quick Start

```javascript
import maplibregl from "maplibre-gl";
import DrawLibre from "draw-libre";
import "draw-libre/dist/index.css";

const map = new maplibregl.Map({
  container: ...,
  style: ...,
});

const draw = DrawLibre.getInstance();

map.on("load", (event) => {
  event.target.addControl(draw, "top-left");
});
```

## API

### Configuration

```javascript
const draw = DrawLibre.getInstance({
  modes: {
    initial: null, // default value; can be "line" or "polygon". Initial mode for drawing
    breakGeometry: { visible: true }, // Controls visibility of the break geometry button
    line: {
      closeGeometry: true, // Enables/disables ability to close a LineString
      visible: true, // Controls visibility of the line drawing button
    },
    polygon: { visible: true }, // Controls visibility of the polygon drawing button
  },
  panel: {
    size: "medium", // "large" || "small" - Controls size of the panel that appears after pressing a button
    buttons: {
      delete: { visible: true }, // Controls visibility of the delete all points button
      save: {
        clearOnSave: true, // Whether to clear all points after saving
        visible: true, // Controls visibility of the save button
      },
      undo: { visible: true }, // Controls visibility of the undo button
    },
  },
  locale: {
    // Customize button labels and tooltips
    break: "Break",
    closeLine: "Close",
    createPolygon: "Create",
    delete: "Delete",
    line: "Line",
    polygon: "Polygon",
    save: "Save",
    undo: "Undo",
  },
  layersPaint: {
    // Customize layer styles here. Refer to MapLibre's layer specifications for options.
    onLinePoint: {}, // CircleLayerSpecification["paint"]
    firstPoint: {}, // CircleLayerSpecification["paint"]
    points: {}, // CircleLayerSpecification["paint"]
    line: {}, // LineLayerSpecification["paint"]
    polygon: {}, // FillLayerSpecification["paint"]
    breakLine: {}, // LineLayerSpecification["paint"]
  },
  dynamicLine: true, // Whether to draw a dynamic line following the cursor after placing the first point
  initial: {
    // Initialize with pre-existing GeoJSON data
    closeGeometry: false, // Specify if the geometry is closed. Must be true if the geometry type is polygon.
    generateId: true, // Whether to generate unique IDs for your geometries. Should be true if there are no IDs for each point in `steps`.
    geometry: "line", // "line" | "polygon" - Specifies the type of geometry to initialize
    steps: [
      // Array of {id?: string | number, lat: number, lng: number}
      // The first and the last point should be the same if the geometry is closed.
      // The closeGeometry also should be true in this case.
      { lat: 40, lng: 30 },
      { lat: 31, lng: 21 },
      { lat: 31, lng: 21 },
    ],
  },
});
```

### Events

Import events from the library:

```javascript
import DrawLibre, { DRAW_LIBRE_EVENTS, type PointAddEvent } from "draw-libre";

map.on(DRAW_LIBRE_EVENTS.ADD, (event: PointAddEvent) => {
  console.log("Add event", event);
});
```

Available events:

- `mdl:doubleclick` (PointDoubleClickEvent)
- `mdl:pointenter` (PointEnterEvent)
- `mdl:pointleave` (PointLeaveEvent)
- `mdl:moveend` (PointMoveEvent)
- `mdl:add` (PointAddEvent)
- `mdl:undo` (UndoEvent)
- `mdl:removeall` (RemoveAllEvent)
- `mdl:save` (SaveEvent)
- `mdl:mdl:modechanged` (ModeChangeEvent)

### Methods

```javascript
const draw = DrawLibre.getInstance();

// Find a step by its ID
draw.findStepById(id: string)

// Get all steps, optionally specifying the return type
draw.getAllSteps(type?: "array" | "linkedlist")

// Set new steps. If ID is not provided, it will be generated automatically
draw.setSteps(steps: {lat: number; lng: number; id?: string}[])

// Remove all steps
draw.removeAllSteps()

// Update options. Note that options are immutable, so return a new object with spread values.
draw.setOptions((options: RequiredDrawOptions) => {
  return {
    ...options,
    locale: {
      ...options.locale,
      save: "Save update",
    },
    modes: {
      ...options.modes,
      line: {
        ...options.modes.line,
        closeGeometry: false,
      },
    },
    dynamicLine: false,
  };
});
```

## License

This project is licensed under the [MIT License](LICENSE).
