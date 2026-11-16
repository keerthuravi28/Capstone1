import { test } from '../../main/ui/fixtures/authorization';
import { readCsv, readJson } from '../../main/shared/data/data-reader';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

// ─── Test Data ─────────────────────────────────────────────────────────────────
// Loaded at module load time (not inside a test) — Playwright needs the data
// before it can register the generated tests below.

type CredentialRecord = {
  username: string;
  password: string;
  expectedError: string;
  description: string;
};

type EmptyCredentialRecord = CredentialRecord & {
  field: 'username' | 'password' | 'both';
};

type UsersData = {
  admin: { username: string; password: string; role: string; description: string };
  invalidUsers: CredentialRecord[];
  emptyCredentials: EmptyCredentialRecord[];
};

type CsvUserRow = {
  username: string;
  password: string;
  role: string;
  expectedResult: string; // success | failure | validation
  description: string;
};

const users = readJson<UsersData>('users.json');
const validUsers = readCsv<CsvUserRow>('users.csv')
  .filter((row) => row.expectedResult === 'success');

/** Turn a test title into a safe screenshot file name. */
function toFileName(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

test.describe('OrangeHRM Login', () => {
  test.beforeEach(async ({ loginPage }, testInfo) => {
    await annotate({
      epic: 'OrangeHRM Web UI',
      feature: 'Authentication',
      owner: 'QA Team',
      layer: 'ui',
    });
    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title} (${testInfo.status})`);
      await takeScreenshot(page, `FAILED-${toFileName(testInfo.title)}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Happy Path ──────────────────────────────────────────────────────────────

  test('successful login with valid admin credentials',
    { tag: ['@smoke', '@critical'] },
    async ({ loginPage, dashboardPage, page }) => {
      await annotate({
        story: 'Valid login',
        severity: Severity.BLOCKER,
        description: 'Admin logs in with valid credentials and lands on the dashboard.',
      });
      await parameter('username', users.admin.username);
      await test.step('Enter credentials and submit', async () => {
        stepLogger.info(`Logging in with admin user from users.json: ${users.admin.username}`);
        await loginPage.login(users.admin.username, users.admin.password);
      });
      await test.step('Verify redirect to dashboard', async () => {
        await dashboardPage.assertOnDashboard();
        await dashboardPage.assertHeaderTitle('HRM');
        stepLogger.info('Dashboard verified after login');
        await takeScreenshot(page, 'login-success-dashboard');
      });
    });

  // Data driven from test-data/users.csv (rows with expectedResult = success)
  for (const user of validUsers) {
    test(`successful login as ${user.username} (${user.description})`,
      { tag: '@smoke' },
      async ({ loginPage, dashboardPage }) => {
        await annotate({ story: 'Valid login (data-driven)', severity: Severity.CRITICAL });
        await parameter('username', user.username);
        await parameter('dataSource', 'users.csv');
        stepLogger.info(`CSV data-driven login: ${user.username} — ${user.description}`);
        await loginPage.login(user.username, user.password);
        await dashboardPage.assertOnDashboard();
        stepLogger.info(`Login verified for CSV user: ${user.username}`);
      });
  }

  // ── Negative Path ───────────────────────────────────────────────────────────
  // Data driven from test-data/users.json → invalidUsers

  for (const user of users.invalidUsers) {
    test(`login fails: ${user.description}`,
      { tag: '@regression' },
      async ({ loginPage, page }) => {
        await annotate({ story: 'Invalid login', severity: Severity.NORMAL });
        await parameter('scenario', user.description);
        await parameter('expectedError', user.expectedError);
        stepLogger.info(`Negative login attempt: ${user.description}`);
        await loginPage.login(user.username, user.password);
        await loginPage.assertLoginError(user.expectedError);
        stepLogger.info(`Error message verified: "${user.expectedError}"`);
        await takeScreenshot(page, `login-error-${toFileName(user.description)}`);
      });
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  // Data driven from test-data/users.json → emptyCredentials

  for (const cred of users.emptyCredentials) {
    test(`login validation: ${cred.description}`,
      { tag: '@regression' },
      async ({ loginPage }) => {
        await annotate({ story: 'Field validation', severity: Severity.MINOR });
        await parameter('emptyField', cred.field);
        stepLogger.info(`Field validation check: ${cred.description}`);
        if (cred.username) {
          await loginPage.enterUsername(cred.username);
        }
        if (cred.password) {
          await loginPage.enterPassword(cred.password);
        }
        await loginPage.clickLoginButton();

        if (cred.field === 'username' || cred.field === 'both') {
          await loginPage.assertUsernameRequired();
        }
        if (cred.field === 'password' || cred.field === 'both') {
          await loginPage.assertPasswordRequired();
        }
        stepLogger.info(`"Required" validation verified for field(s): ${cred.field}`);
      });
  }

  // ── UI Checks ───────────────────────────────────────────────────────────────

  test('login page displays all required elements',
    { tag: '@regression' },
    async ({ loginPage, page }) => {
      await annotate({ story: 'Login page UI', severity: Severity.MINOR });
      stepLogger.info('Verifying login page UI elements');
      await loginPage.assertLogoVisible();
      await loginPage.assertLoginFormDisplayed();
      await takeScreenshot(page, 'login-page-elements');
    });

  // ── Logout ──────────────────────────────────────────────────────────────────

  test('admin can logout successfully',
    { tag: '@smoke' },
    async ({ loginPage, dashboardPage, page }) => {
      await annotate({ story: 'Logout', severity: Severity.CRITICAL });
      stepLogger.info('Logging in as admin (credentials from ENV config)');
      await loginPage.loginAsAdmin();
      await dashboardPage.assertOnDashboard();
      await test.step('Logout via user menu', async () => {
        await dashboardPage.logout();
        stepLogger.info('Logout completed');
      });
      await loginPage.assertOnLoginPage();
      await takeScreenshot(page, 'logout-back-on-login-page');
    });
});
