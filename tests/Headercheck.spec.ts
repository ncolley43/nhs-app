import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.nhs.uk/nhs-app/');
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
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('list')).toContainText('Health A to Z');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('list')).toContainText('NHS services');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('list')).toContainText('Healthy living');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('list')).toContainText('Mental health');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('list')).toContainText('Care and support');
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Health A to Z' }).click();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'NHS services' }).click();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Healthy living' }).dblclick();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Mental health' }).dblclick();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Care and support' }).click();
  await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search the NHS website' })).toBeVisible();
  await page.getByRole('button', { name: 'Search' }).click();
});