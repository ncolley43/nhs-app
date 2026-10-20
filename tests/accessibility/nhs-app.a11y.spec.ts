import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.2 AA - the standard NHS services must meet
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Only these impact levels fail a test - minor and moderate issues are reported but don't fail
const failingImpacts = ['serious', 'critical'];

const pages = [
  { name: 'NHS App home', path: '/nhs-app/' },
  { name: 'Setting up the NHS App', path: '/nhs-app/setting-up/' },
  { name: 'Help with using the NHS App', path: '/nhs-app/help/' },
  { name: 'About the NHS App', path: '/nhs-app/about/' },
];

async function acceptCookiesIfShown(page: Page) {
  // The cookie banner isn't always shown, so accept it only if it appears
  const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
  try {
    await acceptCookies.click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }
}

// Runs an axe scan, attaches the full results to the report and fails only on serious/critical issues
async function checkAccessibility(page: Page, testInfo: TestInfo, label: string) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  await testInfo.attach(`axe results - ${label}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const summarise = (violations: typeof results.violations) =>
    violations.map(v => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} element(s)) - ${v.helpUrl}\n` +
      v.nodes.map(n => `    ${n.target.join(' ')}`).join('\n'));

  const failing = results.violations.filter(v => failingImpacts.includes(v.impact ?? ''));
  const warnings = results.violations.filter(v => !failingImpacts.includes(v.impact ?? ''));

  for (const warning of summarise(warnings)) {
    testInfo.annotations.push({ type: 'accessibility warning', description: warning });
  }

  expect(failing, `Serious or critical accessibility issues on ${label}:\n${summarise(failing).join('\n')}`).toEqual([]);
}

test.describe('Automated WCAG 2.2 AA scans', () => {
  for (const { name, path } of pages) {
    test(`${name} page has no serious accessibility issues`, async ({ page }, testInfo) => {
      await page.goto(path);
      await acceptCookiesIfShown(page);
      await checkAccessibility(page, testInfo, name);
    });
  }

  test('cookie banner has no serious accessibility issues', async ({ page }, testInfo) => {
    await page.goto('/nhs-app/');
    const banner = page.getByRole('button', { name: 'Accept analytics cookies' });
    test.skip(!(await banner.isVisible({ timeout: 5000 }).catch(() => false)), 'Cookie banner not displayed');

    await checkAccessibility(page, testInfo, 'cookie banner');
  });

  test.describe('on a mobile screen', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

    test('NHS App home page has no serious accessibility issues', async ({ page }, testInfo) => {
      await page.goto('/nhs-app/');
      await acceptCookiesIfShown(page);
      await checkAccessibility(page, testInfo, 'NHS App home (mobile)');
    });
  });
});

test.describe('Keyboard access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nhs-app/');
    await acceptCookiesIfShown(page);
    await page.reload();
  });

  test('"Skip to main content" is the first link and moves focus to the main content', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#maincontent$/);
    await expect(page.locator('#maincontent')).toBeInViewport();
  });

  test('tab order follows the page layout', async ({ page }) => {
    const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
    const main = page.locator('#maincontent');
    const expectedOrder = [
      { name: 'Skip to main content', element: page.getByRole('link', { name: 'Skip to main content' }) },
      { name: 'NHS homepage', element: page.getByRole('link', { name: 'NHS homepage' }) },
      { name: 'Search box', element: page.getByRole('combobox', { name: 'Search the NHS website' }) },
      { name: 'Search button', element: page.getByRole('button', { name: 'Search', exact: true }) },
      { name: 'My account', element: page.getByRole('link', { name: 'My account' }) },
      { name: 'Health A to Z', element: primaryNav.getByRole('link', { name: 'Health A to Z' }) },
      { name: 'NHS services', element: primaryNav.getByRole('link', { name: 'NHS services' }) },
      { name: 'Healthy living', element: primaryNav.getByRole('link', { name: 'Healthy living' }) },
      { name: 'Mental health', element: primaryNav.getByRole('link', { name: 'Mental health' }) },
      { name: 'Care and support', element: primaryNav.getByRole('link', { name: 'Care and support' }) },
      { name: 'Breadcrumb: Home', element: page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }) },
      { name: 'Setting up the NHS App', element: main.getByRole('link', { name: 'Setting up the NHS App' }) },
      { name: 'Help with using the NHS App', element: main.getByRole('link', { name: 'Help with using the NHS App' }) },
      { name: 'About the NHS App', element: main.getByRole('link', { name: 'About the NHS App' }) },
    ];

    for (const [index, { name, element }] of expectedOrder.entries()) {
      await page.keyboard.press('Tab');
      await expect(element, `Tab stop ${index + 1} should be "${name}"`).toBeFocused();
    }
  });

  test('every focusable element shows a visible focus indicator', async ({ page }) => {
    const focusable = await page.locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      .filter({ visible: true }).count();

    for (let i = 0; i < focusable; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return {
          element: `${el.tagName} "${(el.textContent ?? '').trim().slice(0, 40)}"`,
          visible: (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') || style.boxShadow !== 'none',
        };
      });
      expect.soft(focus.visible, `No visible focus indicator on ${focus.element}`).toBe(true);
    }
  });

  test('search can be used with the keyboard only', async ({ page }) => {
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // NHS logo
    await page.keyboard.press('Tab'); // Search box
    await expect(page.getByRole('combobox', { name: 'Search the NHS website' })).toBeFocused();

    await page.keyboard.type('asthma');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\/results\?q=asthma/);
  });

  test('cookie banner can be accepted with the keyboard', async ({ browser }) => {
    // Fresh context with no cookies so the banner shows
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/nhs-app/');

    const accept = page.getByRole('button', { name: 'Accept analytics cookies' });
    test.skip(!(await accept.isVisible({ timeout: 5000 }).catch(() => false)), 'Cookie banner not displayed');

    let reached = false;
    for (let i = 0; i < 20 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await accept.evaluate(el => el === document.activeElement);
    }
    expect(reached, 'Could not reach "Accept analytics cookies" with the Tab key').toBe(true);

    await page.keyboard.press('Enter');
    await expect(accept).toBeHidden();
    await context.close();
  });
});

test.describe('Page structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nhs-app/');
    await acceptCookiesIfShown(page);
  });

  test('page has a language and a meaningful title', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('NHS App - NHS');
  });

  test('page has exactly one main heading and no skipped heading levels', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);

    const levels = await page.locator('#maincontent').locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll(headings => headings.map(h => Number(h.tagName[1])));
    for (let i = 1; i < levels.length; i++) {
      expect.soft(levels[i] - levels[i - 1], `Heading level jumps from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(1);
    }
  });

  test('page has the expected landmarks', async ({ page }) => {
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  });

  test('content reflows at 320px wide without horizontal scrolling (WCAG 1.4.10)', async ({ page }) => {
    // 320px is equivalent to a 1280px screen zoomed to 400%
    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'Page scrolls horizontally at 320px wide').toBeLessThanOrEqual(0);
  });
});
