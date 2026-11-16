import { test } from '../../main/ui/fixtures/authorization';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * Visual regression coverage.
 *
 * Baselines are OS/browser-render-dependent, so these run on Chromium only —
 * running the same comparisons on Firefox/WebKit would just produce constant
 * false-positive diffs from font/anti-aliasing differences, not real bugs.
 * (`npm run test:cross-browser` still runs everything else on all three.)
 *
 * Pages/regions were chosen deliberately for stability: OrangeHRM's dashboard
 * has a live-updating "Time at Work" clock and demo data that mutates from
 * other test runs, so a full dashboard screenshot would be flaky by design —
 * only the static sidebar is compared here. If dashboard widget coverage is
 * wanted later, mask the dynamic widgets via `options.mask` (see
 * WebAssertions.assertPageScreenshotMatches) once their DOM is confirmed.
 *
 * First run (or after an intentional UI change) needs baselines created:
 *   npm run test:visual:update
 * Baselines are stored in resources/visual-baselines/ (see snapshotPathTemplate
 * in playwright.config.ts) and MUST be committed to git — unlike
 * test-results/, they are not throwaway output.
 */
test.describe('OrangeHRM Visual Regression', () => {
  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual baselines are maintained for Chromium only');
    await annotate({
      epic: 'OrangeHRM Web UI',
      feature: 'Visual Regression',
      owner: 'QA Team',
      layer: 'ui',
    });
  });

  test('login page matches visual baseline',
    { tag: ['@visual', '@smoke'] },
    async ({ loginPage }) => {
      await annotate({ story: 'Login page — default state', severity: Severity.NORMAL });
      await loginPage.goto();

      await loginPage.assertPageScreenshotMatches('login-page.png');
    });

  test('login page validation error matches visual baseline',
    { tag: ['@visual', '@regression'] },
    async ({ loginPage }) => {
      await annotate({ story: 'Login page — validation error state', severity: Severity.MINOR });
      await loginPage.goto();
      await loginPage.clickLoginButton();
      await loginPage.assertUsernameRequired();

      await loginPage.assertPageScreenshotMatches('login-page-validation-error.png');
    });

  test('dashboard sidebar navigation matches visual baseline',
    { tag: ['@visual', '@smoke'] },
    async ({ loggedIn, dashboardPage, page }) => {
      await annotate({ story: 'Dashboard — sidebar navigation', severity: Severity.NORMAL });

      // Scoped to the static sidebar menu rather than the full dashboard —
      // the dashboard body has live-updating widgets (see file header note).
      const sidebar = page.locator('ul.oxd-main-menu');
      await dashboardPage.assertScreenshotMatches(sidebar, 'dashboard-sidebar.png');
      await parameter('region', 'sidebar navigation only');
    });
});
