import { FireEvents } from "#components/map/helpers";
import { DrawingModeChangeEvent, Mode } from "#components/map/mode/types";
import { disableButton, enableButton } from "#app/utils/helpers";
import { Context } from ".";
import { View } from "./view";

export class Observer {
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

    lineButton?.classList.remove("control-button-active");
    polygonButton?.classList.remove("control-button-active");
    breakButton?.classList.remove("control-button-active");
  };

  private checkActive = (button: HTMLElement) => {
    this.resetAllState();
    button.classList.add("control-button-active");
  };

  private observeModeChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    const { mode } = this.ctx;
    FireEvents.modeChanged(this.ctx.map, data as Mode);

    if (!lineButton || !polygonButton || !breakButton) return;

    switch (data) {
      case "line":
        this.checkActive(lineButton);
        break;
      case "polygon":
        this.checkActive(polygonButton);
        break;
      default:
        break;
    }

    if (!data) {
      disableButton(breakButton);
    } else {
      if (mode.getClosedGeometry()) {
        enableButton(breakButton);
      }
    }
  };

  private observeGeometryChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    const { mode } = this.ctx;

    if (data) {
      if (breakButton) {
        enableButton(breakButton);
      }
      if (mode.getMode() === "polygon") {
        if (lineButton) {
          disableButton(lineButton);
        }
      }
      if (mode.getMode() === "line") {
        if (polygonButton) {
          disableButton(polygonButton);
        }
      }
    } else {
      if (breakButton) {
        disableButton(breakButton);
      }
      if (mode.getMode() === "polygon") {
        if (lineButton) {
          enableButton(lineButton);
        }
      }
      if (mode.getMode() === "line") {
        if (polygonButton) {
          enableButton(polygonButton);
        }
      }
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
      FireEvents.modeChanged(this.ctx.map, "break");
    }
  };
}
