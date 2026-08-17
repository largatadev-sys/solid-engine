import type { Locator, Page } from '@playwright/test';

export function labelled(page: Page, label: string): Locator {
  return page.locator(`[aria-label*="${label.replace(/"/g, '\\"')}" i]`).locator('visible=true').last();
}

export function labelStarting(page: Page, prefix: string): Locator {
  return page.locator(`[aria-label^="${prefix.replace(/"/g, '\\"')}" i]`).locator('visible=true').last();
}

export interface StripProbe {
  before: number;
  after: number;
  snapType: string;
}

export async function probeStrip(page: Page, cardLabelPrefix: string): Promise<StripProbe | null> {
  return page.evaluate((prefix) => {
    const card = document.querySelector(`[aria-label^="${prefix}" i]`);
    let node = card?.parentElement ?? null;
    while (node !== null) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX)) {
        const before = Math.round(node.scrollLeft);
        node.scrollLeft = before + 300;
        const after = Math.round(node.scrollLeft);
        node.scrollLeft = before;
        return { before, after, snapType: getComputedStyle(node).scrollSnapType };
      }
      node = node.parentElement;
    }
    return null;
  }, cardLabelPrefix);
}
