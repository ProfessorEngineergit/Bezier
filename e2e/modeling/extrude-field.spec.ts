/**
 * The distance field of an extrude offered on a sketch area: a click selects what is in it, a digit
 * typed anywhere goes into it, a menu changed after typing keeps the typed value, and zero builds
 * nothing.
 */

import type { Page } from '@playwright/test';
import { canvasRect, openApp, openItems, railButton } from '../app.js';
import { expect, test } from '../fixtures.js';

async function at(page: Page, fx: number, fy: number) {
  const rect = await canvasRect(page);
  await page.mouse.click(rect.x + rect.width * fx, rect.y + rect.height * fy);
}

/** A rectangle seen from above, finished, with its area clicked: the extrude offer is open. */
async function offer(page: Page) {
  await openApp(page);
  await page.getByRole('button', { name: 'Top', exact: true }).dispatchEvent('click');
  await page.waitForTimeout(600);
  await railButton(page, 'Sketch').click();
  await page.keyboard.press('r');
  await at(page, 0.35, 0.35);
  await at(page, 0.65, 0.65);
  await page.keyboard.press('Escape');
  await railButton(page, 'Finish Sketch').click();
  await expect(page.locator('html[data-busy]')).toHaveCount(0);
  await at(page, 0.5, 0.5);
  const field = page.getByRole('spinbutton', { name: 'Extrude distance' });
  await expect(field).toHaveValue('0');
  return field;
}

test('a click into the distance selects it, so typing replaces the value', async ({ page }) => {
  const field = await offer(page);
  await field.click();
  await page.keyboard.type('5');
  await expect(field).toHaveValue('5');
});

test('a digit typed with the field unfocused goes into it, not to a shortcut', async ({ page }) => {
  const field = await offer(page);
  await page.keyboard.type('7');
  await expect(field).toHaveValue('7');
  await expect(field).toBeFocused();
});

test('changing the direction after typing keeps the typed distance and builds nothing yet', async ({
  page,
}) => {
  const field = await offer(page);
  await field.click();
  await page.keyboard.type('5');
  await page.getByRole('button', { name: 'Extrude options' }).click();
  await page.getByRole('combobox', { name: 'Extrude direction' }).selectOption('symmetric');
  await expect(field).toHaveValue('5');
  await field.press('Enter');
  await expect(page.locator('html[data-busy]')).toHaveCount(0);
  await openItems(page);
  await expect(page.locator('.items-row')).toHaveText(['Sketch 1', 'Extrude']);
});

test('zero and Enter build nothing', async ({ page }) => {
  const field = await offer(page);
  await field.click();
  await page.keyboard.type('0');
  await field.press('Enter');
  await expect(page.locator('html[data-busy]')).toHaveCount(0);
  await openItems(page);
  await expect(page.locator('.items-row')).toHaveText(['Sketch 1']);
});
