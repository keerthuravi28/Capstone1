import { test, expect } from '../../main/api/fixtures/api';
import { EmployeeApiClient } from '../../main/api/clients/EmployeeApiClient';
import { ENV } from '../../main/shared/config/env.config';
import { annotate, parameter, attachApiResponse, Severity } from '../../main/shared/reporting/reporting';

test.describe('OrangeHRM API - Authentication', () => {
  test.beforeEach(async () => {
    await annotate({
      epic: 'OrangeHRM API',
      feature: 'Authentication API',
      owner: 'QA Team',
      layer: 'api',
    });
  });

  // ── Session Login ───────────────────────────────────────────────────────────

  test('successful login with valid admin credentials establishes an API session',
    { tag: ['@smoke', '@critical'] },
    async ({ authApi, request }) => {
      await annotate({ story: 'Session login', severity: Severity.BLOCKER });
      await parameter('username', ENV.credentials.username);
      const loggedIn = await authApi.tryLogin(
        ENV.credentials.username,
        ENV.credentials.password
      );
      expect(loggedIn).toBe(true);

      // Same request context now carries the session cookie
      const employeeApi = new EmployeeApiClient(request);
      const response = await employeeApi.getEmployees({ limit: 1 });
      await attachApiResponse('GET /pim/employees (session check)', response);
      expect(response.status).toBe(200);
    });

  test('login fails with invalid username',
    { tag: '@regression' },
    async ({ authApi }) => {
      await annotate({ story: 'Invalid credentials', severity: Severity.NORMAL });
      await parameter('username', 'invalidUser');
      const loggedIn = await authApi.tryLogin('invalidUser', 'admin123');
      expect(loggedIn).toBe(false);
    });

  test('login fails with invalid password',
    { tag: '@regression' },
    async ({ authApi }) => {
      await annotate({ story: 'Invalid credentials', severity: Severity.NORMAL });
      await parameter('scenario', 'invalid password');
      const loggedIn = await authApi.tryLogin(ENV.credentials.username, 'wrongPass');
      expect(loggedIn).toBe(false);
    });

  test('login fails with empty username',
    { tag: '@regression' },
    async ({ authApi }) => {
      await annotate({ story: 'Empty credentials', severity: Severity.MINOR });
      await parameter('scenario', 'empty username');
      const loggedIn = await authApi.tryLogin('', 'admin123');
      expect(loggedIn).toBe(false);
    });

  test('login fails with empty password',
    { tag: '@regression' },
    async ({ authApi }) => {
      await annotate({ story: 'Empty credentials', severity: Severity.MINOR });
      await parameter('scenario', 'empty password');
      const loggedIn = await authApi.tryLogin(ENV.credentials.username, '');
      expect(loggedIn).toBe(false);
    });

  // ── Session Validation ──────────────────────────────────────────────────────

  test('authenticated request to employee list succeeds',
    { tag: '@smoke' },
    async ({ employeeApi }) => {
      await annotate({ story: 'Session validation', severity: Severity.CRITICAL });
      const response = await employeeApi.getEmployees();
      await attachApiResponse('GET /pim/employees (authenticated)', response);
      expect(response.status).toBe(200);
    });

  test('unauthenticated request returns 401',
    { tag: '@regression' },
    async ({ employeeApiNoAuth }) => {
      await annotate({ story: 'Session validation', severity: Severity.CRITICAL });
      const response = await employeeApiNoAuth.getEmployees();
      await attachApiResponse('GET /pim/employees (no auth)', response);
      expect(response.status).toBe(401);
    });
});
