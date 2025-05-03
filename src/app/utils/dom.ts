export class DOM {
  private static readonly docStyle =
    typeof window !== "undefined" && window.document && window.document.documentElement.style;
  private static transformProp = DOM.testProp(["transform", "WebkitTransform"]);

  private static testProp(props: string[]): string | undefined {
    if (!DOM.docStyle) return props[0];
    for (let i = 0; i < props.length; i++) {
      if ((props as any)[i] in DOM.docStyle) {
        return props[i];
      }
    }
    return props[0];
  }

  static create<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    container?: HTMLElement,
  ): HTMLElementTagNameMap[K] {
    const element = window.document.createElement(tagName);
    if (className !== undefined) element.className = className;
    if (container) container.appendChild(element);
    return element;
  }

  static remove(node: HTMLElement) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  public static setTransform(el: HTMLElement, value: string) {
    if (DOM.transformProp && el.style) {
      // @ts-ignore
      el.style[DOM.transformProp] = value;
    }
  }

  static manageEventListener(
    action: "add" | "remove",
    target: HTMLElement | Window | Document | undefined,
    type: string,
    callback: EventListenerOrEventListenerObject,
    options: {
      capture?: boolean;
      passive?: boolean;
    } = {},
  ) {
    if (!target) return;

    const actionFn = action === "add" ? "addEventListener" : "removeEventListener";
    if ("passive" in options) {
      target[actionFn](type, callback, options);
    } else {
      target[actionFn](type, callback, options.capture);
    }
  }

  static mouseButton(e: MouseEvent) {
    return e.button;
  }

  static addClassName(node: HTMLElement, className: string) {
    if (!node.classList.contains(className)) {
      node.classList.add(className);
    }
  }

  static removeClassName(node: HTMLElement, className: string) {
    if (node.classList.contains(className)) {
      node.classList.remove(className);
    }
  }
}
