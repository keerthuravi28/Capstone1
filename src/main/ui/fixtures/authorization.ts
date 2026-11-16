import { test as base, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ENV } from '../../shared/config/env.config';
import { STORAGE_STATE } from '../../shared/config/global-setup';
import { pageLogger } from '../../shared/utils/logger';

type UIFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  /** Logs in as the default admin user before the test body runs. */
  loggedIn: void;
};

export const test = base.extend<UIFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  /**
   * Puts the test into an authenticated state.
   *
   * Fast path: restore the admin session captured once by global-setup
   * (OrangeHRM auth is cookie-based) and navigate straight to the dashboard —
   * no login form, no extra round-trip.
   *
   * Fallback: if the saved session is missing (e.g. global-setup was skipped,
   * or a single spec was run without it), log in through the UI so the test
   * still works. This keeps the fixture resilient without sacrificing the
   * common-case speed-up.
   */
  loggedIn: async ({ page, loginPage, dashboardPage }, use) => {
    if (fs.existsSync(STORAGE_STATE)) {
      const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8')) as {
        cookies?: Parameters<BrowserContext['addCookies']>[0];
      };
      await page.context().addCookies(state.cookies ?? []);
      await dashboardPage.goto();
    } else {
      pageLogger.warn(
        `Saved session not found at ${STORAGE_STATE} — falling back to UI login. ` +
        'Run the full suite (or `npm test`) so global-setup can create it.'
      );
      await loginPage.goto();
      await loginPage.login(ENV.credentials.username, ENV.credentials.password);
    }
    await dashboardPage.assertOnDashboard();
    await use();
  },
});

export { expect } from '@playwright/test';
