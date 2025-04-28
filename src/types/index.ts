import type { CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";

import type { UnifiedMap } from "#types/map";

import type { Control } from "#components/side-control";
import type { Panel } from "#components/panel";
import type { Tiles } from "#components/map/tiles";
import type { MouseEvents } from "#components/map/mouse-events/index";
import type { Store } from "#store/index";

import type { DrawingMode } from "#components/map/mode";
import type { DeepRequired } from "./helpers";
import type { Mode } from "#components/map/mode/types";

export type LatLng = {
  lat: number;
  lng: number;
};
export type Point = {
  x: number;
  y: number;
};

export type Uuid = `${string}-${string}-${string}-${string}-${string}`;
export type StepId = Uuid | string;

export type Step = {
  id: StepId;
  isAuxiliary?: boolean;
} & LatLng;

export interface PanelImpl {
  size?: "small" | "medium" | "large";
  buttons?: {
    delete?: Button;
    undo?: Button;
    save?: SaveButton;
  };
}

export type Button = {
  visible?: boolean;
};

export type SaveButton = Button & {
  clearOnSave?: boolean;
};

type InitialSteps =
  | {
    steps: Step[];
    generateId?: boolean;
  }
  | {
    steps: LatLng[];
    generateId: true;
  };

export type Initial = InitialSteps & {
  geometry: "line" | "polygon";
  closeGeometry: boolean;
};

export interface LayersPaint {
  onLinePoint?: CircleLayerSpecification["paint"];
  firstPoint?: CircleLayerSpecification["paint"];
  points?: CircleLayerSpecification["paint"];
  auxiliaryPoint?: CircleLayerSpecification["paint"];
  line?: LineLayerSpecification["paint"];
  polygon?: FillLayerSpecification["paint"];
  breakLine?: LineLayerSpecification["paint"];
}

interface Locale {
  save?: string;
  delete?: string;
  undo?: string;
  line?: string;
  polygon?: string;
  break?: string;
  closeLine?: string;
  createPolygon?: string;
}

export interface DrawOptions {
  pointGeneration?: "manual" | "auto";
  panel?: {
    size?: PanelImpl["size"];
    buttons?: PanelImpl["buttons"];
  };
  modes?: {
    initial?: Mode;
    line?: {
      visible?: boolean;
      closeGeometry?: boolean;
    };
    polygon?: {
      visible?: boolean;
    };
    breakGeometry?: {
      visible?: boolean;
    };
  };
  layersPaint?: LayersPaint;
  initial?: Initial | null;
  locale?: Locale;
  dynamicLine?: boolean;
}

export type RequiredDrawOptions = DeepRequired<Omit<DrawOptions, "layersPaint">> & {
  layersPaint: LayersPaint;
};

export interface ControlOptions {
  attribute: string;
  classname: string;
  onClick: (e: MouseEvent) => void;
  parent: HTMLElement;
}

export type EventsProps = {
  map: UnifiedMap;
  panel: Panel;
  store: Store;
  control: Control;
  options: RequiredDrawOptions;
  mouseEvents: MouseEvents;
  mode: DrawingMode;
  tiles: Tiles;
};

export type ButtonType = "undo" | "delete" | "save";
export type ControlType = "line" | "polygon" | "break";
