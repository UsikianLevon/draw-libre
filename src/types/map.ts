import type mapboxgl from "mapbox-gl";
import type maplibregl from "maplibre-gl";

export type UnifiedMap = maplibregl.Map & mapboxgl.Map;
export type IControl = maplibregl.IControl & mapboxgl.IControl;
