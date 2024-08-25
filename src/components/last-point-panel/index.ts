import type { Map } from "#types/map";
import type { LatLng, PanelImpl, RequiredDrawOptions, Step } from "#types/index";
import { DOM } from "#utils/dom";
import { Store } from "#store/index";
import { Popup } from "#components/map/popup/index";
import "./panel.css";

interface IProps {
  map: Map;
  options: RequiredDrawOptions;
  store: Store;
}

export class Panel {
  #props: IProps;
  #panelPopup: Popup | undefined;
  #isHidden: boolean;
  _undoButton: HTMLElement | undefined;
  // used outside in events
  _deleteButton: HTMLElement | undefined;
  _saveButton: HTMLElement | undefined;
  _container: HTMLElement | undefined;

  constructor(props: IProps) {
    this.#props = props;
    this._container = undefined;
    this.#isHidden = false;
    this.#importPopup().then(() => {
      this.#initPopup();
      props.map.fire("panel:ready");
    });
  }

  #importPopup = async () => {
    const { map } = this.#props;
    try {
      this.#panelPopup = new Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        anchor: "bottom",
      });
    } catch (error) {
      console.error("POPUP LOAD ERROR", error);
    }
  };

  #initPopup = () => {
    const { store } = this.#props;

    this.createPanel();
    if (store.tail?.val) {
      this.setPanelLocation({
        lat: store.tail?.val?.lat,
        lng: store.tail?.val?.lng,
      });
    }
  };

  setPanelLocation = (coordinates: LatLng) => {
    const { map } = this.#props;

    if (this.#isHidden) {
      this.#isHidden = false;
      this.showPanel();
    }
    if (this._container && this.#panelPopup) {
      this.#panelPopup.setLngLat(coordinates).setDOMContent(this._container).addTo(map);
    }
  };

  hidePanel = () => {
    const notHidden = !this.#isHidden;
    if (notHidden) {
      this.#panelPopup?.addClassName("hide-panel");
      this.#isHidden = true;
    }
  };

  showPanel = () => {
    this.#panelPopup?.removeClassName("hide-panel");
    this.#isHidden = false;
  };

  onPointRemove = (head: Step) => {
    if (head) {
      this.setPanelLocation(head);
    } else {
      this.hidePanel();
    }
  };

  removePanel = () => {
    if (this._container) {
      DOM.remove(this._container);
    }
    this.#panelPopup?.remove();
  };

  createButton = (type: "undo" | "save" | "delete", title: string, size: PanelImpl["size"], container: HTMLElement) => {
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

    const popupContent = document.querySelector(".maplibregl-popup-content") as HTMLElement;
    const container = DOM.create("div", "dashboard", popupContent);

    if (undo.visible) {
      this._undoButton = this.createButton("undo", locale.undo, panelSize, container);
    }
    if (deleteButton.visible) {
      this._deleteButton = this.createButton("delete", locale.delete, panelSize, container);
    }
    if (save.visible) {
      this._saveButton = this.createButton("save", locale.save, panelSize, container);
    }
    this._container = container;
  };
}
