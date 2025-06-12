import { Store } from "#app/store";

function collectGeometryCoordinates(store: Store): number[][] {
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

export function getLine(current: [number, number], next: [number, number]) {
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

function getAllLines(coordinates: number[][]) {
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

function getPolygon(coordinates: number[][]) {
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

function getPoints(store: Store) {
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
        properties: { id: val.id, lat: val.lat, lng: val.lng, isFirst: head, isAuxiliary: val.isAuxiliary },
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

// CAUTION: render is dependent on this function
export function getUnifiedFeatures(
  store: Store,
): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point> {
  const points = getPoints(store).features;
  const coordinates = collectGeometryCoordinates(store);

  const lines = getAllLines(coordinates).features;
  const polygons = getPolygon(coordinates).features;

  return {
    type: "FeatureCollection",
    features: [...points, ...lines, ...polygons],
  } as GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point>;
}
