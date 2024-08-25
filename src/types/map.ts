import type { Map as MapMaplibre } from "maplibre-gl";
import type { Map as MapBox } from "mapbox-gl";

import type { IControl as IControlMaplibre } from "maplibre-gl";
import type { IControl as IControlMapbox } from "mapbox-gl";

export type Map = MapMaplibre & MapBox;
export type IControl = IControlMaplibre & IControlMapbox;
