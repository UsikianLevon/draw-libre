import { DOM } from "#app/dom";
import { FireEvents } from "#components/map/fire-events";
import { DrawingModeChangeEvent, Mode } from "#components/map/mode/types";
import { Context } from ".";
import { View } from "./view";

type AnnouncedMode = Mode | "break";

export class Observer {
  private announced: AnnouncedMode | undefined = undefined;

  constructor(private readonly ctx: Context & { view: View }) {
    this.initConsumers();
  }

  private initConsumers = () => {
    this.ctx.mode.addObserver(this.mapModeConsumer);
  };

  public remove = () => {
    this.ctx.mode.removeObserver(this.mapModeConsumer);
  };

  private resetAllState = () => {
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    DOM.setPressed(lineButton, false);
    DOM.setPressed(polygonButton, false);
    DOM.setPressed(breakButton, false);
  };

  private announce = (mode: AnnouncedMode) => {
    if (mode === this.announced) return;
    this.announced = mode;
    FireEvents.modeChanged(this.ctx.map, mode);
  };

  private checkActive = (button: HTMLElement) => {
    this.resetAllState();
    DOM.setPressed(button, true);
  };

  private observeModeChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    const { mode } = this.ctx;
    this.announce(data as Mode);

    if (data === "line" || data === "polygon") {
      this.resetAllState();
      DOM.setPressed(data === "line" ? lineButton : polygonButton, true);
    }

    if (!breakButton) return;

    if (!data) {
      DOM.disableButton(breakButton);
    } else {
      if (mode.getClosedGeometry()) {
        DOM.enableButton(breakButton);
      }
    }
  };

  private observeGeometryChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    const { mode } = this.ctx;
    const currentMode = mode.getMode();

    if (breakButton) {
      data ? DOM.enableButton(breakButton) : DOM.disableButton(breakButton);
    }
    if (currentMode === "polygon" && lineButton) {
      data ? DOM.disableButton(lineButton) : DOM.enableButton(lineButton);
    }
    if (currentMode === "line" && polygonButton) {
      data ? DOM.disableButton(polygonButton) : DOM.enableButton(polygonButton);
    }
  };

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      this.observeModeChange(event);
    }
    if (type === "CLOSED_GEOMETRY_CHANGED") {
      this.observeGeometryChange(event);
    }
    if (type === "BREAK_CHANGED" && data) {
      const { breakButton } = this.ctx.view;

      this.checkActive(breakButton as HTMLElement);
      this.announce("break");
    }
  };
}
