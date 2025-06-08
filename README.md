<section >

# DrawLibre

> Early supporter? Your ⭐ makes a difference! ❤️

## Features

- Undo/redo
- Can break a closed geometry
- Draw linestrings (including closed ones) and polygons
- Compatible with maplibre-gl(v2-v5) and mapbox-gl(v1-v3) and all projections
- Customizable UI and controls
- Event-driven architecture for easy integration

### Manual Point Generation (extra points are added when a line is clicked)

<img src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaDZscnowMHNndmtiZzcwb3Bvc2Y2b29qbHdndndndGE3Mzk5Z2Q0cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/m6lig0ZCfL45FZQo7b/giphy.gif" width="800" alt="Manual Point Generation">

### Automatic Point Generation (an auxiliary point is generated between every two primary points.)

<img src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2VieG1rd3ZkaWt5azVhYWpqaWEwZnVybGdjYW90d2xwNWwzeWtzayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6ohjkf9L1NWUESTaQA/giphy.gif" width="800" alt="Automatic Point Generation">
</section>

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
  pointGeneration: "manual", // or "auto"; pointGeneration controls whether additional points are automatically generated on the line or if you place them manually by clicking.
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
      redo: { visible: true }
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
    redo: "Redo",
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
  dynamicLine: true, // Whether to draw a dynamic line following the cursor after placing the first point. It's always false for mobile phones(when the viewport is less than 768)
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
import DrawLibre, { type PointAddEvent } from "draw-libre";

map.on(mdl:add, (event: PointAddEvent) => {
  console.log("Add event", event);
});
```

Available events:

- `mdl:rightclickremove` (PointRightClickRemoveEvent) -- Fired when a point is removed by right-clicking on it.
- `mdl:pointenter` (PointEnterEvent) -- Fired when the cursor enters a point
- `mdl:pointleave` (PointLeaveEvent) -- Fired when the cursor leaves a point
- `mdl:moveend` (PointMoveEvent) -- Fired when a point is moved
- `mdl:add` (PointAddEvent) -- Fired when a point is added
- `mdl:undo` (UndoEvent) -- Fired when the undo button is clicked
- `mdl:removeall` (RemoveAllEvent) -- Fired when all points are removed by clicking the delete button
- `mdl:save` (SaveEvent) -- Fired when the save button is clicked
- `mdl:modechanged` (ModeChangeEvent) -- Fired when the drawing mode is changed

### Methods

```javascript
const draw = DrawLibre.getInstance();

// Retrieves a step from the store by its ID.
draw.findStepById(id: string)

// Retrieves a node from the store by its ID.
draw.findNodeById(id: string)

// Get all steps, optionally specifying the return type. Selecting 'linkedlist' will return a circular doubly linked list. Have fun.
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

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
