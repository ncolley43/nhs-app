import { test, expect, type Locator } from '@playwright/test';

// Credentials come from the git-ignored .env file (see .env.example)
const email = process.env.NHS_LOGIN_EMAIL;
const password = process.env.NHS_LOGIN_PASSWORD;

// locator.fill() shows the typed value in the HTML report ("Fill "<value>""),
// so set the value in the page instead - the report then only shows "Evaluate"
async function enterSecret(field: Locator, value: string) {
  await field.click();
  await field.evaluate((input: HTMLInputElement, secret) => {
    input.value = secret;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(field).not.toBeEmpty();
}

test('log in to NHS login with email and password @login', async ({ page }) => {
  test.skip(!email || !password, 'Set NHS_LOGIN_EMAIL and NHS_LOGIN_PASSWORD in .env to run this test');

  // NHS login must be started from an NHS service - going straight to
  // https://access.login.nhs.uk/login shows "We do not know which website or app you are trying to access"
  await page.goto('/nhs-app/account/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/access\.login\.nhs\.uk\/login/);
  await expect(page.getByRole('heading', { name: 'Log in to your NHS account' })).toBeVisible();

  // NHS login has its own cookie banner
  const acceptCookies = page.getByRole('button', { name: 'Accept all cookies' });
  try {
    await acceptCookies.click({ timeout: 5000 });
  } catch {
    // Banner not displayed - carry on with the test
  }

  await test.step('Enter email address', () => enterSecret(page.getByRole('textbox', { name: 'Email address' }), email!));
  await test.step('Enter password', () => enterSecret(page.getByRole('textbox', { name: 'Password' }), password!));
  await page.getByRole('button', { name: 'Continue' }).click();

  // A successful login moves on from the login form (usually to the security code page)
  await expect(page).not.toHaveURL(/access\.login\.nhs\.uk\/login$/, { timeout: 15000 });
  await expect(page.getByText('There is a problem')).toBeHidden();
});
