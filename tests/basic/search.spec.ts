// Plan: specs/nhs-app-basic.plan.md - section 3
import { test, expect } from '@playwright/test';
import { openNhsApp, acceptCookiesIfShown } from './helpers';

test.describe('Search from the NHS App page', () => {
  test.beforeEach(async ({ page }) => {
    await openNhsApp(page);
    await acceptCookiesIfShown(page);
  });

  test('searching for a real term shows results', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Search the NHS website' }).fill('asthma');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/search\/results\?q=asthma$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Search results for asthma');
  });

  test('pressing Enter also searches', async ({ page }) => {
    const searchBox = page.getByRole('combobox', { name: 'Search the NHS website' });
    await searchBox.fill('diabetes');
    await searchBox.press('Enter');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Search results for diabetes');
  });

  test('nonsense term shows no results', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Search the NHS website' }).fill('zzqxjvw');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('No results for zzqxjvw');
  });

  test('empty search does not error', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/search\/results$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('No results');
  });
});
