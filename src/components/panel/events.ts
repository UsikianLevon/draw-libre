import { StoreHelpers } from "#app/store/index";
import type { ButtonType, EventsCtx, Step } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { disableButton, enableButton, Spatial } from "#app/utils/helpers";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";
import { timeline } from "#app/history";
import { HistoryChangeEvent } from "#app/history/types";

export class PanelEvents {
  private tooltip: Tooltip;

  constructor(private readonly props: EventsCtx) {
    this.tooltip = new Tooltip();
  }

  public initConsumers() {
    this.props.store.addObserver(this.storeEventsConsumer);
    this.props.mode?.addObserver(this.mapModeConsumer);
    timeline.addObserver(this.timelineConsumer);
  }

  public removeConsumers() {
    this.props.store.removeObserver(this.storeEventsConsumer);
    this.props.mode?.removeObserver(this.mapModeConsumer);
    timeline.removeObserver(this.timelineConsumer);
  }

  private timelineConsumer = (event: HistoryChangeEvent) => {
    const { type, data } = event;
    if (type === "REDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.props.panel.redoButton as HTMLButtonElement);
      } else {
        enableButton(this.props.panel.redoButton as HTMLButtonElement);
      }
    }
  }

  private storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      const { data } = event;
      if (data?.size === 0) {
        this.props.panel.hidePanel();
      } else {
        let current = Object.assign({}, data);
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.props.panel.setPanelLocation({
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

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.props;
    const { type, data } = event;
    if (type === "MODE_CHANGED" && !data) {
      this.props.panel.hidePanel();
    }
    if (type === "MODE_CHANGED" && data) {
      if (store.tail?.val) {
        this.props.panel.setPanelLocation({
          lat: store.tail?.val?.lat,
          lng: store.tail?.val?.lng,
        });
      }
    }
  };

  public initEvents() {
    const { panel } = this.props;

    if (panel.undoButton) {
      DOM.manageEventListener("add", panel.undoButton, "click", this.onUndoClick);
      DOM.manageEventListener(
        "add",
        panel.undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.manageEventListener("add", panel.redoButton, "click", this.onRedoClick);
      DOM.manageEventListener(
        "add",
        panel.redoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.manageEventListener("add", panel.deleteButton, "click", this.onRemoveAll);
      DOM.manageEventListener(
        "add",
        panel.deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.manageEventListener("add", panel.saveButton, "click", this.onSaveClick);
      DOM.manageEventListener(
        "add",
        panel.saveButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel.saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  public removeEvents() {
    const { panel } = this.props;

    if (panel.undoButton) {
      DOM.manageEventListener("remove", panel.undoButton, "click", this.onUndoClick);
      DOM.manageEventListener(
        "remove",
        panel.undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.manageEventListener("remove", panel.deleteButton, "click", this.onRemoveAll);
      DOM.manageEventListener(
        "remove",
        panel.deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.manageEventListener("remove", panel.redoButton, "click", this.onRedoClick);
      DOM.manageEventListener(
        "remove",
        panel.redoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.manageEventListener("remove", panel.saveButton, "click", this.onSaveClick);
      DOM.manageEventListener(
        "remove",
        panel.saveButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel.saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  private getButtonLabel = (type: ButtonType) => {
    const { options } = this.props;

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
          label: label,
          placement: "bottom",
        })
        .setPosition(this.tooltip.getPosition(event, "bottom"));
    }
  };

  private onMouseLeave = () => {
    this.tooltip.remove();
  };

  private onRemoveAll = (event: Event) => {
    const { renderer, mode, panel, store, map } = this.props;
    store.reset();
    panel.hidePanel();
    mode.reset();
    this.tooltip.remove();
    renderer.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  private onUndoClick = (event: Event) => {
    const { store, map, renderer } = this.props;
    if (store.size == 1) {
      store.reset();
    } else {
      // deletes the primary point (!)
      timeline.undo();
      if (store.tail) {
        store.notify({
          type: "STORE_UNDO",
          data: {
            node: store.tail,
          }
        })
      }
      Spatial.switchToLineModeIfCan(this.props);
      this.tooltip.remove();
      const step = { ...(store.tail?.val as Step), total: store.size };
      FireEvents.undoPoint(step, map, event);
      renderer.render();
    }
  };

  private onRedoClick = () => {
    const { renderer, store } = this.props;

    const cmd = timeline.redo();
    if (cmd && cmd.type === "STORE_POINT_ADDED") {
      store.notify({
        type: "STORE_POINT_ADDED",
      })
    }
    renderer.render();
  }

  private onSaveClick = (event: Event) => {
    const { store, options } = this.props;

    FireEvents.onSaveClick(this.props, StoreHelpers.toArray(store.head), event);
    this.tooltip.remove();
    if (options.panel.buttons.save.clearOnSave) {
      this.onRemoveAll(event);
    }
  };
}
