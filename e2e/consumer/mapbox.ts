import mapboxgl from "mapbox-gl";
import DrawLibre from "draw-libre";

import { draw } from "./consumer";

const map = new mapboxgl.Map({ container: "map" });

map.addControl(draw, "top-left");
map.removeControl(draw);

DrawLibre.getInstance({
  layersPaint: {
    points: { "circle-emissive-strength": 1 },
    line: { "line-color": ["config", "lineColor"] },
  },
});
