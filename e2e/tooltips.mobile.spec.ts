import { test } from "./fixtures";

test("tapping a mode button leaves no label on the screen", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: { line: "Draw line", polygon: "Draw polygon" } } });

  await drawMap.modes.tap("polygon");
  await drawMap.modes.expectPolygonActive();
  await drawMap.tooltip.expectNotShowing("Draw polygon");

  await drawMap.modes.tap("line");
  await drawMap.modes.expectLineActive();
  await drawMap.tooltip.expectNotShowing("Draw line");
});

test("tapping the Split button turns break mode on and leaves no label on the screen", async ({ drawMap }) => {
  await drawMap.open({ options: { locale: { break: "Split shape" } } });
  const triangle = drawMap.layout.triangle;
  await drawMap.drawPointByTap(triangle.a);
  await drawMap.drawPointByTap(triangle.b);
  await drawMap.drawPointByTap(triangle.c);
  await drawMap.closeByTappingFirst(triangle.a);

  await drawMap.modes.tap("break");

  await drawMap.modes.expectBreakActive();
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "break" });
  await drawMap.tooltip.expectNotShowing("Split shape");
});
