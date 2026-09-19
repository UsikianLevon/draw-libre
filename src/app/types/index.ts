import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "@maplibre/maplibre-gl-style-spec";

import type { Control } from "#components/side-control";
import type { Panel } from "#components/panel";
import type { MouseEvents } from "#components/map/mouse-events/index";
import type { Store } from "#app/store/index";

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
    redo?: Button;
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

// mapbox paint has properties and expressions the maplibre style spec does not know
// any instead of unknown lets paint objects typed with interfaces pass
type Paint<T extends { paint?: unknown }> = NonNullable<T["paint"]> | Record<string, any>;

export interface LayersPaint {
  onLinePoint?: Paint<CircleLayerSpecification>;
  firstPoint?: Paint<CircleLayerSpecification>;
  firstPointClosable?: Paint<CircleLayerSpecification>;
  points?: Paint<CircleLayerSpecification>;
  auxiliaryPoint?: Paint<CircleLayerSpecification>;
  line?: Paint<LineLayerSpecification>;
  dynamicLine?: Paint<LineLayerSpecification>;
  polygon?: Paint<FillLayerSpecification>;
  breakLine?: Paint<LineLayerSpecification>;
}

export interface StrictLayersPaint {
  onLinePoint?: CircleLayerSpecification["paint"];
  firstPoint?: CircleLayerSpecification["paint"];
  firstPointClosable?: CircleLayerSpecification["paint"];
  points?: CircleLayerSpecification["paint"];
  auxiliaryPoint?: CircleLayerSpecification["paint"];
  line?: LineLayerSpecification["paint"];
  dynamicLine?: LineLayerSpecification["paint"];
  polygon?: FillLayerSpecification["paint"];
  breakLine?: LineLayerSpecification["paint"];
}

type Layout<T extends { layout?: unknown }> = (Omit<NonNullable<T["layout"]>, "visibility"> | Record<string, any>) & {
  visibility?: never;
};

type StrictLayout<T extends { layout?: unknown }> = Omit<NonNullable<T["layout"]>, "visibility">;

export interface LayersLayout {
  onLinePoint?: Layout<CircleLayerSpecification>;
  firstPoint?: Layout<CircleLayerSpecification>;
  points?: Layout<CircleLayerSpecification>;
  auxiliaryPoint?: Layout<CircleLayerSpecification>;
  line?: Layout<LineLayerSpecification>;
  dynamicLine?: Layout<LineLayerSpecification>;
  polygon?: Layout<FillLayerSpecification>;
  breakLine?: Layout<LineLayerSpecification>;
}

export interface StrictLayersLayout {
  onLinePoint?: StrictLayout<CircleLayerSpecification>;
  firstPoint?: StrictLayout<CircleLayerSpecification>;
  points?: StrictLayout<CircleLayerSpecification>;
  auxiliaryPoint?: StrictLayout<CircleLayerSpecification>;
  line?: StrictLayout<LineLayerSpecification>;
  dynamicLine?: StrictLayout<LineLayerSpecification>;
  polygon?: StrictLayout<FillLayerSpecification>;
  breakLine?: StrictLayout<LineLayerSpecification>;
}

interface Locale {
  save?: string;
  delete?: string;
  undo?: string;
  redo?: string;
  line?: string;
  polygon?: string;
  break?: string;
  closeLine?: string;
  createPolygon?: string;
  removePoint?: string;
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
  layersLayout?: LayersLayout;
  initial?: Initial | null;
  locale?: Locale;
  dynamicLine?: boolean;
}

export type RequiredDrawOptions = DeepRequired<Omit<DrawOptions, "layersPaint" | "layersLayout">> & {
  layersPaint: StrictLayersPaint;
  layersLayout: StrictLayersLayout;
  interaction: {
    lineHitRadius: number;
    pointHitRadius: number;
  };
};

export interface ControlOptions {
  attribute: string;
  classname: string;
  onClick: (e: MouseEvent) => void;
  parent: HTMLElement;
}

export type ButtonType = keyof Required<NonNullable<PanelImpl["buttons"]>>;
export type ControlType = "line" | "polygon" | "break";
