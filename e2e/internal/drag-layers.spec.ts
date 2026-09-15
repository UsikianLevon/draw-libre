import { expect, test } from "../fixtures";

test(
  "a drag hides the grab areas and the transparent line and brings them back on release",
  { tag: "@internal" },
  async ({ drawMap }) => {
    const line = await drawMap.openWithLine();
    const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);

    await drawMap.canvas.press(line.middle);
    await drawMap.canvas.dragTo(dropped);
    await expect.poll(() => drawMap.drawing.hitAreasVisible()).toBe(false);
    await expect.poll(() => drawMap.drawing.transparentLineVisible()).toBe(false);

    await drawMap.canvas.release();
    await expect.poll(() => drawMap.drawing.hitAreasVisible()).toBe(true);
    await expect.poll(() => drawMap.drawing.transparentLineVisible()).toBe(true);
    await drawMap.events.expectCount("mdl:moveend", 1);
  },
);

test("a click on the first point never touches the grab areas", { tag: "@internal" }, async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.drawing.recordVisibilityChanges();

  await drawMap.canvas.click(line.first);

  await drawMap.drawing.expectClosed();
  expect(await drawMap.drawing.hitAreaVisibilityChangeCount()).toBe(0);
});

test(
  "a nudge shorter than the click tolerance never touches the grab areas",
  { tag: "@internal" },
  async ({ drawMap }) => {
    const line = await drawMap.openWithLine();
    await drawMap.drawing.recordVisibilityChanges();

    await drawMap.canvas.press(line.first);
    await drawMap.canvas.dragTo(drawMap.layout.offsetFrom(line.first, 2, 0));
    await drawMap.canvas.release();

    await drawMap.drawing.expectClosed();
    expect(await drawMap.drawing.hitAreaVisibilityChangeCount()).toBe(0);
  },
);
