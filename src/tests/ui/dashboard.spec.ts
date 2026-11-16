import { test } from '../../main/ui/fixtures/authorization';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

test.describe('OrangeHRM Dashboard', () => {
  // The loggedIn fixture authenticates and already lands on a verified
  // dashboard (assertOnDashboard runs inside it) — no extra goto() needed.
  test.beforeEach(async ({ loggedIn }) => {
    await annotate({
      epic: 'OrangeHRM Web UI',
      feature: 'Dashboard',
      owner: 'QA Team',
      layer: 'ui',
    });
  });

  test('dashboard story: clicking Dashboard from left panel keeps header visible',
    { tag: ['@smoke', '@critical'] },
    async ({ dashboardPage }) => {
      await annotate({ story: 'Dashboard header story', severity: Severity.CRITICAL });
      await parameter('targetMenu', 'Dashboard');

      await test.step('Click Dashboard from left panel', async () => {
        await dashboardPage.navigateTo('Dashboard');
      });

      await test.step('Validate user remains on dashboard', async () => {
        await dashboardPage.assertOnDashboard();
      });

      await test.step('Validate dashboard header remains visible', async () => {
        await dashboardPage.assertHeaderTitle('Dashboard');
      });
    });

  // ── Page Structure ──────────────────────────────────────────────────────────

  test('dashboard displays all expected widgets',
    { tag: '@smoke' },
    async ({ dashboardPage }) => {
      await annotate({ story: 'Page structure', severity: Severity.NORMAL });
      for (const widget of [
        'Time at Work',
        'My Actions',
        'Quick Launch',
        'Buzz Latest Posts',
        'Employees on Leave Today',
        'Employee Distribution by Sub Unit',
      ]) {
        await dashboardPage.assertWidgetVisible(widget);
      }
    });

  // ── Sidebar Navigation ──────────────────────────────────────────────────────

  test('sidebar navigation contains all expected menu items',
    { tag: ['@smoke', '@critical'] },
    async ({ dashboardPage }) => {
      await annotate({ story: 'Sidebar navigation', severity: Severity.CRITICAL });
      for (const menu of [
        'Admin', 'PIM', 'Leave', 'Time', 'Recruitment',
        'My Info', 'Performance', 'Dashboard', 'Directory', 'Maintenance', 'Buzz',
      ]) {
        await dashboardPage.assertSidebarMenuContains(menu);
      }
    });

  test('navigating to Admin from the sidebar',
    { tag: '@regression' },
    async ({ dashboardPage }) => {
      await annotate({ story: 'Sidebar navigation', severity: Severity.NORMAL });
      await parameter('targetMenu', 'Admin');
      await dashboardPage.navigateTo('Admin');
      await dashboardPage.assertUrl(/viewSystemUsers/);
    });

  // ── User Info ───────────────────────────────────────────────────────────────

  test('logged in user name is displayed in the header',
    { tag: '@smoke' },
    async ({ dashboardPage }) => {
      await annotate({ story: 'User info', severity: Severity.NORMAL });
      await dashboardPage.assertLoggedInUserDisplayed();
    });

  // ── Quick Launch ────────────────────────────────────────────────────────────

  test('quick launch widget has at least 6 buttons',
    { tag: '@regression' },
    async ({ dashboardPage }) => {
      await annotate({ story: 'Quick launch', severity: Severity.MINOR });
      await dashboardPage.assertQuickLaunchButtonCountAtLeast(6);
    });
});
