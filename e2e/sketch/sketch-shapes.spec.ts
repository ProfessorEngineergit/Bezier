/**
 * Shapes and edits beyond line, rectangle and circle, reached through the rail: Polygon and Slot
 * draw closed areas that extrude, Arc's Tangent variant continues along a line, Trim's Extend
 * lengthens a line to what it meets, and Modify's Offset copies the selection.
 */

import type { Page } from '@playwright/test';
import { canvasRect, openApp, railButton } from '../app.js';
import { expect, test } from '../fixtures.js';

async function onPlane(page: Page) {
  await openApp(page);
  await railButton(page, 'Sketch').click();
  const rect = await canvasRect(page);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  return (fx: number, fy: number) =>
    page.mouse.click(rect.x + rect.width * fx, rect.y + rect.height * fy);
}

const lengths = (page: Page) => page.getByLabel(/^Length for sketch line /);

test('Polygon draws a closed hexagon from its centre and a corner', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Polygon').click();
  await expect(railButton(page, 'Hexagon')).toBeVisible();
  await at(0.5, 0.5);
  await at(0.58, 0.5);
  // Six equal sides share one length label, as a rectangle shows one width and one height.
  await expect(lengths(page)).toHaveCount(1);
  await railButton(page, 'Finish Sketch').click();
  await expect(page.locator('html[data-busy]')).toHaveCount(0);
  await at(0.5, 0.5);
  await expect(page.getByRole('button', { name: 'Drag to change extrude distance' })).toBeVisible();
});

test('Slot draws two straight sides and two round ends', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Slot').click();
  await at(0.44, 0.5);
  await at(0.56, 0.5);
  await at(0.5, 0.54);
  await expect(lengths(page)).toHaveCount(2);
  await expect(page.locator('.sketch-dimension', { hasText: 'R' })).toHaveCount(2);
});

test('Arc Tangent leaves the end of a line along it', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Line').click();
  await at(0.4, 0.5);
  await at(0.5, 0.5);
  await page.keyboard.press('Escape');
  await railButton(page, 'Arc').click();
  await railButton(page, 'Tangent').click();
  await at(0.5, 0.5);
  await at(0.56, 0.44);
  await expect(page.locator('.sketch-dimension', { hasText: 'R' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Remove Tangent' })).toBeVisible();
});

test('Trim Extend lengthens a line to the one ahead of it', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Line').click();
  await at(0.4, 0.5);
  await at(0.45, 0.5);
  await page.keyboard.press('Escape');
  await railButton(page, 'Line').click();
  await at(0.55, 0.4);
  await at(0.55, 0.6);
  await page.keyboard.press('Escape');
  const before = await lengths(page).first().inputValue();
  await railButton(page, 'Trim').click();
  await railButton(page, 'Extend').click();
  await at(0.445, 0.5);
  await expect(lengths(page).first()).not.toHaveValue(before);
});

test('Modify Offset copies a picked line beside it', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Line').click();
  await at(0.4, 0.5);
  await at(0.55, 0.5);
  await page.keyboard.press('Escape');
  await at(0.47, 0.5);
  await railButton(page, 'Modify').click();
  const bar = page.getByRole('region', { name: 'Offset' });
  await expect(bar).toBeVisible();
  await bar.getByLabel('Distance').fill('5');
  await bar.getByRole('button', { name: 'Done' }).click();
  await expect(bar).toHaveCount(0);
  await expect(lengths(page)).toHaveCount(2);
});

test('Copy and Paste make a copy of a picked line beside it (audit F-048)', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Line').click();
  await at(0.4, 0.5);
  await at(0.5, 0.5);
  await page.keyboard.press('Escape');
  await at(0.45, 0.5);
  await expect(lengths(page)).toHaveCount(1);
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await expect(lengths(page)).toHaveCount(2);
});

test('a centre rectangle keeps its centre when a side is typed, and R opens Center again', async ({
  page,
}) => {
  const at = await onPlane(page);
  await page.getByRole('button', { name: 'Top', exact: true }).dispatchEvent('click');
  await page.waitForTimeout(700);
  await railButton(page, 'Rectangle').click();
  await railButton(page, 'Center').click();
  await at(0.5, 0.5);
  await at(0.6, 0.58);
  // Width and height; the construction diagonal has no field of its own.
  await expect(lengths(page)).toHaveCount(2);
  const middle = async () => {
    const boxes = await lengths(page).evaluateAll((inputs) =>
      inputs.map((input) => {
        const box = input.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }),
    );
    // The width field sits on a horizontal side: its x is the rectangle's middle.
    return boxes.map((box) => box.x);
  };
  const before = await middle();
  const width = lengths(page).first();
  const old = Number(await width.inputValue());
  await width.fill(String(Math.round(old * 2)));
  await width.press('Enter');
  await expect
    .poll(async () => Number(await width.inputValue()))
    .toBeCloseTo(Math.round(old * 2), 0);
  const after = await middle();
  expect(Math.abs((after[0] ?? 0) - (before[0] ?? 0))).toBeLessThan(3);

  // Escape drops the tool; R opens the variant used last.
  await page.keyboard.press('Escape');
  await page.keyboard.press('r');
  await expect(railButton(page, 'Center')).toHaveAttribute('data-chosen');
});

test('Select All in a sketch takes what is drawn, so Delete clears it', async ({ page }) => {
  const at = await onPlane(page);
  await railButton(page, 'Rectangle').click();
  await at(0.4, 0.4);
  await at(0.6, 0.6);
  await expect(lengths(page)).toHaveCount(2);
  // The first Escape drops the tool and keeps the sketch open.
  await page.keyboard.press('Escape');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await page.keyboard.press('Delete');
  await expect(lengths(page)).toHaveCount(0);
  await expect(railButton(page, 'Finish Sketch')).toBeVisible();
});
