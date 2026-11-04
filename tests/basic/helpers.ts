import { Page } from '@playwright/test';

// Open the NHS App page. domcontentloaded avoids waiting on the site's slow analytics scripts.
export async function openNhsApp(page: Page, path = '/nhs-app/') {
  return page.goto(path, { waitUntil: 'domcontentloaded' });
}

// How long to wait for the cookie banner - it can take 6-7 seconds to appear in Firefox
export const COOKIE_BANNER_TIMEOUT = 15_000;

// The cookie banner isn't always shown, so accept it only if it appears
export async function acceptCookiesIfShown(page: Page) {
  try {
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click({ timeout: COOKIE_BANNER_TIMEOUT });
  } catch {
    // Banner not displayed - carry on with the test
  }
}
