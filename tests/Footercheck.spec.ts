import { test, expect } from '@playwright/test';

// Every link expected in the footer, in the order it appears on the page
const footerLinks = [
  'Home',
  'Health A to Z',
  'NHS services',
  'Healthy living',
  'Mental health',
  'Care and support',
  'NHS App',
  'View your test results',
  'About the NHS',
  'Healthcare abroad',
  'Manage NHS profiles',
  'Other NHS websites',
  'About us',
  'Report an issue with the NHS website',
  'Accessibility statement',
  'Our policies',
  'Cookies',
];

test('footer contains every expected link and each link works', async ({ page }) => {
  await page.goto('/nhs-app/');

  // The cookie banner isn't always shown, so accept it only if it appears
  const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
  try {
    await acceptCookies.click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }

  const footer = page.locator('#nhsuk-footer');
  await expect(footer).toBeVisible();

  // Fails if a link is missing, added, renamed or moved
  await expect(footer.getByRole('link')).toHaveText(footerLinks);

  for (const name of footerLinks) {
    await test.step(`"${name}" link works`, async () => {
      const link = footer.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();

      const href = await link.getAttribute('href');
      expect.soft(href, `"${name}" has no href`).toBeTruthy();
      if (!href) return;

      // Request the page behind the link and check it doesn't return an error
      const response = await page.request.get(new URL(href, page.url()).toString());
      expect.soft(response.status(), `"${name}" (${href}) returned ${response.status()}`).toBeLessThan(400);
    });
  }
});
