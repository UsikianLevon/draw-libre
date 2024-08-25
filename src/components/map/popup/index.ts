import { extend } from "./util/index";
import { Event, Evented } from "./util/evented";
import { DOM } from "#utils/dom";
import { LngLat } from "./util/lnglat";
import { Point } from "./util/point";
import { smartWrap } from "./util/index";
import { anchorTranslate, applyAnchorClass } from "./util/index";

const defaultOptions = {
  closeButton: true,
  closeOnClick: true,
  focusAfterOpen: true,
  className: "",
  maxWidth: "240px",
  subpixelPositioning: false,
};
export type Offset = any;

export type PopupOptions = {
  closeButton?: boolean;
  closeOnClick?: boolean;
  closeOnMove?: boolean;
  focusAfterOpen?: boolean;
  anchor?: any;
  offset?: Offset;
  className?: string;
  maxWidth?: string;
  subpixelPositioning?: boolean;
};

const focusQuerySelector = [
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]:not([contenteditable='false'])",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(", ");

export class Popup extends Evented {
  _map: any;
  options: any;
  _content: any;
  _container: any;
  _closeButton: any;
  _tip: any;
  _lngLat: any;
  _trackPointer: any;
  _pos: any;
  _flatPos: any;

  constructor(options?: PopupOptions) {
    super();
    this.options = extend(Object.create(defaultOptions), options);
  }

  addTo(map: any): this {
    if (this._map) this.remove();

    this._map = map;
    if (this.options.closeOnClick) {
      this._map.on("click", this._onClose);
    }

    if (this.options.closeOnMove) {
      this._map.on("move", this._onClose);
    }

    this._map.on("remove", this.remove);
    this._update();
    this._focusFirstElement();

    if (this._trackPointer) {
      this._map.on("mousemove", this._onMouseMove);
      this._map.on("mouseup", this._onMouseUp);
      if (this._container) {
        this._container.classList.add("maplibregl-popup-track-pointer");
      }
      this._map._canvasContainer.classList.add("maplibregl-track-pointer");
    } else {
      this._map.on("move", this._update);
    }

    (this as any).fire(new Event("open"));

    return this;
  }
  isOpen() {
    return !!this._map;
  }
  remove = (): this => {
    if (this._content) {
      DOM.remove(this._content);
    }

    if (this._container) {
      DOM.remove(this._container);
      delete this._container;
    }

    if (this._map) {
      this._map.off("move", this._update);
      this._map.off("move", this._onClose);
      this._map.off("click", this._onClose);
      this._map.off("remove", this.remove);
      this._map.off("mousemove", this._onMouseMove);
      this._map.off("mouseup", this._onMouseUp);
      this._map.off("drag", this._onDrag);
      this._map._canvasContainer.classList.remove("maplibregl-track-pointer");
      delete this._map;
      (this as any).fire(new Event("close"));
    }

    return this;
  };

  getLngLat(): LngLat {
    return this._lngLat;
  }

  setLngLat(lnglat: any): this {
    this._lngLat = LngLat.convert(lnglat);
    this._pos = null;
    this._flatPos = null;

    this._trackPointer = false;

    this._update();

    if (this._map) {
      this._map.on("move", this._update);
      this._map.off("mousemove", this._onMouseMove);
      if (this._container) {
        this._container.classList.remove("maplibregl-popup-track-pointer");
      }
      this._map._canvasContainer.classList.remove("maplibregl-track-pointer");
    }

    return this;
  }

  trackPointer(): this {
    this._trackPointer = true;
    this._pos = null;
    this._flatPos = null;
    this._update();
    if (this._map) {
      this._map.off("move", this._update);
      this._map.on("mousemove", this._onMouseMove);
      this._map.on("drag", this._onDrag);
      if (this._container) {
        this._container.classList.add("maplibregl-popup-track-pointer");
      }
      this._map._canvasContainer.classList.add("maplibregl-track-pointer");
    }

    return this;
  }

  getElement(): HTMLElement {
    return this._container;
  }

  setText(text: string): this {
    return this.setDOMContent(document.createTextNode(text));
  }

  setHTML(html: string): this {
    const frag = document.createDocumentFragment();
    const temp = document.createElement("body");
    let child;
    temp.innerHTML = html;
    while (true) {
      child = temp.firstChild;
      if (!child) break;
      frag.appendChild(child);
    }

    return this.setDOMContent(frag);
  }

  getMaxWidth(): string {
    return this._container?.style.maxWidth;
  }

  setMaxWidth(maxWidth: string): this {
    this.options.maxWidth = maxWidth;
    this._update();
    return this;
  }

  setDOMContent(htmlNode: Node): this {
    if (this._content) {
      while (this._content.hasChildNodes()) {
        if (this._content.firstChild) {
          this._content.removeChild(this._content.firstChild);
        }
      }
    } else {
      this._content = DOM.create("div", "maplibregl-popup-content", this._container);
    }

    this._content.appendChild(htmlNode);
    this._createCloseButton();
    this._update();
    this._focusFirstElement();
    return this;
  }

  addClassName(className: string) {
    if (this._container) {
      this._container.classList.add(className);
    }
    return this;
  }

  removeClassName(className: string) {
    if (this._container) {
      this._container.classList.remove(className);
    }
    return this;
  }

  setOffset(offset?: Offset): this {
    this.options.offset = offset;
    this._update();
    return this;
  }

  toggleClassName(className: string): boolean | undefined {
    if (this._container) {
      return this._container.classList.toggle(className);
    }
  }

