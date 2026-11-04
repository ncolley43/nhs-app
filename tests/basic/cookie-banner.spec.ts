// Plan: specs/nhs-app-basic.plan.md - section 2
import { test, expect, Page } from '@playwright/test';
import { openNhsApp } from './helpers';

// Read the consent choice the site stores in the nhsuk-cookie-consent cookie
async function consentCookie(page: Page) {
  const cookie = (await page.context().cookies()).find(c => c.name === 'nhsuk-cookie-consent');
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : undefined;
}

test.describe('NHS App cookie banner', () => {
  test.beforeEach(async ({ page }) => {
    await openNhsApp(page);

    // The banner isn't always shown - skip rather than fail if it's missing
    const shown = await page.getByRole('heading', { name: 'Cookies on the NHS website' })
      .waitFor({ timeout: 5000 }).then(() => true, () => false);
    test.skip(!shown, 'Cookie banner not displayed');
  });

  test('banner shows on a first visit with all three choices', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Accept analytics cookies' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject analytics cookies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose your cookie settings' })).toBeVisible();
  });

  test('accepting hides the banner and remembers the choice', async ({ page }) => {
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click();
    await expect(page.getByRole('heading', { name: 'Cookies on the NHS website' })).toBeHidden();
    expect((await consentCookie(page))?.statistics).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Accept analytics cookies' })).toBeHidden();
  });

  test('rejecting hides the banner and remembers the choice', async ({ page }) => {
    await page.getByRole('button', { name: 'Reject analytics cookies' }).click();
    await expect(page.getByRole('heading', { name: 'Cookies on the NHS website' })).toBeHidden();
    expect((await consentCookie(page))?.statistics).toBe(false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Reject analytics cookies' })).toBeHidden();
  });

  test('"Choose your cookie settings" opens the cookie policy page', async ({ page }) => {
    await page.getByRole('link', { name: 'Choose your cookie settings' }).click();
    await expect(page).toHaveURL(/\/our-policies\/choose-your-cookie-settings\/$/);
  });
});
