import type { Locator, Page } from '@playwright/test';

export function labelled(page: Page, label: string): Locator {
  return page.locator(`[aria-label*="${label.replace(/"/g, '\\"')}" i]`).locator('visible=true').last();
}

export function labelStarting(page: Page, prefix: string): Locator {
  return page.locator(`[aria-label^="${prefix.replace(/"/g, '\\"')}" i]`).locator('visible=true').last();
}

export interface StripDrag {
  before: number;
  after: number;
  snapType: string;
}

export async function dragStripBy(
  page: Page,
  cardLabelPrefix: string,
  travel: number,
): Promise<StripDrag | null> {
  const geometry = await page.evaluate((prefix) => {
    const card = document.querySelector(`[aria-label^="${prefix}" i]`);
    let node = card?.parentElement ?? null;
    while (node !== null) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX)) {
        const box = node.getBoundingClientRect();
        return {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          before: Math.round(node.scrollLeft),
          snapType: getComputedStyle(node).scrollSnapType,
        };
      }
      node = node.parentElement;
    }
    return null;
  }, cardLabelPrefix);

  if (geometry === null) return null;

  await page.mouse.move(geometry.x, geometry.y);
  await page.mouse.down();
  for (const step of [0.25, 0.5, 0.75, 1]) {
    await page.mouse.move(geometry.x - travel * step, geometry.y, { steps: 4 });
  }
  const after = await page.evaluate((prefix) => {
    const card = document.querySelector(`[aria-label^="${prefix}" i]`);
    let node = card?.parentElement ?? null;
    while (node !== null) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX)) {
        return Math.round(node.scrollLeft);
      }
      node = node.parentElement;
    }
    return 0;
  }, cardLabelPrefix);
  await page.mouse.up();

  return { before: geometry.before, after, snapType: geometry.snapType };
}
