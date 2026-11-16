import { test } from '../../main/ui/fixtures/authorization';
import { AccessibilityHelper } from '../../main/ui/helpers/AccessibilityHelper';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * Accessibility (WCAG 2.1 AA) smoke coverage.
 *
 * Scans key OrangeHRM pages with axe-core and fail only on 'serious' or
 * 'critical' violations — 'minor'/'moderate' findings are still logged and
 * attached to the test report, but don't fail the build. This keeps the
 * suite actionable against a third-party demo instance that the team
 * doesn't control, while still catching real regressions.
 */
test.describe('OrangeHRM Accessibility', () => {
  test.beforeEach(async () => {
    await annotate({
      epic: 'OrangeHRM Web UI',
      feature: 'Accessibility (WCAG 2.1 AA)',
      owner: 'QA Team',
      layer: 'ui',
    });
  });

  test('login page has no serious or critical accessibility violations',
    { tag: ['@accessibility', '@smoke'] },
    async ({ loginPage, page }) => {
      await annotate({ story: 'Login page', severity: Severity.NORMAL });
      await loginPage.goto();

      const a11y = new AccessibilityHelper(page);
      const violations = await a11y.scan();
      await parameter('violationCount', String(violations.length));

      a11y.assertNoViolations(violations, { minSeverity: 'serious' });
    });

  test('dashboard has no serious or critical accessibility violations',
    { tag: ['@accessibility', '@smoke'] },
    async ({ loggedIn, page }) => {
      await annotate({ story: 'Dashboard', severity: Severity.NORMAL });

      const a11y = new AccessibilityHelper(page);
      const violations = await a11y.scan();
      await parameter('violationCount', String(violations.length));

      a11y.assertNoViolations(violations, { minSeverity: 'serious' });
    });
});
