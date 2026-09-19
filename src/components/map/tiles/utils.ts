import type { EngineMap } from "#app/types/engine";
import type { RequiredDrawOptions } from "#app/types/index";

import { ELAYERS } from "#app/utils/geo_constants";

export type FirstPointState = "closable" | "default";

export const setFirstPointState = (
  map: EngineMap,
  state: FirstPointState,
  paint: RequiredDrawOptions["layersPaint"],
) => {
  const closable: Record<string, any> = paint.firstPointClosable ?? {};
  const base: Record<string, any> = paint.firstPoint ?? {};

  for (const key of Object.keys(closable) as Parameters<EngineMap["setPaintProperty"]>[1][]) {
    map.setPaintProperty(ELAYERS.FirstPointLayer, key, state === "closable" ? closable[key] : base[key]);
  }
};
