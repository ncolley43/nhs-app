// Plan: specs/nhs-app-basic.plan.md - section 1
import { test, expect } from '@playwright/test';
import { openNhsApp, acceptCookiesIfShown } from './helpers';

test.describe('NHS App page basics', () => {
  test('page loads with the right title and metadata', async ({ page }) => {
    await openNhsApp(page);

    await expect(page).toHaveTitle('NHS App - NHS');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Use the NHS App/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.nhs.uk/nhs-app/');
  });

  test('skip link is the first thing keyboard users reach', async ({ page, browserName }) => {
    // WebKit's Tab key skips links (a Safari default), so focus goes straight to the search box
    test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default');

    await openNhsApp(page);
    await acceptCookiesIfShown(page);

    // Reload so the banner is gone and tabbing starts from the top of the page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#maincontent$/);
  });

  test('breadcrumb links back to the NHS homepage', async ({ page }) => {
    await openNhsApp(page);

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb.getByRole('link')).toHaveCount(1);
    await expect(breadcrumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  test('NHS logo returns to the homepage', async ({ page }) => {
    await openNhsApp(page);
    await acceptCookiesIfShown(page);

    await page.getByRole('link', { name: 'NHS homepage' }).click();
    await expect(page).toHaveURL('https://www.nhs.uk/');
  });

  test('unknown NHS App page shows "Page not found"', async ({ page }) => {
    const response = await openNhsApp(page, '/nhs-app/does-not-exist/');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });
});
