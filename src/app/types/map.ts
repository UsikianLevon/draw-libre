import type maplibregl from "maplibre-gl";
import type mapboxgl from "mapbox-gl";

export type UnifiedMap = maplibregl.Map & mapboxgl.Map;
export type IControl = maplibregl.IControl & mapboxgl.IControl;
