import * as bundle from "maplibre-gl";

type Maplibre = typeof bundle;
type VersionSource = { getVersion?: () => string; version?: string };

// maplibre 5 and older ship UMD, the dev server can hand such a module over under default
export const maplibregl: Maplibre = "Map" in bundle ? bundle : (bundle as unknown as { default: Maplibre }).default;

export async function loadMaplibreWorker() {
  const source = maplibregl as unknown as VersionSource;
  const major = Number((source.getVersion?.() ?? source.version ?? "0").split(".")[0]);
  // older maplibre has no worker module file, importing it would break the page
  if (major < 6) return;
  const { default: workerUrl } = await import("./maplibre-worker-url");
  maplibregl.setWorkerUrl(workerUrl);
}
