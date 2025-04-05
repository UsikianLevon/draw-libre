import type { MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl";
import type { LatLng, Point, Uuid, EventsProps } from "#types/index";
import type { CustomMap } from "#types/map";

import type { ListNode, Store } from "#store/index";
import { togglePointCircleRadius } from "#components/map/tiles/helpers";

import type { DrawingMode } from "#components/map/mode";
import { ELAYERS, POLYGON_BASE } from "./geo_constants";

export class MapUtils {
  static isFeatureTriggered(event: MapLayerMouseEvent, layerIds: string[]) {
    const layers = event.target.queryRenderedFeatures(event.point, {
      layers: layerIds,
    });
    return layers.some((layer) => layerIds.includes(layer.layer.id));
  }

  static getPixelCoordinates = (map: CustomMap, coords: LatLng) => {
    const { lat, lng } = coords;
    return map.project([lng, lat]);
  };

  static queryPointId = (map: CustomMap, point: MapMouseEvent["point"]) => {
    const query = map.queryRenderedFeatures(point, {
      layers: [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer],
    });
    const id = query?.[0]?.properties.id;
    return id;
  };
}

export class GeometryFactory {
  static #collectGeometryCoordinates(store: Store): number[][] {
    const coordinates = [];
    let current = store.head;
    const visitedNodes = new Set();

    while (current !== null) {
      if (visitedNodes.has(current.val?.id)) {
        if (store.head && store.head.val) {
          coordinates.push([store.head.val.lng, store.head.val.lat]);
        }
        break;
      }
      visitedNodes.add(current.val?.id);

      if (current.val) {
        coordinates.push([current.val.lng, current.val.lat]);
      }
      current = current.next;
    }

    return coordinates;
  }

  static getAllLines(store: Store) {
    const coordinates = this.#collectGeometryCoordinates(store);
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      ],
    };
  }

  static getLine(current: [number, number], next: [number, number]) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [current, next],
          },
        },
      ],
    };
  }

  static getPolygon(store: Store) {
    const coordinates = this.#collectGeometryCoordinates(store);
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        },
      ],
    };
  }

  static getPoints(store: Store) {
    let current = store.head;
    const pointFeatures = [];
    const visitedNodes = new Set();

    while (current !== null) {
      if (visitedNodes.has(current.val?.id)) {
        break;
      }
      if (current.val) {
        const val = current.val;
        const head = current.val.id === store.head?.val?.id;
        pointFeatures.push({
          type: "Feature",
          properties: { id: val.id, lat: val.lat, lng: val.lng, isFirst: head },
          geometry: {
            type: "Point",
            coordinates: [val.lng, val.lat],
          },
        });
      }
      visitedNodes.add(current.val?.id);
      current = current.next;
    }

    return {
      type: "FeatureCollection",
      features: pointFeatures,
    };
  }
}

export class Spatial {
  static getGeometryIndex = (store: Store, id: Uuid) => {
    let current = store.head;
    let idx = 0;
    while (current !== null) {
      if (current.val?.id === id) {
        return idx;
      }
      idx++;
      current = current.next;
    }
    return -1;
  };

  static isFirstPoint(event: MapLayerMouseEvent): boolean {
    const map = event.target;
    const point = event.point;
    const points = map.queryRenderedFeatures(point, {
      layers: [ELAYERS.FirstPointLayer],
    });
    return Boolean(points.length);
  }

  // √(x2​−x1​)²+(y2​−y1​)²​
  static distance = (point1: Point, point2: Point) =>
    Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);

  static checkIfPointIsOnLine = (A: Point, B: Point, P: Point): boolean => {
    const EPSILON = 0.1;

    const distanceAB = this.distance(A, B);
    const distanceAP = this.distance(A, P);
    const distancePB = this.distance(P, B);

    if (Math.abs(distanceAP + distancePB - distanceAB) < EPSILON) {
      return true;
    }

    return false;
  };

  static isClosedGeometry = (store: Store) => {
    return store.tail?.next === store.head;
  };

  static breakGeometry = (store: Store, id: Uuid) => {
    if (!store.head) return;

    let current = store.head;
    let prev = store.tail as ListNode; // we know that tail is not null because the geometry is closed

    do {
      if (current?.val?.id === id) {
        if (current !== store.head) {
          prev.next = current.next;
          store.head = current;
          store.tail = prev;
        }
        (store.tail as ListNode).next = null;
        return;
      }
      prev = current;
      current = current.next as ListNode;
    } while (current !== store.head);
  };

  static closeGeometry = (store: Store, mode: DrawingMode) => {
    if (store.tail) {
      store.tail.next = store.head;
    }
    mode.setClosedGeometry(true);
  };

  static canCloseGeometry = (store: Store) => {
    return store.size > 2 && !this.isClosedGeometry(store);
  };

  static canBreakClosedGeometry = (store: Store) => {
    return store.size <= 2;
  };

  static switchToLineModeIfCan = (context: EventsProps) => {
    const { mode, store, tiles, map } = context;

    if (Spatial.canBreakClosedGeometry(store)) {
      if (store.tail && store.tail.val) {
        store.tail.next = null;
      }
      mode.reset();
      togglePointCircleRadius(map, "default");
      tiles.renderPolygon(POLYGON_BASE);
    }
  };
}

export const uuidv4 = (): Uuid => {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  function getRandomHexChar() {
    const hexChars = "0123456789abcdef";
    return hexChars[Math.floor(Math.random() * 16)];
  }

  function getUuidSection(length: number) {
    let section = "";
    for (let i = 0; i < length; i++) {
      section += getRandomHexChar();
    }
    return section;
  }

  function getUuidSectionSize(idx: number) {
    const firstElement = idx === 0;
    const lastElement = idx === 4;

    if (firstElement) {
      return 8;
    }
    if (lastElement) {
      return 12;
    }

    return 4;
  }

  const parts = [];
  for (let i = 0; i < 5; i++) {
    parts.push(getUuidSection(getUuidSectionSize(i)));
  }

  return parts.join("-") as Uuid;
};

export const throttle = (fn: (...args: any) => void, delay: number) => {
  let lastArgs: any;
  let shouldCall = true;

  function execute() {
    if (shouldCall && lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
      shouldCall = false;
      setTimeout(() => {
        shouldCall = true;
        execute();
      }, delay);
    }
  }

  return function (...args: any) {
    lastArgs = args;
    execute();
  };
};

export const debounce = (fn: (...args: any) => void, delay: number) => {
  let timeout: number;

  return function (...args: any) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
