import type { PanelButton } from "./components/drawing-panel.component";
import { test } from "./fixtures";

const LOCALE = {
  undo: "Undo it",
  redo: "Redo it",
  delete: "Wipe all",
  save: "Keep it",
  line: "Draw line",
  polygon: "Draw polygon",
  break: "Split shape",
  closeLine: "Close this line",
  createPolygon: "Make polygon",
};

const PANEL_LABELS: [PanelButton, string][] = [
  ["undo", "Undo it"],
  ["redo", "Redo it"],
  ["delete", "Wipe all"],
  ["save", "Keep it"],
];

test("hovering a panel button shows its label below it and leaving takes the label away", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { locale: LOCALE } });
  await drawMap.undo();
  await drawMap.parkPointer();

  for (const [type, label] of PANEL_LABELS) {
    await drawMap.panel.hover(type);
    await drawMap.tooltip.expectBelow(label, drawMap.panel.button(type));

    await drawMap.parkPointer();
    await drawMap.tooltip.expectNotShowing(label);
  }
});

test("hovering the first of three points in polygon mode shows the polygon hint", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: LOCALE, modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawTriangle();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(triangle.a);

  await drawMap.tooltip.expectShowing("Make polygon");
});

test("hovering the first of two points shows no closing hint", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: LOCALE } });
  const { first, middle } = drawMap.layout.line;
  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.parkPointer();

  await drawMap.hoverPoint(first);
  await drawMap.drawing.expectCursor("grab");

  await drawMap.tooltip.expectNotShowing("Close this line");
});

test("hovering the first point of a closed shape shows no closing hint", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: LOCALE } });
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(triangle.a);

  await drawMap.tooltip.expectNotShowing("Close this line");
});

test("hovering a mode button shows its label beside it on screen and leaving takes the label away", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { locale: LOCALE } });

  for (const [type, label] of [
    ["line", "Draw line"],
    ["polygon", "Draw polygon"],
  ] as const) {
    await drawMap.modes.hover(type);
    await drawMap.tooltip.expectRightOf(label, drawMap.modes[type]);

    await drawMap.parkPointer();
    await drawMap.tooltip.expectNotShowing(label);
  }
});

test("hovering a mode button of a control on the right shows its label to the left of it, on screen", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { locale: LOCALE }, position: "top-right" });

  await drawMap.modes.hover("line");
  await drawMap.tooltip.expectLeftOf("Draw line", drawMap.modes.line);

  await drawMap.parkPointer();
  await drawMap.tooltip.expectNotShowing("Draw line");
});

test("hovering the enabled Split button shows its label beside it on screen and leaving takes it away", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { locale: LOCALE } });
  await drawMap.drawClosedTriangle();
  await drawMap.modes.expectBreakEnabled();
  await drawMap.parkPointer();

  await drawMap.modes.hover("break");
  await drawMap.tooltip.expectRightOf("Split shape", drawMap.modes.break);

  await drawMap.parkPointer();
  await drawMap.tooltip.expectNotShowing("Split shape");
});
