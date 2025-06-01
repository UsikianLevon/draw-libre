import { StoreHelpers } from "#app/store/index";
import type { ButtonType, EventsCtx, Step } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { disableButton, enableButton } from "#app/utils/helpers";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";
import { timeline } from "#app/history";
import { TimelineChangeEvent } from "#app/history/types";

export class PanelEvents {
  private tooltip: Tooltip;

  constructor(private readonly ctx: EventsCtx) {
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
        disableButton(this.ctx.panel.redoButton as HTMLButtonElement);
      } else {
        enableButton(this.ctx.panel.redoButton as HTMLButtonElement);
      }
    }

    if (type === "UNDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.ctx.panel.undoButton as HTMLButtonElement);
      } else {
        enableButton(this.ctx.panel.undoButton as HTMLButtonElement);
      }
    }
  };

  private onStoreChangeConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      const { data } = event;
      if (data?.size === 0) {
        this.ctx.panel.hide();
      } else {
        let current = Object.assign({}, data);
        // TODO why the hell do we need a loop here? We don't like loops
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.ctx.panel.setPanelLocation({
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
      this.ctx.panel.hide();
    }
    if (type === "MODE_CHANGED" && data) {
      if (store.tail?.val) {
        this.ctx.panel.setPanelLocation({
          lat: store.tail?.val?.lat,
          lng: store.tail?.val?.lng,
        });
      }
    }
  };

  public initEvents() {
    const { panel } = this.ctx;

    if (panel.undoButton) {
      DOM.addEventListener(panel.undoButton, "click", this.onUndoClick);
      DOM.addEventListener(panel.undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.addEventListener(panel.redoButton, "click", this.onRedoClick);
      DOM.addEventListener(panel.redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.addEventListener(panel.deleteButton, "click", this.onRemoveAll);
      DOM.addEventListener(panel.deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.addEventListener(panel.saveButton, "click", this.onSaveClick);
      DOM.addEventListener(panel.saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  public removeEvents() {
    const { panel } = this.ctx;

    if (panel.undoButton) {
      DOM.removeEventListener(panel.undoButton, "click", this.onUndoClick);
      DOM.removeEventListener(panel.undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.removeEventListener(panel.deleteButton, "click", this.onRemoveAll);
      DOM.removeEventListener(
        panel.deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.removeEventListener(panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.removeEventListener(panel.redoButton, "click", this.onRedoClick);
      DOM.removeEventListener(panel.redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.removeEventListener(panel.saveButton, "click", this.onSaveClick);
      DOM.removeEventListener(panel.saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.saveButton, "mouseleave", this.onMouseLeave);
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
    const { renderer, mode, panel, store, map } = this.ctx;
    store.reset();
    panel.hide();
    mode.reset();
    this.tooltip.remove();
    timeline.resetStacks();
    renderer.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  private onUndoClick = (event: Event) => {
    const { store, map, renderer } = this.ctx;
    const hasSomethingToRedo = timeline.getRedoStackLength();

    // hasSomethingToRedo prevents from resetting the store when we still have something to redo and are trying to remove the last point by undoing
    if (store.size === 1 && hasSomethingToRedo) {
      store.reset();
      this.ctx.panel.hide();
    } else {
      timeline.undo();
    }
    this.tooltip.remove();
    FireEvents.undo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onRedoClick = (event: Event) => {
    const { store, map, renderer } = this.ctx;

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
