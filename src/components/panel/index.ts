import type { CustomMap } from "#types/map";
import type { LatLng, PanelImpl, Point, RequiredDrawOptions } from "#types/index";
import { DOM } from "#utils/dom";
import type { Store } from "#store/index";
import type { DrawingMode } from "#components/map/mode";
import "./panel.css";

interface IProps {
  map: CustomMap;
  mode: DrawingMode;
  options: RequiredDrawOptions;
  store: Store;
}

export class Panel {
  #props: IProps;
  #isHidden: boolean;
  #panelPopup: HTMLElement | undefined;
  _undoButton: HTMLElement | undefined;
  _deleteButton: HTMLElement | undefined;
  _saveButton: HTMLElement | undefined;
  _container: HTMLElement | undefined;
  _updatePositionCallback: (() => void) | undefined;

  constructor(props: IProps) {
    this.#props = props;
    this._container = undefined;
    this.#isHidden = true;
    this.#panelPopup = undefined;
    this.#init();
  }

  #applyPanelStyles() {
    if (!this.#panelPopup) return;

    this.#panelPopup.className = "dashboard-container";
    this.#panelPopup.style.position = "absolute";
    this.#panelPopup.style.zIndex = "1000000";
    this.#panelPopup.style.pointerEvents = "auto";
    this.#panelPopup.style.display = this.#isHidden ? "none" : "block";
  }

  #init = () => {
    const { store } = this.#props;

    this.createPanel();

    this.#panelPopup = document.createElement("div");
    this.#applyPanelStyles();

    if (this._container) {
      this.#panelPopup.appendChild(this._container);
    }

    document.body.appendChild(this.#panelPopup);

    if (store.tail?.val) {
      this.setPanelLocation({
        lat: store.tail?.val?.lat,
        lng: store.tail?.val?.lng,
      });
    }
  };

  setPanelLocation = (coordinates: LatLng) => {
    if (!this.#panelPopup) return;
    if (this.#isHidden) {
      this.showPanel();
    }
    const point = this.#props.map.project(coordinates);
    this.#pointPositionUpdate(point);
    this.#updatePanelPositionOnMapMove(coordinates);
  };

  #pointPositionUpdate = (point: Point) => {
    if (this.#isHidden || !this.#panelPopup) return;

    const mapContainer = this.#props.map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();

    const x = mapRect.left + point.x;
    const y = mapRect.top + point.y;
    const offset = 36;

    this.#panelPopup.style.left = `${x - offset}px`;
    this.#panelPopup.style.top = `${y - offset}px`;
  };

  #updatePanelPositionOnMapMove(coordinates: LatLng) {
    this.#removeMapEventListeners();

    this._updatePositionCallback = () => {
      if (this.#isHidden || !this.#panelPopup) return;
      this.#pointPositionUpdate(this.#props.map.project(coordinates));
    };

    this.#props.map.on("move", this._updatePositionCallback);
    this.#props.map.on("zoom", this._updatePositionCallback);
  }

  #removeMapEventListeners() {
    if (this._updatePositionCallback) {
      this.#props.map.off("move", this._updatePositionCallback);
      this.#props.map.off("zoom", this._updatePositionCallback);
      this._updatePositionCallback = undefined;
    }
  }

  showPanel = () => {
    if (this.#isHidden && this.#panelPopup) {
      this.#isHidden = false;
      this.#panelPopup.style.display = "block";

      this.#panelPopup.style.transition = "opacity 0.2s";
      this.#panelPopup.style.opacity = "1";
    }
  };

  hidePanel = () => {
    if (!this.#isHidden && this.#panelPopup) {
      this.#isHidden = true;
      this.#panelPopup.style.display = "none";
    }
  };

  removePanel = () => {
    if (this._updatePositionCallback) {
      this.#props.map.off("move", this._updatePositionCallback);
      this.#props.map.off("zoom", this._updatePositionCallback);
      this._updatePositionCallback = undefined;
    }

    if (this.#panelPopup) {
      document.body.removeChild(this.#panelPopup);
      this.#panelPopup = undefined;
    }

    if (this._container) {
      DOM.remove(this._container);
      this._container = undefined;
    }
  };

  #createButton = (type: "undo" | "save" | "delete", title: string, size: PanelImpl["size"], container: HTMLElement) => {
    const button = DOM.create("button", `panel-button panel-button-${size}`, container);
    button.setAttribute("data-type", type);
    button.setAttribute("aria-label", title);
    DOM.create("span", `icon ${type} icon-${size}`, button);
    return button;
  };

  createPanel = () => {
    const { options } = this.#props;
    const { locale } = options;
    const { undo, delete: deleteButton, save } = options.panel.buttons;
    const panelSize = options.panel.size;

    const container = DOM.create("div", "dashboard");

    if (undo.visible) {
      this._undoButton = this.#createButton("undo", locale.undo, panelSize, container);
    }
    if (deleteButton.visible) {
      this._deleteButton = this.#createButton("delete", locale.delete, panelSize, container);
    }
    if (save.visible) {
      this._saveButton = this.#createButton("save", locale.save, panelSize, container);
    }
    this._container = container;
  };
}
