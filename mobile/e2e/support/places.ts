import type { Locator, Page } from '@playwright/test';

import { PICKER_CONFIRM, PLACE_LABEL } from '../../src/maps/mapCopy';
import { labelled } from './screen';

export async function pickPlace(page: Page, field: Locator, place: string): Promise<void> {
  await field.click();
  await labelled(page, PLACE_LABEL).fill(place);
  await labelled(page, PICKER_CONFIRM).click();
}
