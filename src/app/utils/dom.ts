export class DOM {
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

  static addEventListener(
    target: HTMLElement | Window | Document | undefined,
    type: string,
    callback: EventListenerOrEventListenerObject,
    options: {
      capture?: boolean;
      passive?: boolean;
    } = {},
  ) {
    if (!target) return;
    target.addEventListener(type, callback, options);
  }

  static removeEventListener(
    target: HTMLElement | Window | Document | undefined,
    type: string,
    callback: EventListenerOrEventListenerObject,
    options: {
      capture?: boolean;
      passive?: boolean;
    } = {},
  ) {
    if (!target) return;
    target.removeEventListener(type, callback, options);
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
