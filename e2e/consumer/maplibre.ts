import * as maplibregl from "maplibre-gl";
import type { MapLike } from "draw-libre";

import { draw } from "./consumer";

const map = new maplibregl.Map({ container: "map" });

map.addControl(draw, "top-left");
map.removeControl(draw);

const asMapLike: MapLike = map;
void asMapLike;

draw.on("mdl:add", (event) => {
  const engineMap = event.target as maplibregl.Map;
  void engineMap.getZoom();
});
