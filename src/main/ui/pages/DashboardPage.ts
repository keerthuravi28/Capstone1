import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * DashboardPage
 * ──────────────
 * Encapsulates the OrangeHRM dashboard and sidebar navigation.
 * URL: /web/index.php/dashboard/index
 */
export class DashboardPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  // Header
  private readonly headerTitle      = this.page.locator('.oxd-topbar-header-breadcrumb h6');
  private readonly userDropdown     = this.page.locator('.oxd-userdropdown-tab');
  private readonly userDropdownMenu = this.page.locator('.oxd-userdropdown-wrapper');
  private readonly logoutOption     = this.page.locator('a:has-text("Logout")');
  private readonly profileName      = this.page.locator('.oxd-userdropdown-name');

  // Sidebar navigation
  // Note: '.oxd-main-menu' alone matches both the wrapper div and the ul (strict-mode violation)
  private readonly sidebarMenu      = this.page.locator('ul.oxd-main-menu');
  private readonly sidebarMenuItems = this.page.locator('.oxd-main-menu-item-wrapper');

  // Dashboard widgets
  private readonly timeAtWorkWidget       = this.page.locator('.orangehrm-dashboard-widget-header:has-text("Time at Work")');
  private readonly myActionsWidget        = this.page.locator('.orangehrm-dashboard-widget-header:has-text("My Actions")');
  private readonly quickLaunchWidget      = this.page.locator('.orangehrm-dashboard-widget-header:has-text("Quick Launch")');
  private readonly buzzLatestPostsWidget  = this.page.locator('.orangehrm-dashboard-widget-header:has-text("Buzz Latest Posts")');
  private readonly employeesOnLeaveWidget = this.page.locator('.orangehrm-dashboard-widget-header:has-text("Employees on Leave Today")');
  private readonly employeeDistribution   = this.page.locator('.orangehrm-dashboard-widget-header:has-text("Employee Distribution by Sub Unit")');

  // Quick Launch buttons
  private readonly quickLaunchButtons = this.page.locator('.orangehrm-quicklaunch-icon-block');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/dashboard/index');
    await this.waitForVisible(this.sidebarMenu);
    pageLogger.info('Dashboard page loaded');
  }

  // ─── Sidebar Navigation ───────────────────────────────────────────────────────

  /**
   * Click a sidebar menu item by its visible label text.
   * @example await dashboard.navigateTo('Admin')
   */
  async navigateTo(menuItem: string): Promise<void> {
    const item = this.page.locator(
      `.oxd-main-menu-item-wrapper:has-text("${menuItem}")`
    );
    pageLogger.info(`Navigating to sidebar item: ${menuItem}`);
    await this.click(item, `Sidebar → ${menuItem}`);
  }

  async getSidebarMenuItems(): Promise<string[]> {
    const items = this.sidebarMenuItems;
    const count = await items.count();
    const labels: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text?.trim()) labels.push(text.trim());
    }

    return labels;
  }

  // ─── User Menu ────────────────────────────────────────────────────────────────

  async getLoggedInUsername(): Promise<string> {
    return this.getText(this.profileName);
  }

  async openUserDropdown(): Promise<void> {
    await this.click(this.userDropdown, 'User dropdown');
    await this.waitForVisible(this.userDropdownMenu);
  }

  async logout(): Promise<void> {
    pageLogger.info('Logging out');
    await this.openUserDropdown();
    await this.click(this.logoutOption, 'Logout');
    await this.waitForUrl(/auth\/login/);
  }

  // ─── Widget Helpers ───────────────────────────────────────────────────────────

  async getWidgetByName(name: string): Promise<Locator> {
    return this.page.locator(
      `.orangehrm-dashboard-widget-header:has-text("${name}")`
    );
  }

  async getQuickLaunchButtonCount(): Promise<number> {
    return this.getCount(this.quickLaunchButtons);
  }

  async clickQuickLaunchButton(buttonName: string): Promise<void> {
    const btn = this.page.locator(
      `.orangehrm-quicklaunch-icon-block:has-text("${buttonName}")`
    );
    await this.click(btn, `Quick launch: ${buttonName}`);
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getHeaderTitle(): Promise<string> {
    return this.getText(this.headerTitle);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnDashboard(): Promise<void> {
    await this.assertVisible(this.sidebarMenu, 'Sidebar should be visible');
    await this.assertUrl(/dashboard\/index/);
  }

  async assertHeaderTitle(expected: string): Promise<void> {
    await this.assertContainsText(this.headerTitle, expected);
  }

  async assertWidgetVisible(widgetName: string): Promise<void> {
    const widget = await this.getWidgetByName(widgetName);
    await this.assertVisible(widget, `Widget "${widgetName}" should be visible`);
  }

  async assertAllDashboardWidgetsVisible(): Promise<void> {
    await this.assertVisible(this.timeAtWorkWidget,       'Time at Work widget');
    await this.assertVisible(this.myActionsWidget,        'My Actions widget');
    await this.assertVisible(this.quickLaunchWidget,      'Quick Launch widget');
    await this.assertVisible(this.buzzLatestPostsWidget,  'Buzz Latest Posts widget');
    await this.assertVisible(this.employeesOnLeaveWidget, 'Employees on Leave widget');
    await this.assertVisible(this.employeeDistribution,   'Employee Distribution widget');
  }

  async assertSidebarMenuContains(menuName: string): Promise<void> {
    const item = this.page.locator(
      `.oxd-main-menu-item-wrapper:has-text("${menuName}")`
    );
    await this.assertVisible(item, `Sidebar menu "${menuName}" should be visible`);
  }

  async assertUserLoggedIn(expectedUsername: string): Promise<void> {
    await this.assertContainsText(this.profileName, expectedUsername);
  }

  /** Header shows a non-empty logged-in user name. */
  async assertLoggedInUserDisplayed(): Promise<void> {
    await this.assertVisible(this.profileName, 'Logged-in user name should be visible');
    await this.assertNotEmpty(this.profileName);
  }

  async assertQuickLaunchButtonCountAtLeast(minCount: number): Promise<void> {
    await this.assertCountAtLeast(this.quickLaunchButtons, minCount);
  }
}
