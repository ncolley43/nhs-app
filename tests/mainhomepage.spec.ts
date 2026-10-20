import { test, expect } from '@playwright/test';

// The cards linking to the main NHS App sections
const sectionCards = [
  { title: 'Setting up the NHS App', description: 'How to download and register', path: '/nhs-app/setting-up/' },
  { title: 'Help with using the NHS App', description: 'Learn to use the app and get technical support', path: '/nhs-app/help/' },
  { title: 'About the NHS App', description: 'Find out more about recent changes, privacy, accessibility and more', path: '/nhs-app/about/' },
];

test.describe('NHS App home page content (excluding header and footer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nhs-app/');

    // The cookie banner isn't always shown, so accept it only if it appears
    const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
    try {
      await acceptCookies.click({ timeout: 5000 });
    } catch {
      // Banner not displayed - carry on with the test
    }
  });

  test('page heading and introduction', async ({ page }) => {
    const main = page.locator('#maincontent');

    await expect(main.getByRole('heading', { level: 1 })).toHaveText('NHS App');
    await expect(main).toContainText('Use the NHS App to manage your healthcare using a phone, tablet or computer.');
  });

  test('section cards show the right title, description and link', async ({ page }) => {
    const cards = page.locator('#maincontent').getByRole('listitem');
    await expect(cards).toHaveCount(sectionCards.length);

    for (const [index, card] of sectionCards.entries()) {
      await test.step(`"${card.title}" card`, async () => {
        const item = cards.nth(index);
        await expect(item.getByRole('heading', { level: 2 })).toHaveText(card.title);
        await expect(item).toContainText(card.description);
        await expect(item.getByRole('link', { name: card.title })).toHaveAttribute('href', new RegExp(`${card.path}$`));
      });
    }
  });

  test('"Log in through the NHS website" section', async ({ page }) => {
    const main = page.locator('#maincontent');

    await expect(main.getByRole('heading', { name: 'Log in through the NHS website', level: 2 })).toBeVisible();
    await expect(main).toContainText('You can log in to use all services through the NHS website. You do not need to download anything.');
    await expect(main.getByRole('link', { name: 'Log in to use NHS App services' })).toHaveAttribute('href', /\/nhs-app\/account\/$/);
  });

  test('"Get the app" section with app store links', async ({ page }) => {
    const main = page.locator('#maincontent');

    await expect(main.getByRole('heading', { name: 'Get the app', level: 2 })).toBeVisible();
    await expect(main).toContainText('To use the NHS App, you must be aged 13 or over and registered with a GP surgery in England.');

    const appStore = main.getByRole('link', { name: 'Download on the App store' });
    await expect(appStore).toHaveAttribute('href', /itunes\.apple\.com\/.*id1388411277/);
    await expect(appStore.getByRole('img')).toBeVisible();

    const googlePlay = main.getByRole('link', { name: 'Download on Google Play' });
    await expect(googlePlay).toHaveAttribute('href', /play\.google\.com\/.*id=com\.nhs\.online\.nhsonline/);
    await expect(googlePlay.getByRole('img')).toBeVisible();
  });

  test('NHS website links in the page content work', async ({ page }) => {
    // Only links to the NHS website - app store sites can block automated requests
    const links = page.locator('#maincontent a[href*="/nhs-app/"]');
    const hrefs = await links.evaluateAll(anchors => anchors.map(a => (a as HTMLAnchorElement).href));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect.soft(response.status(), `${href} returned ${response.status()}`).toBeLessThan(400);
    }
  });
});
