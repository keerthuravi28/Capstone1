import { test as base, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { AuthApiClient } from '../clients/AuthApiClient';
import { EmployeeApiClient } from '../clients/EmployeeApiClient';

type ApiFixtures = {
  /** Auth client on the test's own (unauthenticated) request context. */
  authApi: AuthApiClient;
  /** Employee client bound to the worker's authenticated session. */
  employeeApi: EmployeeApiClient;
  /** Employee client WITHOUT a session — use for 401 tests. */
  employeeApiNoAuth: EmployeeApiClient;
};

type ApiWorkerFixtures = {
  /**
   * Request context with an admin session established once per worker.
   * OrangeHRM auth is cookie-based, so the session lives in this context.
   */
  apiSession: APIRequestContext;
};

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  apiSession: [
    async (_deps, use) => {
      const context = await playwrightRequest.newContext();
      const authApi = new AuthApiClient(context);
      await authApi.loginFromEnv();
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  authApi: async ({ request }, use) => {
    await use(new AuthApiClient(request));
  },

  employeeApi: async ({ apiSession }, use) => {
    await use(new EmployeeApiClient(apiSession));
  },

  employeeApiNoAuth: async ({ request }, use) => {
    await use(new EmployeeApiClient(request));
  },
});

export { expect } from '@playwright/test';