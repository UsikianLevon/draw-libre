import type { UnifiedMap } from "#app/types/map";
import type { LatLng, RequiredDrawOptions } from "#app/types/index";
import type { Store } from "#app/store/index";
import type { DrawingMode } from "#components/map/mode";
import { PanelUIState } from "./state";
import { PanelView } from "./view";
import "./panel.css";

export interface Context {
  map: UnifiedMap;
  mode: DrawingMode;
  options: RequiredDrawOptions;
  store: Store;
}

const OFFSET_Y = 20;

export class Panel {
  private readonly view: PanelView;
  private readonly state = new PanelUIState();

  private resizeObserver!: ResizeObserver;

  private readonly onMapMove = () => this.schedulePositionUpdate();

  constructor(private readonly ctx: Context) {
    this.view = new PanelView(ctx);
    this.init();
  }

  private init() {
    const { store } = this.ctx;

    this.resizeObserver = this.view.observeResize(this.measureAnchor);
    this.measureAnchor();

    if (store.tail?.val) this.setPanelLocation(store.tail.val);
  }

  public destroy() {
    if (this.state.listenersActive) {
      this.disableListeners();
    }
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.state.rafId);
    this.view.destroy();
  }

  private enableListeners() {
    if (this.state.listenersActive) return;
    const map = this.ctx.map;
    map.on("move", this.onMapMove);
    map.on("zoom", this.onMapMove);
    this.state.listenersActive = true;
  }

  private disableListeners() {
    if (!this.state.listenersActive) return;
    const map = this.ctx.map;
    map.off("move", this.onMapMove);
    map.off("zoom", this.onMapMove);
    this.state.listenersActive = false;
  }

  public setPanelLocation = (coordinates: LatLng) => {
    this.state.pendingCoord = coordinates;
    this.enableListeners();
    this.schedulePositionUpdate();
    this.show();
  };

  private measureAnchor = () => {
    const { width, height } = this.view.getRoot().getBoundingClientRect();
    this.state.anchor = { dx: -width / 2, dy: -height - OFFSET_Y };
    this.schedulePositionUpdate();
  };

  private schedulePositionUpdate = () => {
    if (this.state.rafId) return;
    this.state.rafId = requestAnimationFrame(() => {
      this.state.rafId = 0;
      if (this.state.pendingCoord) {
        const point = this.ctx.map.project(this.state.pendingCoord);
        const { dx, dy } = this.state.anchor;
        this.view.setTransform(point.x + dx, point.y + dy);
      }
    });
  };

  private setVisible(visible: boolean) {
    this.state.isHidden = !visible;
    if (visible) this.view.show();
    else this.view.hide();
  }

  public show = () => this.setVisible(true);
  public hide = () => this.setVisible(false);

  public get undoButton() {
    return this.view.getButton("undo");
  }

  public get redoButton() {
    return this.view.getButton("redo");
  }

  public get deleteButton() {
    return this.view.getButton("delete");
  }

  public get saveButton() {
    return this.view.getButton("save");
  }
}
