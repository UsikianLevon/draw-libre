import type { UnifiedMap } from "#app/types/map";
import type { ButtonType, LatLng, PanelImpl, RequiredDrawOptions } from "#app/types/index";
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

const OFFSET_Y = 20;

export class Panel {
  /** DOM-nodes will appear after init, that's why ! assertion is used */
  private panelPopup!: HTMLDivElement;  // Container for the entire popup
  private container!: HTMLDivElement;   // Inner container for buttons
  private resizeObserver!: ResizeObserver;
  private isHidden = true;             // Visibility state
  private anchor = { dx: 0, dy: 0 };   // Offset from geographic point
  private pendingCoord: LatLng | null = null;       // Current geographic coordinates for panel placement
  private rafId = 0;                   // ID for requestAnimationFrame to prevent duplicates
  private readonly onMapMove = () => this.schedulePositionUpdate();
  private listenersActive = false;

  // Public buttons that can be accessed by parent class
  public undoButton?: HTMLButtonElement;
  public redoButton?: HTMLButtonElement;
  public deleteButton?: HTMLButtonElement;
  public saveButton?: HTMLButtonElement;

  constructor(private readonly props: IProps) {
    this.init();
  }

  private init() {
    const { store, map } = this.props;

    this.createPanel();

    this.panelPopup = DOM.create("div", "dashboard-container");
    if (this.isHidden) this.panelPopup.classList.add("hidden");
    this.panelPopup.appendChild(this.container);

    map.getContainer().appendChild(this.panelPopup);

    this.resizeObserver = new ResizeObserver(this.measureAnchor);
    this.resizeObserver.observe(this.panelPopup);
    this.measureAnchor();

    if (store.tail?.val) this.setPanelLocation(store.tail.val);
  }

  public destroy() {
    if (this.listenersActive) {
      this.disableListeners();
    }
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.rafId);
    this.panelPopup.remove();
  }

  private enableListeners() {
    if (this.listenersActive) return;
    const map = this.props.map;
    map.on("move", this.onMapMove);
    map.on("zoom", this.onMapMove);
    this.listenersActive = true;
  }

  private disableListeners() {
    if (!this.listenersActive) return;
    const map = this.props.map;
    map.off("move", this.onMapMove);
    map.off("zoom", this.onMapMove);
    this.listenersActive = false;
  }

  public setPanelLocation = (coordinates: LatLng) => {
    this.pendingCoord = coordinates;
    this.enableListeners();
    this.schedulePositionUpdate();
    this.show();
  };

  public show = () => this.toggleVisibility(true);
  public hide = () => this.toggleVisibility(false);

  private measureAnchor = () => {
    const { width, height } = this.panelPopup.getBoundingClientRect();
    this.anchor = { dx: -width / 2, dy: -height - OFFSET_Y };
    this.schedulePositionUpdate();
  };

  private schedulePositionUpdate = () => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if (this.pendingCoord) {
        const point = this.props.map.project(this.pendingCoord);
        const { dx, dy } = this.anchor;
        this.panelPopup.style.transform = `translate(${point.x + dx}px, ${point.y + dy}px)`;
      }
    });
  };

  private toggleVisibility(visible: boolean) {
    this.isHidden = !visible;
    this.panelPopup.classList.toggle("hidden", !visible);
  }

  private createButton(type: ButtonType, title: string, size: PanelImpl["size"], container: HTMLElement) {
    const button = DOM.create("button", `panel-button panel-button-${size}`, container);
    button.setAttribute("data-type", type);
    button.setAttribute("aria-label", title);
    DOM.create("span", `icon ${type} icon-${size}`, button);
    return button as HTMLButtonElement;
  }

  private createPanel() {
    const { options } = this.props;
    const { locale } = options;
    const btns = options.panel.buttons;
    const panelSize = options.panel.size;

    this.container = DOM.create("div", "dashboard");

    if (btns.undo.visible) this.undoButton = this.createButton("undo", locale.undo, panelSize, this.container);
    if (btns.redo.visible) this.redoButton = this.createButton("redo", locale.redo, panelSize, this.container);
    if (btns.delete.visible) this.deleteButton = this.createButton("delete", locale.delete, panelSize, this.container);
    if (btns.save.visible) this.saveButton = this.createButton("save", locale.save, panelSize, this.container);
  }
}
