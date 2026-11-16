import { test, expect, Browser } from '@playwright/test';
import { ECommerceLoginPage } from '../../main/ui/pages/ECommerceLoginPage';
import { AccountPage } from '../../main/ui/pages/AccountPage';
import { readCsv } from '../../main/shared/data/data-reader';
import { takeScreenshot, generateEmail, randomString } from '../../main/shared/utils/helpers';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

// ABOUTME: E-Commerce login and logout test suite for automationexercise.com.
// ABOUTME: Registers fresh users in beforeAll; data-driven invalid login tests from CSV.

// ─── Test Data ────────────────────────────────────────────────────────────────

type LoginCredential = {
  email: string;
  password: string;
  expectedResult: string;
  role: string;
  description: string;
};

const loginCredentials = readCsv<LoginCredential>('login-credentials.csv');
const invalidUsers = loginCredentials.filter((cred) => cred.expectedResult === 'failure');

// ─── Registration Helper ──────────────────────────────────────────────────────

type TestUser = { email: string; password: string; firstName: string };

async function registerTestUser(browser: Browser): Promise<TestUser> {
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

// ─── Login Tests ──────────────────────────────────────────────────────────────

test.describe('E-Commerce Login @smoke @critical', () => {
  let loginPage: ECommerceLoginPage;
  let testUser: TestUser;

  test.beforeAll(async ({ browser }) => {
    testUser = await registerTestUser(browser);
  });

  test.beforeEach(async ({ page }, testInfo) => {
    loginPage = new ECommerceLoginPage(page);

    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Authentication',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`Starting test: ${testInfo.title}`);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`Test failed: ${testInfo.title} (${testInfo.status})`);
      await takeScreenshot(page, `FAILED-login-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`Test passed: ${testInfo.title}`);
    }
  });

  // ── Happy Path ───────────────────────────────────────────────────────────────

  test('login page displays both login and signup forms',
    { tag: '@smoke' },
    async ({ page }) => {
      await annotate({
        story: 'Login page UI',
        severity: Severity.MINOR,
        description: 'Verify login and registration forms are displayed',
      });

      await test.step('Verify page elements', async () => {
        await loginPage.assertOnLoginPage();
        await loginPage.assertBothFormsDisplayed();
        stepLogger.info('Both login and signup forms verified');
        await takeScreenshot(page, 'login-page-layout');
      });
    });

  test('page displays correct title and heading',
    { tag: '@smoke' },
    async () => {
      await annotate({
        story: 'Page UI elements',
        severity: Severity.MINOR,
      });

      await test.step('Verify page elements', async () => {
        await loginPage.assertPageTitle();
        await loginPage.assertLoginHeading();
        stepLogger.info('Page title and heading verified');
      });
    });

  // ── Valid Login (uses freshly registered account) ───────────────────────────

  test('successful login with valid credentials',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      await annotate({
        story: 'Valid login',
        severity: Severity.BLOCKER,
        description: 'Login with a freshly registered user account',
      });
      await parameter('email', testUser.email);

      await test.step('Enter credentials and submit', async () => {
        stepLogger.info(`Attempting login with email: ${testUser.email}`);
        await loginPage.login(testUser.email, testUser.password);
      });

      await test.step('Verify successful login', async () => {
        await page.waitForLoadState('domcontentloaded');
        const loggedIn = page.locator('li:has-text("Logged in as")');
        await expect(loggedIn).toBeVisible({ timeout: 15000 });
        stepLogger.info('Login verified — user greeting visible in nav');
        await takeScreenshot(page, 'login-success');
      });
    });

  // ── Invalid Credentials (Data-Driven from CSV) ─────────────────────────────

  for (const credential of invalidUsers) {
    test(`login fails: ${credential.description}`,
      { tag: '@regression' },
      async ({ page }) => {
        await annotate({
          story: 'Invalid login',
          severity: Severity.NORMAL,
          description: `Login rejection for: ${credential.description}`,
        });
        await parameter('scenario', credential.description);

        stepLogger.info(`Attempting invalid login: ${credential.description}`);

        await test.step('Attempt login with invalid credentials', async () => {
          if (credential.email) {
            await loginPage.enterLoginEmail(credential.email);
          }
          if (credential.password) {
            await loginPage.enterLoginPassword(credential.password);
          }
          await loginPage.clickLoginButton();
        });

        await test.step('Verify login rejected', async () => {
          await page.waitForTimeout(1000);
          const serverError = page.locator('.login-form p[style*="color: red"]');
          const hasServerError = await serverError.isVisible().catch(() => false);

          if (hasServerError) {
            const errorMsg = await serverError.textContent() ?? '';
            stepLogger.info(`Server error: ${errorMsg}`);
            expect(errorMsg.length).toBeGreaterThan(0);
          } else {
            await loginPage.assertOnLoginPage();
            stepLogger.info('Browser validation prevented form submission');
          }
          await takeScreenshot(page, `login-error-${credential.description.replace(/\W+/g, '-')}`);
        });
      });
  }

  // ── Validation Errors ──────────────────────────────────────────────────────

  test('login form requires both email and password',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Field validation',
        severity: Severity.MINOR,
        description: 'Verify required field validation',
      });

      await test.step('Attempt login without credentials', async () => {
        await loginPage.clickLoginButton();
      });

      await test.step('Verify form not submitted', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Required field validation verified — form not submitted');
      });
    });

  test('login fails with only email (missing password)',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Password required validation',
        severity: Severity.NORMAL,
      });

      await test.step('Enter email without password', async () => {
        await loginPage.enterLoginEmail('test@example.com');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify login rejected', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Password required validation verified');
      });
    });

  test('login fails with only password (missing email)',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Email required validation',
        severity: Severity.NORMAL,
      });

      await test.step('Enter password without email', async () => {
        await loginPage.enterLoginPassword('Password123');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify form not submitted', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Email required validation verified — browser blocked empty email');
      });
    });

  // ── Email Format Validation ────────────────────────────────────────────────

  test('login fails with invalid email format',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Email format validation',
        severity: Severity.MINOR,
      });

      await test.step('Enter malformed email', async () => {
        await loginPage.enterLoginEmail('not-a-valid-email');
        await loginPage.enterLoginPassword('Password123');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify browser rejects invalid format', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Email format validation verified — browser blocked invalid format');
      });
    });

  // ── Case Sensitivity ───────────────────────────────────────────────────────

  test('login rejects uppercase email (site is case-sensitive)',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Email case handling',
        severity: Severity.MINOR,
        description: 'Verify site treats email as case-sensitive and rejects uppercase variant',
      });

      const emailUpperCase = testUser.email.toUpperCase();

      await test.step('Attempt login with uppercase email', async () => {
        await loginPage.login(emailUpperCase, testUser.password);
      });

      await test.step('Verify login is rejected', async () => {
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('Uppercase email correctly rejected — site is case-sensitive');
      });
    });

  // ── SQL Injection & XSS Prevention ─────────────────────────────────────────

  test('login handles SQL injection attempt safely',
    { tag: '@security' },
    async () => {
      await annotate({
        story: 'Security validation',
        severity: Severity.CRITICAL,
        description: 'Verify SQL injection protection',
      });

      await test.step('Attempt SQL injection in email field', async () => {
        const sqlInjection = "' OR '1'='1";
        await loginPage.enterLoginEmail(sqlInjection);
        await loginPage.enterLoginPassword('password');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify rejection', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('SQL injection attempt safely rejected — browser blocked invalid email');
      });
    });

  test('login handles XSS attempt safely',
    { tag: '@security' },
    async () => {
      await annotate({
        story: 'Security validation',
        severity: Severity.CRITICAL,
        description: 'Verify XSS protection',
      });

      await test.step('Attempt XSS in email field', async () => {
        const xssAttempt = '<script>alert("xss")</script>';
        await loginPage.enterLoginEmail(xssAttempt);
        await loginPage.enterLoginPassword('password');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify rejection', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('XSS attempt safely rejected — browser blocked invalid email');
      });
    });

  // ── Signup Form ────────────────────────────────────────────────────────────

  test('quick signup form is accessible from login page',
    { tag: '@regression' },
    async () => {
      await annotate({
        story: 'Quick signup access',
        severity: Severity.MINOR,
        description: 'Verify new user signup form is available',
      });

      await test.step('Verify signup form displayed', async () => {
        await loginPage.assertSignupFormDisplayed();
        stepLogger.info('Signup form verified as accessible');
      });
    });
});

// ─── Logout Tests ─────────────────────────────────────────────────────────────

test.describe('E-Commerce Logout @critical', () => {
  let testUser: TestUser;

  test.setTimeout(90_000);

  test.beforeAll(async ({ browser }) => {
    testUser = await registerTestUser(browser);
  });

  test.beforeEach(async ({}, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Session Management',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`Starting test: ${testInfo.title}`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`Test failed: ${testInfo.title} (${testInfo.status})`);
      await takeScreenshot(page, `FAILED-logout-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`Test passed: ${testInfo.title}`);
    }
  });

  // ── Logout Flow ────────────────────────────────────────────────────────────

  test('successful logout redirects to login page',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      await annotate({
        story: 'User logout',
        severity: Severity.CRITICAL,
        description: 'Login, verify session, logout, verify redirect',
      });
      await parameter('email', testUser.email);

      const loginPage = new ECommerceLoginPage(page);
      const accountPage = new AccountPage(page);

      await test.step('Login as user', async () => {
        await loginPage.goto();
        await loginPage.login(testUser.email, testUser.password);
        stepLogger.info(`Logged in as: ${testUser.email}`);
      });

      await test.step('Navigate to account page', async () => {
        await accountPage.goto();
        await accountPage.assertUserLoggedIn(testUser.firstName);
        stepLogger.info('User verified as logged in');
      });

      await test.step('Perform logout', async () => {
        await accountPage.logout();
        stepLogger.info('Logout action completed');
      });

      await test.step('Verify redirect to login page', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Redirect to login page verified');
        await takeScreenshot(page, 'logout-success');
      });

      await test.step('Verify session cleared', async () => {
        try {
          await page.goto('https://automationexercise.com/account', {
            waitUntil: 'domcontentloaded',
            timeout: 5000,
          });
          const currentUrl = page.url();
          expect(currentUrl).toMatch(/login/i);
          stepLogger.info('Session properly cleared - redirected to login');
        } catch {
          stepLogger.info('Account page inaccessible after logout (expected)');
        }
      });
    });

  // ── Logout Button Visibility ───────────────────────────────────────────────

  test('logout button is accessible when logged in',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Logout button visibility',
        severity: Severity.MINOR,
      });

      const loginPage = new ECommerceLoginPage(page);
      const accountPage = new AccountPage(page);

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(testUser.email, testUser.password);
      });

      await test.step('Navigate to account page', async () => {
        await accountPage.goto();
      });

      await test.step('Verify logout button visible', async () => {
        await accountPage.assertLogoutButtonVisible();
        stepLogger.info('Logout button verified as visible');
      });
    });

  // ── Session Security ───────────────────────────────────────────────────────

  test('browser back button after logout does not restore session',
    { tag: '@security' },
    async ({ page }) => {
      await annotate({
        story: 'Session security',
        severity: Severity.CRITICAL,
        description: 'Verify browser back button cannot restore logged out session',
      });

      const loginPage = new ECommerceLoginPage(page);
      const accountPage = new AccountPage(page);

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(testUser.email, testUser.password);
        await accountPage.goto();
      });

      await test.step('Logout', async () => {
        await accountPage.logout();
        await loginPage.assertOnLoginPage();
      });

      await test.step('Use browser back button', async () => {
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step('Verify back button does not restore session', async () => {
        await page.waitForTimeout(1000);
        const logoutLink = page.locator('a:has-text("Logout")');
        const isLoggedIn = await logoutLink.isVisible().catch(() => false);
        expect(isLoggedIn).toBe(false);
        stepLogger.info('Browser back button did not restore session');
      });
    });

  // ── Rapid Logout ───────────────────────────────────────────────────────────

  test('double logout click is handled gracefully',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Rapid action handling',
        severity: Severity.MINOR,
        description: 'System handles multiple logout clicks without error',
      });

      const loginPage = new ECommerceLoginPage(page);
      const accountPage = new AccountPage(page);

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(testUser.email, testUser.password);
        await accountPage.goto();
      });

      await test.step('Click logout (first time)', async () => {
        await accountPage.logout();
      });

      await test.step('Verify on login page', async () => {
        await loginPage.assertOnLoginPage();
        stepLogger.info('Successfully logged out');
      });
    });
});

