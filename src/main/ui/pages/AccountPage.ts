import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: AccountPage encapsulates user account management and profile interactions.
 * ABOUTME: Handles account info display, logout, and profile access.
 */
export class AccountPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  // Account navigation
  private readonly accountLink = this.page.locator('a:has-text("Account")');
  private readonly logoutLink = this.page.locator('a[href*="logout"]');
  private readonly deleteAccountLink = this.page.locator('a:has-text("Delete Account")');

  // Account info display (site shows logged-in state in the top nav bar)
  private readonly accountNameDisplay = this.page.locator('li:has-text("Logged in as") b');
  private readonly userGreeting = this.page.locator('li:has-text("Logged in as")');
  private readonly loggedInIndicator = this.page.locator('li:has-text("Logged in as")');

  // Account menu
  private readonly accountMenu = this.page.locator('div[class*="account"] a, li a[href*="account"]');

  // Profile elements
  private readonly editProfileLink = this.page.locator('a:has-text("Edit Account")');
  private readonly downloadInvoiceLink = this.page.locator('a:has-text("Download Invoice")');
  private readonly addressBookLink = this.page.locator('a:has-text("Addresses")');
  private readonly ordersLink = this.page.locator('a:has-text("Orders")');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/');
    await this.waitForVisible(this.loggedInIndicator, 15000);
    pageLogger.info('Logged-in home page loaded');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    pageLogger.info('Logging out user');
    await this.click(this.logoutLink, 'Logout Link');
    pageLogger.info('Logout action completed');
  }

  async deleteAccount(): Promise<void> {
    pageLogger.warn('Deleting user account');
    await this.click(this.deleteAccountLink, 'Delete Account Link');
  }

  async openEditProfile(): Promise<void> {
    await this.click(this.editProfileLink, 'Edit Profile Link');
    pageLogger.info('Edit profile page opened');
  }

  async openAddressBook(): Promise<void> {
    await this.click(this.addressBookLink, 'Address Book Link');
    pageLogger.info('Address book page opened');
  }

  async openOrders(): Promise<void> {
    await this.click(this.ordersLink, 'Orders Link');
    pageLogger.info('Orders page opened');
  }

  async clickAccountMenu(): Promise<void> {
    await this.click(this.accountLink, 'Account Menu');
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getUserGreeting(): Promise<string> {
    return this.getText(this.userGreeting);
  }

  async getAccountNameDisplay(): Promise<string> {
    return this.getText(this.accountNameDisplay);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnAccountPage(): Promise<void> {
    await this.assertVisible(this.loggedInIndicator, 'Logged in indicator should be visible');
  }

  async assertUserLoggedIn(userName?: string): Promise<void> {
    await this.assertVisible(this.userGreeting, 'User greeting should be visible');
    if (userName) {
      await this.assertContainsText(this.userGreeting, userName);
    }
    pageLogger.info('User verified as logged in');
  }

  async assertLogoutButtonVisible(): Promise<void> {
    await this.assertVisible(this.logoutLink, 'Logout link should be visible');
  }

  async assertEditProfileLinkVisible(): Promise<void> {
    await this.assertVisible(this.editProfileLink, 'Edit Profile link should be visible');
  }

  async assertAccountMenuVisible(): Promise<void> {
    await this.assertVisible(this.accountMenu, 'Account menu should be visible');
  }
}
