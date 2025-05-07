import type { UnifiedMap } from "#app/types/map";
import type { ButtonType, LatLng, PanelImpl, Point, RequiredDrawOptions } from "#app/types/index";
import { DOM } from "#app/utils/dom";
import type { Store } from "#app/store/index";
import type { DrawingMode } from "#components/map/mode";
import "./panel.css";

interface IProps {
  map: UnifiedMap;
  mode: DrawingMode;
  options: RequiredDrawOptions;
  store: Store;
}

export class Panel {
  private isHidden: boolean;
  private panelPopup: HTMLElement | undefined;
  private container: HTMLElement | undefined;
  private updatePositionCallback: (() => void) | undefined;
  public undoButton: HTMLElement | undefined;
  public redoButton: HTMLElement | undefined;
  public deleteButton: HTMLElement | undefined;
  public saveButton: HTMLElement | undefined;

  constructor(private readonly props: IProps) {
    this.container = undefined;
    this.isHidden = true;
    this.panelPopup = undefined;
    this.init();
  }

  private applyPanelStyles = () => {
    if (!this.panelPopup) return;

    this.panelPopup.style.position = "absolute";
    this.panelPopup.style.zIndex = "1000000";
    this.panelPopup.style.pointerEvents = "auto";
    this.panelPopup.style.display = this.isHidden ? "none" : "block";
  }

  private init = () => {
    const { store } = this.props;

    this.createPanel();

    this.panelPopup = DOM.create("div", "dashboard-container");
    this.applyPanelStyles();

    if (this.container) {
      this.panelPopup.appendChild(this.container);
    }

    document.body.appendChild(this.panelPopup);
    this.props.map.getContainer().appendChild(this.panelPopup as HTMLElement);

    if (store.tail?.val) {
      this.setPanelLocation({
        lat: store.tail?.val?.lat,
        lng: store.tail?.val?.lng,
      });
    }
  };

  private calcAnchorOffset = () => {
    if (!this.panelPopup) return { dx: 0, dy: 0 };

    const wasHidden = this.panelPopup.style.display === "none";
    if (wasHidden) {
      this.panelPopup.style.visibility = "hidden";
      this.panelPopup.style.display = "block";
    }

    const { width, height } = this.panelPopup.getBoundingClientRect();

    if (wasHidden) {
      this.panelPopup.style.display = "none";
      this.panelPopup.style.visibility = "";
    }

    const GAP = 20;

    return {
      dx: -width / 2,
      dy: -height - GAP,
    };
  };


  public setPanelLocation = (coordinates: LatLng) => {
    if (!this.panelPopup) return;
    if (this.isHidden) {
      this.showPanel();
    }
    const point = this.props.map.project(coordinates);
    this.pointPositionUpdate(point);
    this.updatePanelPositionOnMapMove(coordinates);
  };

  private pointPositionUpdate = (point: Point) => {
    if (this.isHidden || !this.panelPopup) return;

    const { dx, dy } = this.calcAnchorOffset();

    this.panelPopup.style.left = '0'
    this.panelPopup.style.top = '0'

    this.panelPopup.style.transform =
      `translate3d(${point.x + dx}px, ${point.y + dy}px, 0)`;

    this.panelPopup.style.willChange = "transform";
  };

  private updatePanelPositionOnMapMove = (coordinates: LatLng) => {
    this.removeMapEventListeners();

    this.updatePositionCallback = () => {
      if (this.isHidden || !this.panelPopup) return;
      this.pointPositionUpdate(this.props.map.project(coordinates));
    };

    this.props.map.on("move", this.updatePositionCallback);
    this.props.map.on("zoom", this.updatePositionCallback);
  }

  private removeMapEventListeners = () => {
    if (this.updatePositionCallback) {
      this.props.map.off("move", this.updatePositionCallback);
      this.props.map.off("zoom", this.updatePositionCallback);
      this.updatePositionCallback = undefined;
    }
  }

  public showPanel = () => {
    if (this.isHidden && this.panelPopup) {
      this.isHidden = false;
      this.panelPopup.style.display = "block";

      this.panelPopup.style.transition = "opacity 0.2s";
      this.panelPopup.style.opacity = "1";
    }
  };

  public hidePanel = () => {
    if (!this.isHidden && this.panelPopup) {
      this.isHidden = true;
      this.panelPopup.style.display = "none";
    }
  };

  public removePanel = () => {
    if (this.updatePositionCallback) {
      this.props.map.off("move", this.updatePositionCallback);
      this.props.map.off("zoom", this.updatePositionCallback);
      this.updatePositionCallback = undefined;
    }

    if (this.panelPopup) {
      // безопаснее так: parentNode может быть любым
      this.panelPopup.remove();
      this.panelPopup = undefined;
    }

    if (this.container) {
      DOM.remove(this.container);
      this.container = undefined;
    }
  };

  private createButton = (
    type: ButtonType,
    title: string,
    size: PanelImpl["size"],
    container: HTMLElement,
  ) => {
    const button = DOM.create("button", `panel-button panel-button-${size}`, container);
    button.setAttribute("data-type", type);
    button.setAttribute("aria-label", title);
    DOM.create("span", `icon ${type} icon-${size}`, button);
    return button;
  };

  private createPanel = () => {
    const { options } = this.props;
    const { locale } = options;
    const { undo, delete: deleteButton, save, redo } = options.panel.buttons;
    const panelSize = options.panel.size;

    const container = DOM.create("div", "dashboard");

    if (undo.visible) {
      this.undoButton = this.createButton("undo", locale.undo, panelSize, container);
    }
    if (redo.visible) {
      this.redoButton = this.createButton("redo", locale.redo, panelSize, container);
    }
    if (deleteButton.visible) {
      this.deleteButton = this.createButton("delete", locale.delete, panelSize, container);
    }
    if (save.visible) {
      this.saveButton = this.createButton("save", locale.save, panelSize, container);
    }
    this.container = container;
  };
}
