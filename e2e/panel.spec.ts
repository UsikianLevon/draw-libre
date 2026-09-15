import type { DrawOptions } from "../src/index";
import type { PanelButton } from "./components/drawing-panel.component";
import { test } from "./fixtures";

type PanelButtonsOption = NonNullable<NonNullable<DrawOptions["panel"]>["buttons"]>;

const BUTTONS: PanelButton[] = ["undo", "redo", "delete", "save"];

test("the panel stays hidden until the first point and then appears centred above it", async ({ drawMap }) => {
  await drawMap.open();
  const first = drawMap.layout.line.first;

  await drawMap.panel.expectHidden();

  await drawMap.drawPoint(first);

  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(first);
});

test("the panel moves to the last drawn point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.panel.expectAbove(line.last);
});

test("in auto mode the panel sits above the last placed point, not above the generated midpoint", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const { first, middle } = drawMap.layout.line;

  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.drawing.expectAuxiliaryCount(1);

  await drawMap.panel.expectAbove(middle);
});

test("the panel follows its point when the map zooms and pans", async ({ drawMap }) => {
  await drawMap.openWithLine();
  const last = (await drawMap.drawing.steps())[2]!;

  await drawMap.canvas.jumpTo({ zoom: (await drawMap.canvas.zoom()) + 1 });
  await drawMap.panel.expectAbove(await drawMap.drawing.pixelOf(last));

  await drawMap.canvas.jumpTo({ center: [2, -1] });
  await drawMap.panel.expectAbove(await drawMap.drawing.pixelOf(last));
});

test("dragging the last point hides the panel until the release, then it shows above the new place", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  const to = drawMap.layout.offsetFrom(line.last, 60, 40);

  await drawMap.canvas.press(line.last);
  await drawMap.canvas.dragTo(to);
  await drawMap.panel.expectHidden();

  await drawMap.canvas.release();

  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(to);
});

test("turning the mode off hides the panel and choosing the mode again shows it above the last point", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();

  await drawMap.modes.chooseLine();
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: null });
  await drawMap.panel.expectHidden();

  await drawMap.modes.chooseLine();
  await drawMap.modes.expectLineActive();
  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(line.last);
});

test("the panel buttons come in the order undo, redo, delete, save", async ({ drawMap }) => {
  await drawMap.openWithLine();

  await drawMap.panel.expectButtons(BUTTONS);
});

for (const hidden of BUTTONS) {
  test(`hiding the ${hidden} button leaves the other three buttons in order`, async ({ drawMap }) => {
    const buttons = { [hidden]: { visible: false } } as PanelButtonsOption;
    await drawMap.openWithLine({ options: { panel: { buttons } } });

    await drawMap.panel.expectButtons(BUTTONS.filter((type) => type !== hidden));
  });
}

for (const [size, px] of [
  ["small", 20],
  ["medium", 24],
  ["large", 28],
] as const) {
  test(`the ${size} panel size gives ${px} px buttons`, async ({ drawMap }) => {
    await drawMap.openWithLine({ options: { panel: { size } } });

    await drawMap.panel.expectButtonSize(px);
  });
}

test("the locale labels all four panel buttons", async ({ drawMap }) => {
  await drawMap.openWithLine({
    options: { locale: { undo: "Undo it", redo: "Redo it", delete: "Wipe all", save: "Keep it" } },
  });

  await drawMap.panel.expectLabelled("undo", "Undo it");
  await drawMap.panel.expectLabelled("redo", "Redo it");
  await drawMap.panel.expectLabelled("delete", "Wipe all");
  await drawMap.panel.expectLabelled("save", "Keep it");
});
