import { test, expect } from '../../main/ui/fixtures/authorization';
import { SecurityHelper, XSS_PAYLOADS } from '../../main/ui/helpers/SecurityHelper';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * Security coverage — lightweight, non-destructive checks only.
 *
 * This is NOT a penetration test. It checks configuration (security
 * headers, cookie flags) and whether the app safely escapes attacker-
 * controlled input rather than executing or leaking it — a handful of
 * requests per test, not sustained traffic. That distinction matters
 * because this suite targets a shared public demo instance the team
 * doesn't own; unlike real load/pen-testing, these checks cost the target
 * nothing extra to run.
 */
test.describe('OrangeHRM Security', () => {
  test.beforeEach(async () => {
    await annotate({
      epic: 'OrangeHRM Web UI',
      feature: 'Security',
      owner: 'QA Team',
      layer: 'ui',
    });
  });

  // ── Headers ────────────────────────────────────────────────────────────────

  test('login page sends recommended security headers',
    { tag: ['@security', '@smoke'] },
    async ({ page }) => {
      await annotate({ story: 'Security headers', severity: Severity.NORMAL });

      const response = await page.goto('/web/index.php/auth/login');
      const security = new SecurityHelper(page);

      const headers = response?.headers() ?? {};
      await parameter('headersSeen', Object.keys(headers).join(', '));
      security.assertSecurityHeaders(headers);
    });

  // ── Cookies ────────────────────────────────────────────────────────────────

  test('session cookie has Secure, HttpOnly, and SameSite flags',
    { tag: ['@security', '@smoke'] },
    async ({ loggedIn, page }) => {
      await annotate({ story: 'Session cookie flags', severity: Severity.CRITICAL });

      const security = new SecurityHelper(page);
      const sessionCookie = await security.findCookie((c) => /sess/i.test(c.name));

      expect(sessionCookie, 'Expected to find a session cookie (name containing "sess") after login').toBeDefined();
      await parameter('cookieName', sessionCookie?.name ?? 'not found');

      if (sessionCookie) {
        await security.assertCookieSecurity(sessionCookie.name);
      }
    });

  // ── XSS ────────────────────────────────────────────────────────────────────

  test('login form does not execute injected script from the username field',
    { tag: ['@security', '@regression'] },
    async ({ loginPage, page }) => {
      await annotate({ story: 'XSS — login form', severity: Severity.CRITICAL });
      await loginPage.goto();

      const security = new SecurityHelper(page);
      const payload = XSS_PAYLOADS[0];
      await parameter('payload', payload);

      await security.assertNoScriptExecutes(async () => {
        await loginPage.login(payload, 'irrelevant-password');
      });
      await security.assertPayloadNotReflectedRaw(payload);
    });
});
