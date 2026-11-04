// Plan: specs/nhs-app-basic.plan.md - section 5
import { test, expect } from '@playwright/test';
import { openNhsApp, acceptCookiesIfShown } from './helpers';

// Phone-sized screen. Only the viewport is set, so this runs in every browser project.
test.use({ viewport: { width: 393, height: 851 } });

test.describe('NHS App page on a phone-sized screen', () => {
  test.beforeEach(async ({ page }) => {
    await openNhsApp(page);
    await acceptCookiesIfShown(page);
  });

  test('page fits the screen without sideways scrolling', async ({ page }) => {
    const [scrollWidth, viewportWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('header navigation collapses into "Browse More"', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });

    await expect(nav.getByRole('link', { name: 'Health A to Z' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'NHS services' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Care and support' })).toBeHidden();
    await expect(nav.getByRole('button', { name: /Browse\s*More/ })).toBeVisible();
  });

  test('main content is still usable', async ({ page }) => {
    const main = page.locator('#maincontent');

    await expect(main.getByRole('heading', { level: 1 })).toHaveText('NHS App');
    await expect(main.getByRole('listitem')).toHaveCount(3);
    await expect(main.getByRole('link', { name: 'Download on the App store' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Download on Google Play' })).toBeVisible();
  });
});