  setSubpixelPositioning(value: boolean) {
    this.options.subpixelPositioning = value;
  }

  _createCloseButton() {
    if (this.options.closeButton) {
      this._closeButton = DOM.create("button", "maplibregl-popup-close-button", this._content);
      this._closeButton.type = "button";
      this._closeButton.innerHTML = "&#215;";
      this._closeButton.addEventListener("click", this._onClose);
    }
  }

  _onMouseUp = (event: any) => {
    this._update(event.point);
  };

  _onMouseMove = (event: any) => {
    this._update(event.point);
  };

  _onDrag = (event: any) => {
    this._update(event.point);
  };

  _update = (cursor?: any) => {
    const hasPosition = this._lngLat || this._trackPointer;

    if (!this._map || !hasPosition || !this._content) {
      return;
    }

    if (!this._container) {
      this._container = DOM.create("div", "maplibregl-popup", this._map.getContainer());
      this._tip = DOM.create("div", "maplibregl-popup-tip", this._container);
      this._container.appendChild(this._content);
      if (this.options.className) {
        for (const name of this.options.className.split(" ")) {
          this._container.classList.add(name);
        }
      }

      if (this._closeButton) {
        this._closeButton.setAttribute("aria-label", this._map._getUIString("Popup.Close"));
      }

      if (this._trackPointer) {
        this._container.classList.add("maplibregl-popup-track-pointer");
      }
    }

    if (this.options.maxWidth && this._container.style.maxWidth !== this.options.maxWidth) {
      this._container.style.maxWidth = this.options.maxWidth;
    }

    if (this._map.transform.renderWorldCopies && !this._trackPointer) {
      this._lngLat = smartWrap(this._lngLat, this._flatPos, this._map.transform);
    } else {
      this._lngLat = this._lngLat?.wrap();
    }

    if (this._trackPointer && !cursor) return;

    const pos = (this._flatPos = this._pos = this._trackPointer && cursor ? cursor : this._map.project(this._lngLat));
    if (this._map.terrain) {
      // flat position is saved because smartWrap needs non-elevated points
      this._flatPos = this._trackPointer && cursor ? cursor : this._map.transform.locationPoint(this._lngLat);
    }

    let anchor = this.options.anchor;
    const offset = normalizeOffset(this.options.offset);

    if (!anchor) {
      const width = this._container.offsetWidth;
      const height = this._container.offsetHeight;
      let anchorComponents: any;

      if (pos.y + offset.bottom.y < height) {
        anchorComponents = ["top"];
      } else if (pos.y > this._map.transform.height - height) {
        anchorComponents = ["bottom"];
      } else {
        anchorComponents = [];
      }

      if (pos.x < width / 2) {
        anchorComponents.push("left");
      } else if (pos.x > this._map.transform.width - width / 2) {
        anchorComponents.push("right");
      }

      if (anchorComponents.length === 0) {
        anchor = "bottom";
      } else {
        anchor = anchorComponents.join("-") as any;
      }
    }

    let offsetedPos = pos.add((offset as any)[anchor]);

    if (!this.options.subpixelPositioning) {
      offsetedPos = offsetedPos.round();
    }

    DOM.setTransform(
      this._container,
      `${(anchorTranslate as any)[anchor]} translate(${offsetedPos.x}px,${offsetedPos.y}px)`,
    );
    applyAnchorClass(this._container, anchor, "popup");
  };

  _focusFirstElement() {
    if (!this.options.focusAfterOpen || !this._container) return;

    const firstFocusable = this._container.querySelector(focusQuerySelector) as HTMLElement;

    if (firstFocusable) firstFocusable.focus();
  }

  _onClose = () => {
    this.remove();
  };
}

function normalizeOffset(offset?: Offset | null) {
  if (!offset) {
    return normalizeOffset(new Point(0, 0));
  } else if (typeof offset === "number") {
    // input specifies a radius from which to calculate offsets at all positions
    const cornerOffset = Math.round(Math.abs(offset) / Math.SQRT2);
    return {
      center: new Point(0, 0),
      top: new Point(0, offset),
      "top-left": new Point(cornerOffset, cornerOffset),
      "top-right": new Point(-cornerOffset, cornerOffset),
      bottom: new Point(0, -offset),
      "bottom-left": new Point(cornerOffset, -cornerOffset),
      "bottom-right": new Point(-cornerOffset, -cornerOffset),
      left: new Point(offset, 0),
      right: new Point(-offset, 0),
    };
  } else if (offset instanceof Point || Array.isArray(offset)) {
    const convertedOffset = Point.convert(offset);
    return {
      center: convertedOffset,
      top: convertedOffset,
      "top-left": convertedOffset,
      "top-right": convertedOffset,
      bottom: convertedOffset,
      "bottom-left": convertedOffset,
      "bottom-right": convertedOffset,
      left: convertedOffset,
      right: convertedOffset,
    };
  } else {
    return {
      center: Point.convert(offset["center"] || [0, 0]),
      top: Point.convert(offset["top"] || [0, 0]),
      "top-left": Point.convert(offset["top-left"] || [0, 0]),
      "top-right": Point.convert(offset["top-right"] || [0, 0]),
      bottom: Point.convert(offset["bottom"] || [0, 0]),
      "bottom-left": Point.convert(offset["bottom-left"] || [0, 0]),
      "bottom-right": Point.convert(offset["bottom-right"] || [0, 0]),
      left: Point.convert(offset["left"] || [0, 0]),
      right: Point.convert(offset["right"] || [0, 0]),
    };
  }
}
