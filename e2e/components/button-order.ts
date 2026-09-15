import { expect, type Locator } from "@playwright/test";

export async function expectButtonOrder(buttons: Locator, types: string[]) {
  await expect(buttons).toHaveCount(types.length);
  expect(await buttons.evaluateAll((items) => items.map((item) => item.getAttribute("data-type")))).toEqual(types);
}
