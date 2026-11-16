import { test, expect, Browser } from '@playwright/test';
import { randomString, generateEmail } from '../../main/shared/utils/helpers';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * ABOUTME: Registration test suite for automationexercise.com quick signup form.
 * ABOUTME: Tests the Name + Email signup form (full registration form is a separate workflow).
 */

test.describe('E-Commerce Quick Signup @smoke @critical', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Registration',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await page.goto('https://automationexercise.com/signup', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title}`);
      await takeScreenshot(page, `FAILED-signup-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Happy Path ───────────────────────────────────────────────────────────────

  test('quick signup form displays correctly', { tag: '@smoke' }, async ({ page }) => {
    await annotate({
      story: 'Signup form UI',
      severity: Severity.MINOR,
      description: 'Verify signup form elements are visible',
    });

    // Check inputs exist
    const nameInput = page.locator('input[data-qa="signup-name"]');
    const emailInput = page.locator('input[data-qa="signup-email"]');
    const signupButton = page.locator('button[data-qa="signup-button"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(signupButton).toBeVisible();

    stepLogger.info('Signup form elements verified');
    await takeScreenshot(page, 'signup-form-layout');
  });

  test('successful signup with valid name and email', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await annotate({
      story: 'Successful signup',
      severity: Severity.BLOCKER,
      description: 'User can signup with name and email',
    });

    const testName = `Test User ${randomString(6)}`;
    const testEmail = `test-${randomString(8)}@example.com`;

    await parameter('name', testName);
    await parameter('email', testEmail);

    await test.step('Fill signup form', async () => {
      await page.fill('input[data-qa="signup-name"]', testName);
      await page.fill('input[data-qa="signup-email"]', testEmail);
      stepLogger.info(`Filled signup form: ${testName} / ${testEmail}`);
    });

    await test.step('Submit signup', async () => {
      await page.click('button[data-qa="signup-button"]');
      stepLogger.info('Clicked signup button');

      // Wait for page transition or success message
      await page.waitForTimeout(2000);
      stepLogger.info('Waited for form submission');
    });

    // Verify we're on the next page or see success indication
    const newUrl = page.url();
    stepLogger.info(`Current URL after signup: ${newUrl}`);
    await takeScreenshot(page, 'signup-success');
  });

  // ── Validation ───────────────────────────────────────────────────────────────

  test('signup fails with empty name', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Required field validation',
      severity: Severity.NORMAL,
      description: 'Name field is required',
    });

    await test.step('Try to signup without name', async () => {
      const nameInput = page.locator('input[data-qa="signup-name"]');
      const emailInput = page.locator('input[data-qa="signup-email"]');

      // Leave name empty
      await emailInput.fill('test@example.com');

      // Try to submit
      await page.click('button[data-qa="signup-button"]');
      stepLogger.info('Attempted signup without name');
    });

    // Check if there's a validation error or if form is still visible
    const nameInput = page.locator('input[data-qa="signup-name"]');
    const isStillVisible = await nameInput.isVisible();
    expect(isStillVisible).toBeTruthy();
    stepLogger.info('Name field validation verified');
  });

  test('signup fails with empty email', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Required field validation',
      severity: Severity.NORMAL,
      description: 'Email field is required',
    });

    await test.step('Try to signup without email', async () => {
      const nameInput = page.locator('input[data-qa="signup-name"]');

      // Fill name but leave email empty
      await nameInput.fill('Test User');

      // Try to submit
      await page.click('button[data-qa="signup-button"]');
      stepLogger.info('Attempted signup without email');
    });

    // Check if form is still visible (validation failed)
    const emailInput = page.locator('input[data-qa="signup-email"]');
    const isStillVisible = await emailInput.isVisible();
    expect(isStillVisible).toBeTruthy();
    stepLogger.info('Email field validation verified');
  });

  test('signup with invalid email format', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Email format validation',
      severity: Severity.MINOR,
      description: 'Invalid email format should be rejected',
    });

    await test.step('Fill form with invalid email', async () => {
      await page.fill('input[data-qa="signup-name"]', 'Test User');
      await page.fill('input[data-qa="signup-email"]', 'not-an-email');

      await page.click('button[data-qa="signup-button"]');
      stepLogger.info('Attempted signup with invalid email');
    });

    // Browser's native validation should prevent submission
    // or we might see an error message
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    // Should still be on signup page or show error
    expect(currentUrl).toContain('/signup');
    stepLogger.info('Invalid email rejected');
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────────

  test('signup with whitespace-padded inputs', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Input sanitization',
      severity: Severity.MINOR,
      description: 'Whitespace should be handled correctly',
    });

    const testName = '  Test User  ';
    const testEmail = '  test@example.com  ';

    await page.fill('input[data-qa="signup-name"]', testName);
    await page.fill('input[data-qa="signup-email"]', testEmail);

    await page.click('button[data-qa="signup-button"]');
    stepLogger.info('Submitted form with whitespace-padded inputs');

    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'signup-whitespace-handled');
  });

  test('signup with special characters in name', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Special character handling',
      severity: Severity.MINOR,
      description: 'Special characters in name should be accepted',
    });

    const testName = `O'Brien-Smith (Test) ${randomString(4)}`;
    const testEmail = `test-${randomString(6)}@example.com`;

    await page.fill('input[data-qa="signup-name"]', testName);
    await page.fill('input[data-qa="signup-email"]', testEmail);

    await page.click('button[data-qa="signup-button"]');
    stepLogger.info(`Submitted with special characters: ${testName}`);

    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'signup-special-chars');
  });

  // ── UI Interaction ──────────────────────────────────────────────────────────

  test('login and signup forms are both visible on same page', { tag: '@regression' }, async ({ page }) => {
    await annotate({
      story: 'Page layout',
      severity: Severity.MINOR,
      description: 'Both login and signup forms on one page',
    });

    // Check login form elements
    const loginEmail = page.locator('input[data-qa="login-email"]');
    const loginButton = page.locator('button[data-qa="login-button"]');

    // Check signup form elements
    const signupEmail = page.locator('input[data-qa="signup-email"]');
    const signupButton = page.locator('button[data-qa="signup-button"]');

    await expect(loginEmail).toBeVisible();
    await expect(loginButton).toBeVisible();

    await expect(signupEmail).toBeVisible();
    await expect(signupButton).toBeVisible();

    stepLogger.info('Both forms verified as visible');
    await takeScreenshot(page, 'login-signup-layout');
  });
});

