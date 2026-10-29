import { test, expect, type TestInfo } from '@playwright/test';

type StepResult = { step: string; expected: string; actual: string; result: 'PASS' | 'FAIL' };

// Records a step's expected and actual results in the console and on the test in the HTML report
function record(testInfo: TestInfo, results: StepResult[], step: string, expected: string, actual: string, passed: boolean) {
  const result = passed ? 'PASS' : 'FAIL';
  results.push({ step, expected, actual, result });
  testInfo.annotations.push({ type: `${step} - ${result}`, description: `Expected: ${expected} | Actual: ${actual}` });
  console.log(`\n${step} [${result}]\n  Expected: ${expected}\n  Actual:   ${actual}`);
}

test('NHS App page shows the cookie banner and the section links', async ({ page }, testInfo) => {
  const results: StepResult[] = [];

  try {
    await test.step('Step 1: Open the NHS App page', async () => {
      await page.goto('/nhs-app/', { waitUntil: 'domcontentloaded' });

      const expected = 'Page title is "NHS App - NHS"';
      const title = await page.title();
      const actual = `Page title is "${title}"`;
      record(testInfo, results, 'Step 1: Open the NHS App page', expected, actual, title === 'NHS App - NHS');

      await expect(page).toHaveTitle('NHS App - NHS');
    });

    await test.step('Step 2: Cookie banner is displayed', async () => {
      const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });

      const expected = '"Accept analytics cookies" button is displayed';
      const displayed = await acceptCookies.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
      const actual = displayed ? '"Accept analytics cookies" button is displayed' : '"Accept analytics cookies" button is not displayed';
      record(testInfo, results, 'Step 2: Cookie banner is displayed', expected, actual, displayed);

      await expect(acceptCookies).toBeVisible();
    });

    await test.step('Step 3: Accept analytics cookies', async () => {
      const acceptCookies = page.getByRole('button', { name: 'Accept analytics cookies' });
      await acceptCookies.click();

      const expected = 'Cookie banner closes after clicking "Accept analytics cookies"';
      const hidden = await acceptCookies.waitFor({ state: 'hidden', timeout: 5000 }).then(() => true, () => false);
      const actual = hidden ? 'Cookie banner closed' : 'Cookie banner is still displayed';
      record(testInfo, results, 'Step 3: Accept analytics cookies', expected, actual, hidden);

      await expect(acceptCookies).toBeHidden();
    });

    for (const [index, sectionName] of ['Setting up the NHS App', 'Help with using the NHS App'].entries()) {
      const step = `Step ${index + 4}: "${sectionName}" section is shown`;

      await test.step(step, async () => {
        const article = page.getByRole('article');

        const expected = `Page content includes "${sectionName}"`;
        const sections = await article.getByRole('heading', { level: 2 }).allInnerTexts();
        const found = sections.some(text => text.includes(sectionName));
        const actual = found
          ? `Page content includes "${sectionName}"`
          : `"${sectionName}" not found - sections on the page are: ${sections.join(', ') || 'none'}`;
        record(testInfo, results, step, expected, actual, found);

        await expect(article).toContainText(sectionName);
      });
    }
  } finally {
    // Summary of every step that ran, even if a step failed part-way through
    console.log('\nExpected vs actual results:');
    console.table(results);
    await testInfo.attach('expected-vs-actual-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });
  }
});
