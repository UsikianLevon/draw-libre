import { StoreHelpers } from "#store/index";
import type { ButtonType, EventsProps, Step, StepId } from "#types/index";
import type { HTMLEvent } from "#types/helpers";
import { DOM } from "#utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { Spatial } from "#utils/helpers";
import { togglePointCircleRadius } from "#components/map/tiles/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { PointHelpers } from "#components/map/points/helpers";
import type { StoreChangeEvent } from "#store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";

export class PanelEvents {
  #props: EventsProps;
  #tooltip: Tooltip;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#tooltip = new Tooltip();
  }

  initConsumers() {
    this.#props.store.addObserver(this.#storeEventsConsumer);
    this.#props.mode?.addObserver(this.#mapModeConsumer);
  }

  removeConsumers() {
    this.#props.store.removeObserver(this.#storeEventsConsumer);
    this.#props.mode?.removeObserver(this.#mapModeConsumer);
  }

  #storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_CHANGED") {
      const { data } = event;
      if (data.size === 0) {
        this.#props.panel.hidePanel();
      } else {
        let current = Object.assign({}, data);
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.#props.panel.setPanelLocation({
                lat: current.tail.val.lat,
                lng: current.tail.val.lng,
              });
            }
            break
          }
        }
      }
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.#props;
    const { type, data } = event;
    if (type === "MODE_CHANGED" && !data) {
      this.#props.panel.hidePanel();
    }
    if (type === "MODE_CHANGED" && data) {
      if (store.tail?.val) {
        this.#props.panel.setPanelLocation({
          lat: store.tail?.val?.lat,
          lng: store.tail?.val?.lng,
        });
      }
    }
  };

  initEvents() {
    const { panel } = this.#props;

    if (panel._undoButton) {
      DOM.manageEventListener("add", panel._undoButton, "click", this.#onUndoClick);
      DOM.manageEventListener(
        "add",
        panel._undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject
      );
      DOM.manageEventListener("add", panel._undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel._deleteButton) {
      DOM.manageEventListener("add", panel._deleteButton, "click", this.#onRemoveAll);
      DOM.manageEventListener(
        "add",
        panel._deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject
      );
      DOM.manageEventListener("add", panel._deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel._saveButton) {
      DOM.manageEventListener("add", panel._saveButton, "click", this.onSaveClick);
      DOM.manageEventListener(
        "add",
        panel._saveButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject
      );
      DOM.manageEventListener("add", panel._saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  removeEvents() {
    const { panel } = this.#props;

    if (panel._undoButton) {
      DOM.manageEventListener("remove", panel._undoButton, "click", this.#onUndoClick);
      DOM.manageEventListener(
        "remove",
        panel._undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel._undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel._deleteButton) {
      DOM.manageEventListener("remove", panel._deleteButton, "click", this.#onRemoveAll);
      DOM.manageEventListener(
        "remove",
        panel._deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel._deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel._saveButton) {
      DOM.manageEventListener("remove", panel._saveButton, "click", this.onSaveClick);
      DOM.manageEventListener(
        "remove",
        panel._saveButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel._saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  #getButtonLabel = (type: ButtonType) => {
    const { options } = this.#props;

    const LABELS: Record<ButtonType, string> = {
      undo: options.locale.undo,
      delete: options.locale.delete,
      save: options.locale.save,
    };

    return LABELS[type];
  };

  onMouseEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const type = event.target.getAttribute("data-type") as ButtonType;
    if (type) {
      const label = this.#getButtonLabel(type);

      this.#tooltip
        .create({
          label: label,
          placement: "bottom",
        })
        .setPosition(this.#tooltip.getPosition(event, "bottom"));
    }
  };

  onMouseLeave = () => {
    this.#tooltip.remove();
  };

  #onRemoveAll = (event: Event) => {
    const { tiles, mode, panel, store, map } = this.#props;
    store.reset();
    panel.hidePanel();
    mode.reset();
    togglePointCircleRadius(map, "default");
    map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "none");
    this.#tooltip.remove();
    tiles.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  #removeStep = () => {
    const { store, options } = this.#props;

    // Remove the last point
    store.removeNodeById(store.tail?.val?.id as StepId);
    // if we are in aux mode then remove 2 aux points and then add 1 aux point between the 2 points
    if (options.pointGeneration === "auto") {
      store.removeNodeById(store.tail?.val?.id as StepId);
      if (store.tail?.val?.isAuxiliary) {
        store.removeNodeById(store.tail?.val?.id);
        if (!Spatial.canBreakClosedGeometry(store, options)) {
          const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail.val, store.head?.val as Step);
          store.push(auxPoint);
        }
        store.tail.next = store.head;
      }
    }
  }

  #onUndoClick = (event: Event) => {
    const { store, map, tiles, options } = this.#props;
    if (store.size == 1) {
      store.reset();
    }

    this.#removeStep();
    Spatial.switchToLineModeIfCan(this.#props);
    if (Spatial.canBreakClosedGeometry(store, options)) {
      togglePointCircleRadius(map, "default");
    }
    this.#tooltip.remove();
    const step = { ...store.tail?.val as Step, total: store.size };
    FireEvents.undoPoint(step, map, event);
    tiles.render();
  };

  onSaveClick = (event: Event) => {
    const { store, options } = this.#props;

    FireEvents.onSaveClick(this.#props, StoreHelpers.toArray(store.head), event);
    this.#tooltip.remove();
    if (options.panel.buttons.save.clearOnSave) {
      this.#onRemoveAll(event);
    }
  };
}
