import type { RequiredDrawOptions } from "#types/index";
import { Observable } from "#utils/observable";

import type { DrawingModeChangeEvent, Mode } from "./types";

function getInitialMode(options: RequiredDrawOptions): Mode {
  if (options.initial?.geometry) {
    return options.initial?.geometry;
  }

  if (options.modes.initial) {
    return options.modes.initial;
  }

  return null;
}

export class DrawingMode extends Observable<DrawingModeChangeEvent> {
  #mode: Mode;
  #break: boolean;
  #closedGeometry: boolean;

  constructor(options: RequiredDrawOptions) {
    super();
    this.#mode = getInitialMode(options);
    this.#break = false;
    this.#closedGeometry = options.initial?.closeGeometry ?? false;
  }

  getMode = (): Mode => {
    return this.#mode;
  };

  setMode = (newMode: Mode) => {
    this.#mode = newMode;
    this.setBreak(false);
    this.notify({
      type: "MODE_CHANGED",
      data: newMode,
    });
  };

  getBreak = (): boolean => {
    return this.#break;
  };

  setBreak = (value: boolean) => {
    this.#break = value;
    this.notify({
      type: "BREAK_CHANGED",
      data: value,
    });
  };

  getClosedGeometry = (): boolean => {
    return this.#closedGeometry;
  };

  setClosedGeometry = (value: boolean) => {
    this.#closedGeometry = value;
    this.notify({
      type: "CLOSED_GEOMETRY_CHANGED",
      data: this.#closedGeometry,
    });
  };

  isPolygon = () => {
    return this.#mode === "polygon" && this.getClosedGeometry();
  };

  reset = () => {
    this.setMode(this.getMode());
    this.setClosedGeometry(false);
  };

  pingConsumers = () => {
    this.notify({
      type: "MODE_CHANGED",
      data: this.getMode(),
    });
    this.notify({
      type: "CLOSED_GEOMETRY_CHANGED",
      data: this.getClosedGeometry(),
    });
  };
}
