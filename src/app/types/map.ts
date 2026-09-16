export interface MapLike {
  getContainer(): HTMLElement;
  getCanvasContainer(): HTMLElement;
}

export interface DrawLibreControl {
  onAdd(map: MapLike): HTMLElement;
  onRemove(map: MapLike): void;
}

export type UnifiedMap = MapLike;