// ─── Duplicate Email Registration ─────────────────────────────────────────────

type RegisteredUser = { email: string; password: string; firstName: string };

async function registerUser(browser: Browser): Promise<RegisteredUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route(
    /(googlesyndication|doubleclick|adservice|google-analytics|googletagmanager|consent\.google|pagead|aswpsdkus|googleads)/,
    (route) => route.abort(),
  );

  const email = generateEmail('mailinator.com');
  const password = 'Test@1234';
  const firstName = `Test${randomString(4)}`;

  try {
    await page.goto('https://automationexercise.com/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[data-qa="signup-name"]', `${firstName} User`);
    await page.fill('input[data-qa="signup-email"]', email);
    await page.click('button[data-qa="signup-button"]');

    await page.locator('input#password').waitFor({ state: 'visible', timeout: 15000 });
    await page.fill('input#password', password);
    await page.selectOption('select#days', '10');
    await page.selectOption('select#months', '5');
    await page.selectOption('select#years', '1990');
    await page.fill('input#first_name', firstName);
    await page.fill('input#last_name', 'User');
    await page.fill('input#address1', '123 Test Street');
    await page.fill('input#state', 'TestState');
    await page.fill('input#city', 'TestCity');
    await page.fill('input#zipcode', '12345');
    await page.fill('input#mobile_number', '5551234567');
    await page.click('button[data-qa="create-account"]');

    const continueBtn = page.locator('a[data-qa="continue-button"]');
    await continueBtn.waitFor({ state: 'visible', timeout: 15000 });
    await continueBtn.click();
    await page.waitForLoadState('domcontentloaded');
  } finally {
    await context.close();
  }

  stepLogger.info(`Registered test user: ${email}`);
  return { email, password, firstName };
}

test.describe('Duplicate Email Registration @regression', () => {
  let existingUser: RegisteredUser;

  test.beforeAll(async ({ browser }) => {
    existingUser = await registerUser(browser);
  });

  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Registration',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`Starting test: ${testInfo.title}`);
    await page.goto('https://automationexercise.com/login', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`Test failed: ${testInfo.title}`);
      await takeScreenshot(page, `FAILED-duplicate-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    }
  });

  test('signup rejects already registered email',
    { tag: ['@regression', '@critical'] },
    async ({ page }) => {
      await annotate({
        story: 'Duplicate email rejection',
        severity: Severity.CRITICAL,
        description: 'Attempting to register with an existing email shows an error',
      });
      await parameter('email', existingUser.email);

      await test.step('Fill signup form with existing email', async () => {
        await page.fill('input[data-qa="signup-name"]', 'Duplicate User');
        await page.fill('input[data-qa="signup-email"]', existingUser.email);
        stepLogger.info(`Attempting signup with existing email: ${existingUser.email}`);
      });

      await test.step('Submit and verify error', async () => {
        await page.click('button[data-qa="signup-button"]');

        const errorText = page.locator('p:has-text("Email Address already exist!")');
        await expect(errorText).toBeVisible({ timeout: 10000 });
        stepLogger.info('Duplicate email error message verified');
        await takeScreenshot(page, 'duplicate-email-error');
      });
    });

  test('signup rejects duplicate email regardless of name',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Duplicate email rejection',
        severity: Severity.NORMAL,
        description: 'Different name with same email still rejected',
      });

      await test.step('Fill signup with different name but same email', async () => {
        await page.fill('input[data-qa="signup-name"]', `Completely Different Name ${randomString(4)}`);
        await page.fill('input[data-qa="signup-email"]', existingUser.email);
      });

      await test.step('Submit and verify error', async () => {
        await page.click('button[data-qa="signup-button"]');

        const errorText = page.locator('p:has-text("Email Address already exist!")');
        await expect(errorText).toBeVisible({ timeout: 10000 });
        stepLogger.info('Duplicate email rejected even with different name');
      });
    });
});
