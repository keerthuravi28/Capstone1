import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * LoginPage
 * ──────────
 * Encapsulates all interactions with the OrangeHRM login screen.
 * URL: /web/index.php/auth/login
 */
export class LoginPage extends BasePage {

  // ─── Selectors ───────────────────────────────────────────────────────────────

  private readonly usernameInput = this.page.locator('input[name="username"]');
  private readonly passwordInput = this.page.locator('input[name="password"]');
  private readonly loginButton   = this.page.locator('button[type="submit"]');
  private readonly errorAlert    = this.page.locator('.oxd-alert-content-text');
  private readonly usernameError = this.page.locator(
    '.oxd-form-row:has(input[name="username"]) .oxd-input-field-error-message'
  );
  private readonly passwordError = this.page.locator(
    '.oxd-form-row:has(input[name="password"]) .oxd-input-field-error-message'
  );
  private readonly logoImage      = this.page.locator('.orangehrm-login-logo img');
  private readonly loginTitle     = this.page.locator('.orangehrm-login-title');
  private readonly forgotPassword = this.page.locator('.orangehrm-login-forgot-header');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/auth/login');
    await this.waitForVisible(this.loginButton);
    pageLogger.info('Login page loaded');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async enterUsername(username: string): Promise<void> {
    await this.fill(this.usernameInput, username, 'Username');
  }

  async enterPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password, 'Password');
  }

  async clickLoginButton(): Promise<void> {
    await this.click(this.loginButton, 'Login button');
  }

  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPassword, 'Forgot Password link');
  }

  /**
   * Complete login flow: enter credentials and submit.
   */
  async login(username: string, password: string): Promise<void> {
    pageLogger.info(`Logging in as: ${username}`);
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
  }

  /**
   * Login with credentials from ENV config (default admin).
   */
  async loginAsAdmin(): Promise<void> {
    const { username, password } = (await import('../../shared/config/env.config')).ENV.credentials;
    await this.login(username, password);
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getErrorMessage(): Promise<string> {
    await this.waitForVisible(this.errorAlert, 5000);
    return this.getText(this.errorAlert);
  }

  async getUsernameErrorMessage(): Promise<string> {
    await this.waitForVisible(this.usernameError, 5000);
    return this.getText(this.usernameError);
  }

  async getPasswordErrorMessage(): Promise<string> {
    await this.waitForVisible(this.passwordError, 5000);
    return this.getText(this.passwordError);
  }

  async getLoginTitle(): Promise<string> {
    return this.getText(this.loginTitle);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnLoginPage(): Promise<void> {
    await this.assertVisible(this.loginButton, 'Login button should be visible');
    await this.assertVisible(this.usernameInput, 'Username input should be visible');
    await this.assertUrl(/auth\/login/);
  }

  async assertLoginError(expectedMessage: string): Promise<void> {
    await this.assertContainsText(this.errorAlert, expectedMessage);
  }

  async assertUsernameRequired(): Promise<void> {
    await this.assertContainsText(this.usernameError, 'Required');
  }

  async assertPasswordRequired(): Promise<void> {
    await this.assertContainsText(this.passwordError, 'Required');
  }

  async assertLogoVisible(): Promise<void> {
    await this.assertVisible(this.logoImage, 'OrangeHRM logo should be visible');
  }

  /** All elements a user needs to log in are displayed. */
  async assertLoginFormDisplayed(): Promise<void> {
    await this.assertVisible(this.usernameInput, 'Username input should be visible');
    await this.assertVisible(this.passwordInput, 'Password input should be visible');
    await this.assertVisible(this.loginButton, 'Login button should be visible');
  }
}
