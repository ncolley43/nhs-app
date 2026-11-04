import { Page } from '@playwright/test';

// Open the NHS App page. domcontentloaded avoids waiting on the site's slow analytics scripts.
export async function openNhsApp(page: Page, path = '/nhs-app/') {
  return page.goto(path, { waitUntil: 'domcontentloaded' });
}

// The cookie banner isn't always shown, so accept it only if it appears
export async function acceptCookiesIfShown(page: Page) {
  try {
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }
}
