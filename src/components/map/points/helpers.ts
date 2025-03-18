import type { MapLayerMouseEvent, GeoJSONSource } from "maplibre-gl";
import type { EventsProps, Step } from "#types/index";

import { ESOURCES, ELAYERS } from "#utils/geo_constants";
import { Spatial, uuidv4 } from "#utils/helpers";
import { TilesHelpers } from "#components/map/tiles/helpers";

import { FireEvents } from "../helpers";

export class PointHelpers {
  static updatePointsData(event: MapLayerMouseEvent) {
    const map = event.target;
    const pointSource = map.getSource(ESOURCES.SinglePointSource) as GeoJSONSource;
    if (pointSource) {
      pointSource.setData({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [event.lngLat.lng, event.lngLat.lat],
        },
        properties: {},
      });
    }
  }

  static setSinglePointVisible(event: MapLayerMouseEvent) {
    const map = event.target;
    map.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "visible");
  }

  static setSinglePointHidden(event: MapLayerMouseEvent) {
    const map = event.target;
    setTimeout(() => {
      map.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "none");
    }, 33);
  }

  static triggerPostPointAddition(event: MapLayerMouseEvent, props: EventsProps) {
    const { panel, store, map } = props;

    if (Spatial.canCloseGeometry(store)) {
      TilesHelpers.togglePointCircleRadius(map, "large");
    }
    panel?.setPanelLocation(event.lngLat);
  }

  static addPointToMap = (event: MapLayerMouseEvent, props: EventsProps) => {
    const { store, tiles, map, mode } = props;

    const step = { ...event.lngLat, id: uuidv4() };
    store.push(step);
    FireEvents.addPoint({ ...step, total: store.size }, map, mode);
    this.triggerPostPointAddition(event, props);
    requestAnimationFrame(tiles.render);
  };

  static updateSelectedStepLatLng = (event: MapLayerMouseEvent, selectedStep: Step) => {
    selectedStep.lat = event.lngLat.lat;
    selectedStep.lng = event.lngLat.lng;
  };
}
