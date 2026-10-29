import { test, expect } from '@playwright/test';

test('"Download on the App store" opens the NHS App on the Apple App Store', async ({ page, context }) => {
  await page.goto('/nhs-app/', { waitUntil: 'domcontentloaded' });

  // The cookie banner isn't always shown, so accept it only if it appears
  const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
  try {
    await acceptCookies.click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }

  await page.getByRole('link', { name: 'My account' }).click();
  await expect(page).toHaveURL(/\/nhs-app\/account\/$/);
  await expect(page.getByRole('heading', { name: 'Get the NHS App' })).toBeVisible();

  const appStoreLink = page.getByRole('link', { name: 'Download on the App store' });
  await expect(appStoreLink).toBeVisible();

  // The link currently opens in the same tab, but handle a new tab/window too in case that changes.
  // Whichever happens first wins: a new tab opening, or this tab moving to Apple
  const newPagePromise = context.waitForEvent('page', { timeout: 15000 });
  const sameTabPromise = page.waitForURL(/apple\.com/, { timeout: 15000, waitUntil: 'commit' }).then(() => null);
  await appStoreLink.click();
  const newPage = await Promise.race([newPagePromise, sameTabPromise]);
  newPagePromise.catch(() => {});
  sameTabPromise.catch(() => {});
  const appStorePage = newPage ?? page;

  test.info().annotations.push({
    type: 'App Store link',
    description: newPage ? 'Opened in a new tab/window' : 'Opened in the same tab',
  });

  // itunes.apple.com redirects to apps.apple.com
  await expect(appStorePage).toHaveURL(/^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/nhs-app\/id1388411277/, { timeout: 15000 });
  await expect(appStorePage).toHaveTitle(/NHS App/);
});