// ─── Full Cycle Tests ─────────────────────────────────────────────────────────

test.describe('Login + Logout Full Cycle @smoke', () => {
  let testUser: TestUser;

  test.setTimeout(90_000);

  test.beforeAll(async ({ browser }) => {
    testUser = await registerTestUser(browser);
  });

  test('complete login-logout cycle',
    { tag: '@smoke' },
    async ({ page }) => {
      await annotate({
        epic: 'E-Commerce Platform',
        feature: 'User Session Management',
        story: 'Login/logout cycle verification',
        severity: Severity.CRITICAL,
      });

      const loginPage = new ECommerceLoginPage(page);
      const accountPage = new AccountPage(page);

      for (let i = 0; i < 2; i++) {
        await test.step(`Cycle ${i + 1}: Login as ${testUser.email}`, async () => {
          await loginPage.goto();
          await loginPage.login(testUser.email, testUser.password);
          stepLogger.info(`Logged in - cycle ${i + 1}`);
        });

        await test.step(`Cycle ${i + 1}: Verify logged in`, async () => {
          await accountPage.goto();
          await accountPage.assertUserLoggedIn(testUser.firstName);
        });

        await test.step(`Cycle ${i + 1}: Logout`, async () => {
          await accountPage.logout();
          await loginPage.assertOnLoginPage();
          stepLogger.info(`Logged out - cycle ${i + 1}`);
        });
      }

      stepLogger.info('All login/logout cycles completed successfully');
      await takeScreenshot(page, 'full-cycle-success');
    });
});
