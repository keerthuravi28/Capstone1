import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: ECommerceLoginPage encapsulates e-commerce platform login interactions.
 * ABOUTME: Handles user authentication, error validation, and form interactions.
 */
export class ECommerceLoginPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  // Login form - for existing users
  private readonly loginEmailInput = this.page.locator('input[data-qa="login-email"]');
  private readonly loginPasswordInput = this.page.locator('input[data-qa="login-password"]');
  private readonly loginButton = this.page.locator('button[data-qa="login-button"]');

  // Registration form - for new users
  private readonly signupNameInput = this.page.locator('input[data-qa="signup-name"]');
  private readonly signupEmailInput = this.page.locator('input[data-qa="signup-email"]');
  private readonly signupButton = this.page.locator('button[data-qa="signup-button"]');

  // Error messages (site renders errors as styled <p> tags, not data-qa elements)
  private readonly loginErrorMessage = this.page.locator('.login-form p[style*="color: red"], .login-form p:has-text("incorrect")');
  private readonly signupErrorMessage = this.page.locator('.signup-form p[style*="color: red"], p:has-text("Email Address already exist")');
  private readonly generalErrorMessage = this.page.locator('p[style*="color: red"]').first();

  // Form sections
  private readonly loginFormSection = this.page.locator('.login-form');
  private readonly signupFormSection = this.page.locator('.signup-form');

  // Page elements
  private readonly loginPageHeading = this.page.locator('h2:has-text("Login to your account")');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/login');
    await this.waitForVisible(this.loginButton);
    pageLogger.info('E-Commerce Login page loaded');
  }

  // ─── Login Actions ───────────────────────────────────────────────────────────

  async enterLoginEmail(email: string): Promise<void> {
    await this.fill(this.loginEmailInput, email, 'Login Email');
  }

  async enterLoginPassword(password: string): Promise<void> {
    await this.fill(this.loginPasswordInput, password, 'Login Password');
  }

  async clickLoginButton(): Promise<void> {
    await this.click(this.loginButton, 'Login Button');
    pageLogger.info('Login button clicked');
  }

  /**
   * Complete login flow with email and password.
   */
  async login(email: string, password: string): Promise<void> {
    pageLogger.info(`Logging in with email: ${email}`);
    await this.enterLoginEmail(email);
    await this.enterLoginPassword(password);
    await this.clickLoginButton();
  }

  // ─── Signup Actions (Quick Signup) ──────────────────────────────────────────

  async enterSignupName(name: string): Promise<void> {
    await this.fill(this.signupNameInput, name, 'Signup Name');
  }

  async enterSignupEmail(email: string): Promise<void> {
    await this.fill(this.signupEmailInput, email, 'Signup Email');
  }

  async clickSignupButton(): Promise<void> {
    await this.click(this.signupButton, 'Signup Button');
    pageLogger.info('Signup button clicked');
  }

  /**
   * Quick signup flow - initiates user registration.
   */
  async quickSignup(name: string, email: string): Promise<void> {
    pageLogger.info(`Quick signup with email: ${email}`);
    await this.enterSignupName(name);
    await this.enterSignupEmail(email);
    await this.clickSignupButton();
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getLoginErrorMessage(): Promise<string> {
    await this.waitForVisible(this.loginErrorMessage, 5000);
    return this.getText(this.loginErrorMessage);
  }

  async getSignupErrorMessage(): Promise<string> {
    await this.waitForVisible(this.signupErrorMessage, 5000);
    return this.getText(this.signupErrorMessage);
  }

  async getGeneralErrorMessage(): Promise<string> {
    await this.waitForVisible(this.generalErrorMessage, 5000);
    return this.getText(this.generalErrorMessage);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnLoginPage(): Promise<void> {
    await this.assertVisible(this.loginButton, 'Login button should be visible');
    await this.assertVisible(this.loginEmailInput, 'Login email input should be visible');
    await this.assertUrl(/login/);
    pageLogger.info('Verified on login page');
  }

  async assertLoginFormDisplayed(): Promise<void> {
    await this.assertVisible(this.loginFormSection, 'Login form section should be visible');
    await this.assertVisible(this.loginEmailInput, 'Login email input should be visible');
    await this.assertVisible(this.loginPasswordInput, 'Login password input should be visible');
    await this.assertVisible(this.loginButton, 'Login button should be visible');
  }

  async assertSignupFormDisplayed(): Promise<void> {
    await this.assertVisible(this.signupFormSection, 'Signup form section should be visible');
    await this.assertVisible(this.signupNameInput, 'Signup name input should be visible');
    await this.assertVisible(this.signupEmailInput, 'Signup email input should be visible');
    await this.assertVisible(this.signupButton, 'Signup button should be visible');
  }

  async assertBothFormsDisplayed(): Promise<void> {
    await this.assertLoginFormDisplayed();
    await this.assertSignupFormDisplayed();
  }

  async assertLoginErrorMessageVisible(): Promise<void> {
    await this.assertVisible(this.loginErrorMessage, 'Login error message should be visible');
  }

  async assertSignupErrorMessageVisible(): Promise<void> {
    await this.assertVisible(this.signupErrorMessage, 'Signup error message should be visible');
  }

  async assertLoginFieldsRequired(): Promise<void> {
    // Clear fields and try to submit
    await this.fill(this.loginEmailInput, '', 'Clear Email');
    await this.fill(this.loginPasswordInput, '', 'Clear Password');
    await this.clickLoginButton();
    await this.assertLoginErrorMessageVisible();
  }

  async assertPageTitle(): Promise<void> {
    await this.assertTitle(/Automation Exercise/);
  }

  async assertLoginHeading(): Promise<void> {
    await this.assertVisible(this.loginPageHeading, 'Login heading should be visible');
  }
}
