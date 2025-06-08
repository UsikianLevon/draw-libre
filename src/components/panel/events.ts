import { StoreHelpers } from "#app/store/index";
import type { ButtonType, LatLng, Step } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { disableButton, enableButton } from "#app/utils/helpers";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";
import { timeline } from "#app/history";
import { TimelineChangeEvent } from "#app/history/types";
import { renderer } from "#components/map/renderer";
import { Context } from ".";
import { View } from "./view";

export class Events {
  private tooltip: Tooltip;

  constructor(private readonly ctx: Context & { view: View; setPanelLocation: (coordinates: LatLng) => void }) {
    this.tooltip = new Tooltip();
  }

  public initConsumers() {
    this.ctx.store.addObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.addObserver(this.onMapModeConsumer);
    timeline.addObserver(this.timelineConsumer);
  }

  public removeConsumers() {
    this.ctx.store.removeObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.removeObserver(this.onMapModeConsumer);
    timeline.removeObserver(this.timelineConsumer);
  }

  private timelineConsumer = (event: TimelineChangeEvent) => {
    const { type, data } = event;
    if (type === "REDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.ctx.view.getButton("redo"));
      } else {
        enableButton(this.ctx.view.getButton("redo"));
      }
    }

    if (type === "UNDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.ctx.view.getButton("undo"));
      } else {
        enableButton(this.ctx.view.getButton("undo"));
      }
    }
  };

  private onStoreChangeConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      const { data } = event;
      if (data?.size === 0) {
        this.ctx.view.hide();
      } else {
        let current = Object.assign({}, data);

        // TODO why the hell do we need a loop here? We don't like loops
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.ctx.setPanelLocation({
                lat: current.tail.val.lat,
                lng: current.tail.val.lng,
              });
            }
            break;
          }
        }
      }
    }
  };

  private onMapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.ctx;
    const { type, data } = event;
    if (type === "MODE_CHANGED" && !data) {
      this.ctx.view.hide();
    }
    if (type === "MODE_CHANGED" && data) {
      if (store.tail?.val) {
        this.ctx.setPanelLocation({
          lat: store.tail?.val?.lat,
          lng: store.tail?.val?.lng,
        });
      }
    }
  };

  public initEvents() {
    const undoButton = this.ctx.view.getButton("undo");

    if (undoButton) {
      DOM.addEventListener(undoButton, "click", this.onUndoClick);
      DOM.addEventListener(undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(undoButton, "mouseleave", this.onMouseLeave);
    }

    const redoButton = this.ctx.view.getButton("redo");
    if (redoButton) {
      DOM.addEventListener(redoButton, "click", this.onRedoClick);
      DOM.addEventListener(redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(redoButton, "mouseleave", this.onMouseLeave);
    }

    const deleteButton = this.ctx.view.getButton("delete");
    if (deleteButton) {
      DOM.addEventListener(deleteButton, "click", this.onRemoveAll);
      DOM.addEventListener(deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(deleteButton, "mouseleave", this.onMouseLeave);
    }

    const saveButton = this.ctx.view.getButton("save");
    if (saveButton) {
      DOM.addEventListener(saveButton, "click", this.onSaveClick);
      DOM.addEventListener(saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  public removeEvents() {
    const undoButton = this.ctx.view.getButton("undo");
    if (undoButton) {
      DOM.removeEventListener(undoButton, "click", this.onUndoClick);
      DOM.removeEventListener(undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(undoButton, "mouseleave", this.onMouseLeave);
    }
    const redoButton = this.ctx.view.getButton("redo");
    if (redoButton) {
      DOM.removeEventListener(redoButton, "click", this.onRedoClick);
      DOM.removeEventListener(redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(redoButton, "mouseleave", this.onMouseLeave);
    }

    const deleteButton = this.ctx.view.getButton("delete");
    if (deleteButton) {
      DOM.removeEventListener(deleteButton, "click", this.onRemoveAll);
      DOM.removeEventListener(deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(deleteButton, "mouseleave", this.onMouseLeave);
    }

    const saveButton = this.ctx.view.getButton("save");
    if (saveButton) {
      DOM.removeEventListener(saveButton, "click", this.onSaveClick);
      DOM.removeEventListener(saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  private getButtonLabel = (type: ButtonType) => {
    const { options } = this.ctx;

    const LABELS: Record<ButtonType, string> = {
      undo: options.locale.undo,
      redo: options.locale.redo,
      delete: options.locale.delete,
      save: options.locale.save,
    };

    return LABELS[type];
  };

  private onMouseEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const type = event.target.getAttribute("data-type") as ButtonType;
    if (type) {
      const label = this.getButtonLabel(type);

      this.tooltip
        .create({
          label,
          placement: "bottom",
        })
        .setPosition(this.tooltip.getPosition(event, "bottom"));
    }
  };

  private onMouseLeave = () => {
    this.tooltip.remove();
  };

  private onRemoveAll = (event: Event) => {
    const { mode, view, store, map } = this.ctx;
    store.reset();
    view.hide();
    mode.reset();
    this.tooltip.remove();
    timeline.resetStacks();
    renderer.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  private onUndoClick = (event: Event) => {
    const { store, map, view } = this.ctx;
    const hasSomethingToRedo = timeline.getRedoStackLength();

    // hasSomethingToRedo prevents from resetting the store when we still have something to redo and are trying to remove the last point by undoing
    if (store.size === 1 && hasSomethingToRedo) {
      store.reset();
      this.ctx.view.hide();
    } else {
      timeline.undo();
    }
    this.tooltip.remove();
    FireEvents.undo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onRedoClick = (event: Event) => {
    const { store, map } = this.ctx;

    timeline.redo();
    FireEvents.redo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onSaveClick = (event: Event) => {
    const { store, options } = this.ctx;

    FireEvents.onSaveClick(this.ctx, StoreHelpers.toArray(store.head), event);
    this.tooltip.remove();
    if (options.panel.buttons.save.clearOnSave) {
      this.onRemoveAll(event);
    }
  };
}
