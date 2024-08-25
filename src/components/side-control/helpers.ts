import { ControlType, RequiredDrawOptions } from "#types/index";
import { DOM } from "#utils/dom";

export const addControlListeners = (
  element: HTMLElement,
  events: { [key: string]: EventListenerOrEventListenerObject },
) => {
  for (const [event, listener] of Object.entries(events)) {
    DOM.manageEventListener("add", element, event, listener);
  }
};

export const removeControlListeners = (
  element: HTMLElement,
  events: { [key: string]: EventListenerOrEventListenerObject },
) => {
  for (const [event, listener] of Object.entries(events)) {
    DOM.manageEventListener("remove", element, event, listener);
  }
};

export const getButtonLabel = (type: ControlType, options: RequiredDrawOptions) => {
  const lineTitle = options.locale.line;
  const polygonTitle = options.locale.polygon;
  const breakTitle = options.locale.break;

  const LABELS = {
    line: lineTitle,
    polygon: polygonTitle,
    break: breakTitle,
  };

  return LABELS[type];
};
