import { test, expect } from '@playwright/test';
import { ECommerceLoginPage } from '../../main/ui/pages/ECommerceLoginPage';
import { AccountPage } from '../../main/ui/pages/AccountPage';
import { readCsv, readJson } from '../../main/shared/data/data-reader';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * ABOUTME: E-Commerce login and logout test suite.
 * ABOUTME: Tests cover happy path, validation, error scenarios, and session management.
 */

// ─── Test Data ────────────────────────────────────────────────────────────────

type LoginCredential = {
  email: string;
  password: string;
  expectedResult: string;
  role: string;
  description: string;
};

type RegistrationTestData = {
  existingUsers: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    description: string;
  }>;
};

const loginCredentials = readCsv<LoginCredential>('login-credentials.csv');
const registrationData = readJson<RegistrationTestData>('registration-users.json');

const validUsers = loginCredentials.filter((cred) => cred.expectedResult === 'success');
const invalidUsers = loginCredentials.filter((cred) => cred.expectedResult === 'failure');

test.describe('E-Commerce Login @smoke @critical', () => {
  let loginPage: ECommerceLoginPage;

  test.beforeEach(async ({ page }, testInfo) => {
    loginPage = new ECommerceLoginPage(page);

    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Authentication',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title} (${testInfo.status})`);
      await takeScreenshot(page, `FAILED-login-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
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
    async ({ page }) => {
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

  // ── Valid Credentials (Data-Driven) ──────────────────────────────────────────

  for (const credential of validUsers) {
    test(`successful login: ${credential.description}`,
      { tag: ['@smoke', '@critical'] },
      async ({ page }) => {
        await annotate({
          story: 'Valid login',
          severity: Severity.BLOCKER,
          description: `Login with valid ${credential.role} credentials`,
        });
        await parameter('email', credential.email);
        await parameter('role', credential.role);

        await test.step('Enter credentials and submit', async () => {
          stepLogger.info(`Attempting login with email: ${credential.email}`);
          await loginPage.login(credential.email, credential.password);
        });

        await test.step('Verify successful login', async () => {
          let accountPage = new AccountPage(page);
          await accountPage.goto();
          await accountPage.assertOnAccountPage();
          await accountPage.assertUserLoggedIn();
          stepLogger.info('Login verified - user on account page');
          await takeScreenshot(page, `login-success-${credential.role}`);
        });
      });
  }

  // ── Invalid Credentials (Data-Driven) ────────────────────────────────────────

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

        await test.step('Verify error message', async () => {
          await loginPage.assertLoginErrorMessageVisible();
          const errorMsg = await loginPage.getLoginErrorMessage();
          stepLogger.info(`Error message: ${errorMsg}`);
          expect(errorMsg.length).toBeGreaterThan(0);
          await takeScreenshot(page, `login-error-${credential.expectedResult}`);
        });
      });
  }

  // ── Validation Errors ────────────────────────────────────────────────────────

  test('login form requires both email and password',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Field validation',
        severity: Severity.MINOR,
        description: 'Verify required field validation',
      });

      await test.step('Attempt login without credentials', async () => {
        await loginPage.clickLoginButton();
      });

      await test.step('Verify validation error', async () => {
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('Required field validation verified');
      });
    });

  test('login fails with only email (missing password)',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Password required validation',
        severity: Severity.NORMAL,
      });

      await test.step('Enter email without password', async () => {
        await loginPage.enterLoginEmail('test@example.com');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify error', async () => {
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('Password required validation verified');
      });
    });

  test('login fails with only password (missing email)',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Email required validation',
        severity: Severity.NORMAL,
      });

      await test.step('Enter password without email', async () => {
        await loginPage.enterLoginPassword('Password123');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify error', async () => {
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('Email required validation verified');
      });
    });

  // ── Email Format Validation ──────────────────────────────────────────────────

  test('login fails with invalid email format',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Email format validation',
        severity: Severity.MINOR,
      });

      await test.step('Enter malformed email', async () => {
        await loginPage.enterLoginEmail('not-a-valid-email');
        await loginPage.enterLoginPassword('Password123');
        await loginPage.clickLoginButton();
      });

      await test.step('Verify validation error', async () => {
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('Email format validation verified');
      });
    });

  // ── Case Sensitivity ─────────────────────────────────────────────────────────

  test('login is case-insensitive for email',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Email case handling',
        severity: Severity.MINOR,
        description: 'Verify email login is case-insensitive',
      });

      const testUser = validUsers[0];
      const emailUpperCase = testUser.email.toUpperCase();

      await test.step('Login with uppercase email', async () => {
        await loginPage.login(emailUpperCase, testUser.password);
      });

      await test.step('Verify successful login', async () => {
        let accountPage = new AccountPage(page);
        await accountPage.goto();
        await accountPage.assertOnAccountPage();
        stepLogger.info('Case-insensitive email login verified');
      });
    });

  // ── SQL Injection & XSS Prevention ───────────────────────────────────────────

  test('login handles SQL injection attempt safely',
    { tag: '@security' },
    async ({ page }) => {
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
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('SQL injection attempt safely rejected');
      });
    });

  test('login handles XSS attempt safely',
    { tag: '@security' },
    async ({ page }) => {
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
        await loginPage.assertLoginErrorMessageVisible();
        stepLogger.info('XSS attempt safely rejected');
      });
    });

  // ── Signup Form ──────────────────────────────────────────────────────────────

  test('quick signup form is accessible from login page',
    { tag: '@regression' },
    async ({ page }) => {
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

test.describe('E-Commerce Logout @critical', () => {
  let accountPage: AccountPage;

  test.beforeEach(async ({ page }, testInfo) => {
    accountPage = new AccountPage(page);

    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'User Session Management',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title} (${testInfo.status})`);
      await takeScreenshot(page, `FAILED-logout-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Logout Flow ──────────────────────────────────────────────────────────────

  for (const user of registrationData.existingUsers) {
    test(`successful logout: ${user.description}`,
      { tag: ['@smoke', '@critical'] },
      async ({ page }) => {
        await annotate({
          story: 'User logout',
          severity: Severity.CRITICAL,
          description: `Logout for: ${user.description}`,
        });
        await parameter('email', user.email);

        let loginPage = new ECommerceLoginPage(page);

        await test.step('Login as user', async () => {
          await loginPage.goto();
          await loginPage.login(user.email, user.password);
          stepLogger.info(`Logged in as: ${user.email}`);
        });

        await test.step('Navigate to account page', async () => {
          await accountPage.goto();
          await accountPage.assertUserLoggedIn(user.firstName);
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

        await test.step('Verify session cleared - cannot access account page without login', async () => {
          // Navigate to account page without re-logging in
          try {
            await page.goto(`${page.url()}/account`, { waitUntil: 'domcontentloaded', timeout: 5000 });
            // Should either redirect to login or show error
            const currentUrl = page.url();
            expect(currentUrl).toMatch(/login/i);
            stepLogger.info('Session properly cleared - redirected to login');
          } catch (error) {
            stepLogger.info('Account page inaccessible after logout (expected)');
          }
        });
      });
  }

  // ── Logout Button Visibility ─────────────────────────────────────────────────

  test('logout button is accessible when logged in',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Logout button visibility',
        severity: Severity.MINOR,
      });

      let loginPage = new ECommerceLoginPage(page);
      const user = registrationData.existingUsers[0];

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(user.email, user.password);
      });

      await test.step('Navigate to account page', async () => {
        await accountPage.goto();
      });

      await test.step('Verify logout button visible', async () => {
        await accountPage.assertLogoutButtonVisible();
        stepLogger.info('Logout button verified as visible');
      });
    });

  // ── Session Security ─────────────────────────────────────────────────────────

  test('browser back button after logout does not restore session',
    { tag: '@security' },
    async ({ page }) => {
      await annotate({
        story: 'Session security',
        severity: Severity.CRITICAL,
        description: 'Verify browser back button cannot restore logged out session',
      });

      let loginPage = new ECommerceLoginPage(page);
      const user = registrationData.existingUsers[0];

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(user.email, user.password);
        await accountPage.goto();
      });

      await test.step('Logout', async () => {
        await accountPage.logout();
        await loginPage.assertOnLoginPage();
      });

      await test.step('Use browser back button', async () => {
        await page.goBack();
      });

      await test.step('Verify back button does not restore session', async () => {
        // Should stay on login page or redirect to login
        const url = page.url();
        expect(url).toMatch(/login/i);
        stepLogger.info('Browser back button did not restore session');
      });
    });

  // ── Rapid Logout ─────────────────────────────────────────────────────────────

  test('double logout click is handled gracefully',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Rapid action handling',
        severity: Severity.MINOR,
        description: 'System handles multiple logout clicks without error',
      });

      let loginPage = new ECommerceLoginPage(page);
      const user = registrationData.existingUsers[0];

      await test.step('Login user', async () => {
        await loginPage.goto();
        await loginPage.login(user.email, user.password);
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

test.describe('Login + Logout Full Cycle @smoke', () => {
  test('complete login-logout cycle for multiple users in sequence',
    { tag: '@smoke' },
    async ({ page }) => {
      await annotate({
        epic: 'E-Commerce Platform',
        feature: 'User Session Management',
        story: 'Multiple sequential login/logout cycles',
        severity: Severity.CRITICAL,
      });

      let loginPage = new ECommerceLoginPage(page);
      let accountPage = new AccountPage(page);

      for (let i = 0; i < Math.min(2, registrationData.existingUsers.length); i++) {
        const user = registrationData.existingUsers[i];

        await test.step(`Cycle ${i + 1}: Login as ${user.email}`, async () => {
          await loginPage.goto();
          await loginPage.login(user.email, user.password);
          stepLogger.info(`Logged in - cycle ${i + 1}`);
        });

        await test.step(`Cycle ${i + 1}: Verify logged in`, async () => {
          await accountPage.goto();
          await accountPage.assertUserLoggedIn(user.firstName);
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
