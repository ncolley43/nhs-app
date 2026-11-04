// Plan: specs/nhs-app-basic.plan.md - section 4
import { test, expect } from '@playwright/test';
import { openNhsApp, acceptCookiesIfShown } from './helpers';

// Each card on the NHS App page, and a few of the sub-page links its page should list
const sections = [
  { title: 'Setting up the NHS App', path: '/nhs-app/setting-up/', subPages: ['Who can use the NHS App', 'Downloading the NHS App'] },
  { title: 'Help with using the NHS App', path: '/nhs-app/help/', subPages: ['How to log in', 'Prescriptions'] },
  { title: 'About the NHS App', path: '/nhs-app/about/', subPages: ['Release notes'] },
];

test.describe('NHS App section journeys', () => {
  test.beforeEach(async ({ page }) => {
    await openNhsApp(page);
    await acceptCookiesIfShown(page);
  });

  for (const section of sections) {
    test(`"${section.title}" card opens its page and lists its sub-pages`, async ({ page }) => {
      await page.locator('#maincontent').getByRole('link', { name: section.title }).click();

      await expect(page).toHaveURL(new RegExp(`${section.path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(section.title);

      for (const subPage of section.subPages) {
        await expect.soft(page.locator('#maincontent').getByRole('link', { name: subPage })).toBeVisible();
      }
    });
  }

  test('"Log in to use NHS App services" opens the account page', async ({ page }) => {
    await page.getByRole('link', { name: 'Log in to use NHS App services' }).click();

    await expect(page).toHaveURL(/\/nhs-app\/account\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Access your NHS account');
    await expect(page.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', /\/auth\/redirect/);
  });
});
