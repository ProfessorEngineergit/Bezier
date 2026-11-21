/**
 * Release channels: the app starts on stable with beta features hidden; the switch in Settings,
 * Updates applies a channel immediately and shows its name under the logo. What reaches a server is
 * in development builds only, marked Dev.
 */

import type { Page } from '@playwright/test';
import { onAlpha } from '../app.js';
import { expect, test } from '../fixtures.js';

const library = (page: Page) => page.getByRole('navigation', { name: 'Library' });
const sections = (page: Page) => page.getByRole('navigation', { name: 'Preference sections' });

async function updates(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.library[data-loaded]')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'More' })
    .getByRole('button', { name: 'Settings' })
    .click();
  await sections(page).getByRole('button', { name: 'Updates' }).click();
}

test('the app starts on stable: a wiki, and nothing that reaches a server', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.library[data-loaded]')).toBeVisible();
  await expect(library(page).getByRole('button', { name: 'Wiki', exact: true })).toBeVisible();
  await expect(library(page).getByRole('button', { name: /^Community/ })).toHaveCount(0);
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'More' })
    .getByRole('button', { name: 'Settings' })
    .click();
  await expect(sections(page).getByRole('button', { name: 'Collaboration' })).toHaveCount(0);
  await expect(sections(page).getByRole('button', { name: /^Community/ })).toHaveCount(0);
});

test('the wiki on stable is read and not written', async ({ page }) => {
  await page.goto('/');
  await library(page).getByRole('button', { name: 'Wiki', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Getting around' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New article' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Leaderboard' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Orbit, pan and zoom/ }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
});

test('beta is a channel of its own, with Beta under the logo, and holds back nothing yet', async ({
  page,
}) => {
  await updates(page);
  await expect(page.getByRole('radio', { name: 'Stable' })).toBeChecked();

  await page.getByRole('radio', { name: 'Beta' }).check();
  // No reload: still the same page.
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveText('Beta');
  await expect(library(page).getByRole('button', { name: 'Wiki', exact: true })).toBeVisible();
  await expect(sections(page).getByRole('button', { name: /^Collaboration/ })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Stable' }).check();
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveCount(0);
});

test('the switch offers stable and beta, and no code to ask for', async ({ page }) => {
  await updates(page);
  await expect(page.getByRole('radio', { name: 'Stable' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Beta' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^(Dev|Alpha)$/ })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Invitation code' })).toHaveCount(0);
  await expect(page.getByText('What is in Dev')).toHaveCount(0);
});

test('a development build shows Dev, with the parts that reach a server', async ({ page }) => {
  // The dev server with the tests' own invitation stands for a development build.
  await onAlpha(page);
  await updates(page);
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveText('Dev');
  await expect(page.getByRole('radio', { name: 'Dev' })).toBeChecked();
  await expect(page.getByText('What is in Dev')).toBeVisible();
  await expect(library(page).getByRole('button', { name: /^Community/ })).toBeVisible();
  await expect(sections(page).getByRole('button', { name: /^Collaboration/ })).toBeVisible();
  // Beta leaves them out again, at once.
  await page.getByRole('radio', { name: 'Beta' }).check();
  await expect(library(page).getByRole('button', { name: /^Community/ })).toHaveCount(0);
});

test('alpha cannot be had by writing it into storage: without a good code it is beta', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem('bezier.channel', 'alpha');
  });
  await page.goto('/');
  await expect(page.locator('.library[data-loaded]')).toBeVisible();
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveText('Beta');
  await expect(library(page).getByRole('button', { name: /^Community/ })).toHaveCount(0);
});

test('an invitation that has run out is turned away at the start, and forgotten', async ({
  page,
}) => {
  await onAlpha(page, 1);
  await page.goto('/');
  await expect(page.locator('.library[data-loaded]')).toBeVisible();
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveText('Beta');
  expect(await page.evaluate(() => localStorage.getItem('bezier.invite'))).toBeNull();
});

test('the channel is kept for the next time', async ({ page }) => {
  await updates(page);
  await page.getByRole('radio', { name: 'Beta' }).check();
  await page.reload();
  await expect(page.locator('.library-sidebar__titles .beta-tag')).toHaveText('Beta');
});
