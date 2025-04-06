import { StoreHelpers } from "#store/index";
import type { ButtonType, EventsProps, Step } from "#types/index";
import type { HTMLEvent } from "#types/helpers";
import { DOM } from "#utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { Spatial } from "#utils/helpers";
import { togglePointCircleRadius } from "#components/map/tiles/helpers";
import { ELAYERS } from "#utils/geo_constants";

export class PanelEvents {
  #props: EventsProps;
  #tooltip: Tooltip;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#tooltip = new Tooltip();
  }

  initEvents() {
    const { panel } = this.#props;
    if (panel) {
      DOM.manageEventListener("add", panel?._undoButton, "click", this.#onUndoClick);
      DOM.manageEventListener(
        "add",
        panel?._undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel?._undoButton, "mouseleave", this.onMouseLeave);
    }
    if (panel) {
      DOM.manageEventListener("add", panel?._deleteButton, "click", this.#onRemoveAll);
      DOM.manageEventListener(
        "add",
        panel?._deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel?._deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel) {
      DOM.manageEventListener("add", panel?._saveButton, "click", this.onSaveClick);
      DOM.manageEventListener(
        "add",
        panel?._saveButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("add", panel?._saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  removeEvents() {
    const { panel } = this.#props;

    if (panel?._undoButton) {
      DOM.manageEventListener("remove", panel._undoButton, "click", this.#onUndoClick);
      DOM.manageEventListener(
        "remove",
        panel._undoButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel._undoButton, "mouseleave", this.onMouseLeave);
    }
    if (panel?._deleteButton) {
      DOM.manageEventListener("remove", panel._deleteButton, "click", this.#onRemoveAll);
      DOM.manageEventListener(
        "remove",
        panel._deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.manageEventListener("remove", panel._deleteButton, "mouseleave", this.onMouseLeave);
    }
    if (panel?._saveButton) {
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

    const LABELS = {
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

  #onUndoClick = (event: Event) => {
    const { store, panel, map, tiles } = this.#props;

    const tailVal = store.tail?.val as Step;
    store.removeStepById(tailVal.id);

    const step = { ...tailVal, total: store.size };
    FireEvents.undoPoint(step, map, event);

    // if we have only 2 points left, we need to switch to line mode and update the tail.next to null
    Spatial.switchToLineModeIfCan(this.#props);

    // after removing the last point, we need to set the panel coordinates to the new last point
    panel?.onPointRemove(store.tail?.val as Step);
    this.#tooltip.remove();
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
