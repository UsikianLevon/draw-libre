import type { DrawOptions } from "../src/index";
import type { ModeButton } from "./components/drawing-modes.component";
import { test } from "./fixtures";
import { OPEN_STEPS } from "./support/steps";

const LABELS = { line: "Draw line", polygon: "Draw polygon", break: "Split shape" };

const HIDDEN: { option: string; options: DrawOptions; left: ModeButton[] }[] = [
  {
    option: "modes.line.visible",
    options: { modes: { initial: null, line: { visible: false } } },
    left: ["polygon", "break"],
  },
  {
    option: "modes.polygon.visible",
    options: { modes: { initial: null, polygon: { visible: false } } },
    left: ["line", "break"],
  },
  {
    option: "modes.breakGeometry.visible",
    options: { modes: { initial: null, breakGeometry: { visible: false } } },
    left: ["line", "polygon"],
  },
];

test("the side control shows the line, polygon and break buttons with their locale labels", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: LABELS } });

  await drawMap.modes.expectButtons(["line", "polygon", "break"]);
  await drawMap.modes.expectLabelled("line", "Draw line");
  await drawMap.modes.expectLabelled("polygon", "Draw polygon");
  await drawMap.modes.expectLabelled("break", "Split shape");
});

for (const { option, options, left } of HIDDEN) {
  test(`${option} set to false removes that button and keeps the others`, async ({ drawMap }) => {
    await drawMap.open({ options });

    await drawMap.modes.expectButtons(left);
  });
}

test("a hidden line button stays hidden when the initial geometry is a line", async ({ drawMap }) => {
  await drawMap.open({
    options: {
      modes: { line: { visible: false } },
      initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS },
    },
  });

  await drawMap.drawing.expectPointCount(3);
  await drawMap.modes.expectButtons(["polygon", "break"]);
});

test("line as the initial mode is active on load and the mount reports it once", async ({ drawMap }) => {
  await drawMap.open();

  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectPolygonInactive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
});

test("polygon as the initial mode is active on load and the mount reports it once", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });

  await drawMap.modes.expectPolygonActive();
  await drawMap.modes.expectLineInactive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
});

test("without an initial mode no button is active and the mount reports no mode", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: null } } });

  await drawMap.modes.expectNoneActive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: null });
});

test("clicking polygon while line is active switches to polygon", async ({ drawMap }) => {
  await drawMap.open();

  await drawMap.modes.choosePolygon();

  await drawMap.events.expectCount("mdl:modechanged", 2);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
  await drawMap.modes.expectPolygonActive();
  await drawMap.modes.expectLineInactive();
});

test("the cursor is grab over a middle point and grabbing while the point is pressed", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.hoverThrough(line.middle);
  await drawMap.drawing.expectCursor("grab");

  await drawMap.canvas.press(line.middle);
  await drawMap.drawing.expectCursor("grabbing");
  await drawMap.canvas.release();
});

test("the cursor is a pointer over a segment in manual mode", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.hover(drawMap.layout.segmentMidpoint(line.first, line.middle));

  await drawMap.drawing.expectCursor("pointer");
});

test("the cursor is a pointer over the last point of an open line", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.hoverThrough(line.last);

  await drawMap.drawing.expectCursor("pointer");
});

test("the cursor is a pointer over the first of three points, where a click closes the line", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.hoverThrough(line.first);

  await drawMap.drawing.expectCursor("pointer");
});

test("the cursor stays grab over the first of two points, which cannot close anything yet", async ({ drawMap }) => {
  await drawMap.open();
  const { first, middle } = drawMap.layout.line;
  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.hoverThrough(first);
  await drawMap.drawing.expectCursor("grab");
  await drawMap.canvas.settle();

  await drawMap.drawing.expectCursor("grab");
});

test("clicking the active line button turns drawing off and the cursor back to auto", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawing.expectCursor("crosshair");

  await drawMap.modes.chooseLine();

  await drawMap.events.expectCount("mdl:modechanged", 2);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: null });
  await drawMap.modes.expectNoneActive();
  await drawMap.drawing.expectCursor("auto");
});

test("choosing a mode by its button turns the cursor into a crosshair", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: null } } });
  await drawMap.drawing.expectCursor("auto");

  await drawMap.modes.chooseLine();

  await drawMap.drawing.expectCursor("crosshair");
});

test("after splitting a closed line the cursor is a crosshair again", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();

  await drawMap.breakAt(triangle.a, triangle.b);

  await drawMap.modes.expectLineActive();
  await drawMap.drawing.expectCursor("crosshair");
});

test("after a split with the line button hidden the Split button is not left pressed", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { line: { visible: false } } } });
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();

  await drawMap.breakAt(triangle.a, triangle.b);

  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectBreakDisabled();
});

test("the cursor is auto over a closed shape and a crosshair again once undo opens it", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.sweepPointer();
  await drawMap.drawing.expectCursor("auto");

  await drawMap.undo();
  await drawMap.sweepPointer();

  await drawMap.drawing.expectCursor("crosshair");
});

test("after a split in polygon mode with the polygon button hidden the Split button is not left pressed", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { modes: { initial: "polygon", polygon: { visible: false } } } });
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();

  await drawMap.breakAt(triangle.b, triangle.c);

  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectBreakDisabled();
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
});
