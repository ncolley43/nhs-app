import { test, expect } from '@playwright/test';

test('header contains the expected elements and navigation links work', async ({ page }) => {
  await page.goto('/nhs-app/', { waitUntil: 'domcontentloaded' });
  // The cookie banner isn't always shown, so accept it only if it appears
  const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
  try {
    await acceptCookies.click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }
  await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
    - banner:
      - link "NHS homepage":
        - /url: /
        - img "NHS"
      - search:
        - search:
          - text: Search the NHS website
          - status
          - status
          - combobox "Search the NHS website"
          - button "Search"
      - navigation "Account":
        - list:
          - listitem:
            - link "My account":
              - /url: https://www.nhs.uk/nhs-app/account/
      - navigation "Primary navigation":
        - list:
          - listitem:
            - link "Health A to Z":
              - /url: /health-a-to-z/
          - listitem:
            - link "NHS services":
              - /url: /nhs-services/
          - listitem:
            - link "Healthy living":
              - /url: /live-well/
          - listitem:
            - link "Mental health":
              - /url: /mental-health/
          - listitem:
            - link "Care and support":
              - /url: /social-care-and-support/
    `);
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });

  // Header checks on the NHS App page, before navigating away
  // (other sections such as Care and support use a different header without "My account")
  await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search the NHS website' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();

  // Each primary navigation link goes to the right page
  const navLinks = [
    { name: 'Health A to Z', path: '/health-a-to-z/' },
    { name: 'NHS services', path: '/nhs-services/' },
    { name: 'Healthy living', path: '/live-well/' },
    { name: 'Mental health', path: '/mental-health/' },
    { name: 'Care and support', path: '/social-care-and-support/' },
  ];

  for (const { name, path } of navLinks) {
    await test.step(`"${name}" goes to ${path}`, async () => {
      await expect(nav.getByRole('list')).toContainText(name);
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/nhs-app\/$/);
    });
  }
});