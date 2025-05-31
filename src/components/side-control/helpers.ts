import { ControlType, RequiredDrawOptions } from "#app/types/index";

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
