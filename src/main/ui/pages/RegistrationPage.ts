import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: RegistrationPage encapsulates all user registration interactions.
 * ABOUTME: Handles form filling, validation, and successful registration flow.
 */
export class RegistrationPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  // Registration form elements
  private readonly firstNameInput = this.page.locator('input[data-qa="first_name"]');
  private readonly lastNameInput = this.page.locator('input[data-qa="last_name"]');
  private readonly emailInput = this.page.locator('input[data-qa="email_address"]');
  private readonly passwordInput = this.page.locator('input[data-qa="password"]');
  private readonly confirmPasswordInput = this.page.locator('input[data-qa="confirm_password"]');

  // Address information
  private readonly companyInput = this.page.locator('input[data-qa="company"]');
  private readonly addressInput = this.page.locator('input[data-qa="address1"]');
  private readonly countryDropdown = this.page.locator('select[data-qa="country"]');
  private readonly stateInput = this.page.locator('input[data-qa="state"]');
  private readonly cityInput = this.page.locator('input[data-qa="city"]');
  private readonly zipcodeInput = this.page.locator('input[data-qa="zipcode"]');
  private readonly phoneInput = this.page.locator('input[data-qa="mobile_number"]');

  // Newsletter & terms
  private readonly newsletterCheckbox = this.page.locator('input#newsletter');
  private readonly termsCheckbox = this.page.locator('input#optin');

  // Submit button
  private readonly createAccountButton = this.page.locator('button[data-qa="create_account"]');

  // Success message
  private readonly successMessage = this.page.locator('h2:has-text("Account Created!")');
  private readonly accountCreatedButton = this.page.locator('a[data-qa="continue_button"]');

  // Error messages
  private readonly errorMessages = this.page.locator('[data-qa*="error"]');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/signup');
    await this.waitForVisible(this.firstNameInput);
    pageLogger.info('Registration page loaded');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async fillFirstName(firstName: string): Promise<void> {
    await this.fill(this.firstNameInput, firstName, 'First Name');
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.fill(this.lastNameInput, lastName, 'Last Name');
  }

  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email, 'Email');
  }

  async fillPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password, 'Password');
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.fill(this.confirmPasswordInput, password, 'Confirm Password');
  }

  async fillCompany(company: string): Promise<void> {
    await this.fill(this.companyInput, company, 'Company');
  }

  async fillAddress(address: string): Promise<void> {
    await this.fill(this.addressInput, address, 'Address');
  }

  async selectCountry(country: string): Promise<void> {
    await this.selectDropdown(this.countryDropdown, country, 'Country');
    pageLogger.info(`Selected country: ${country}`);
  }

  async fillState(state: string): Promise<void> {
    await this.fill(this.stateInput, state, 'State');
  }

  async fillCity(city: string): Promise<void> {
    await this.fill(this.cityInput, city, 'City');
  }

  async fillZipcode(zipcode: string): Promise<void> {
    await this.fill(this.zipcodeInput, zipcode, 'Zipcode');
  }

  async fillPhoneNumber(phone: string): Promise<void> {
    await this.fill(this.phoneInput, phone, 'Phone Number');
  }

  async checkNewsletterCheckbox(): Promise<void> {
    const isChecked = await this.newsletterCheckbox.isChecked();
    if (!isChecked) {
      await this.click(this.newsletterCheckbox, 'Newsletter Checkbox');
      pageLogger.info('Newsletter checkbox checked');
    }
  }

  async checkTermsCheckbox(): Promise<void> {
    const isChecked = await this.termsCheckbox.isChecked();
    if (!isChecked) {
      await this.click(this.termsCheckbox, 'Terms & Conditions Checkbox');
      pageLogger.info('Terms checkbox checked');
    }
  }

  async clickCreateAccountButton(): Promise<void> {
    await this.click(this.createAccountButton, 'Create Account Button');
  }

  async clickContinueAfterSuccess(): Promise<void> {
    await this.click(this.accountCreatedButton, 'Continue Button');
  }

  /**
   * Complete registration flow with mandatory fields.
   */
  async registerUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    company?: string;
    address?: string;
    country?: string;
    state?: string;
    city?: string;
    zipcode?: string;
    phone?: string;
    acceptNewsletter?: boolean;
    acceptTerms?: boolean;
  }): Promise<void> {
    pageLogger.info(`Registering user: ${userData.email}`);

    await this.fillFirstName(userData.firstName);
    await this.fillLastName(userData.lastName);
    await this.fillEmail(userData.email);
    await this.fillPassword(userData.password);

    if (userData.confirmPassword) {
      await this.fillConfirmPassword(userData.confirmPassword);
    } else {
      await this.fillConfirmPassword(userData.password);
    }

    // Optional fields
    if (userData.company) await this.fillCompany(userData.company);
    if (userData.address) await this.fillAddress(userData.address);
    if (userData.country) await this.selectCountry(userData.country);
    if (userData.state) await this.fillState(userData.state);
    if (userData.city) await this.fillCity(userData.city);
    if (userData.zipcode) await this.fillZipcode(userData.zipcode);
    if (userData.phone) await this.fillPhoneNumber(userData.phone);

    if (userData.acceptNewsletter) await this.checkNewsletterCheckbox();
    if (userData.acceptTerms) await this.checkTermsCheckbox();

    await this.clickCreateAccountButton();
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getErrorMessage(): Promise<string> {
    await this.waitForVisible(this.errorMessages, 5000);
    return this.getText(this.errorMessages);
  }

  async getAllErrorMessages(): Promise<string[]> {
    const errors = await this.errorMessages.all();
    const messages: string[] = [];
    for (const error of errors) {
      messages.push(await error.textContent() || '');
    }
    return messages.filter((msg) => msg.length > 0);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnRegistrationPage(): Promise<void> {
    await this.assertVisible(this.firstNameInput, 'First Name input should be visible');
    await this.assertVisible(this.createAccountButton, 'Create Account button should be visible');
    await this.assertUrl(/signup/);
  }

  async assertRegistrationFormDisplayed(): Promise<void> {
    await this.assertVisible(this.firstNameInput, 'First Name input should be visible');
    await this.assertVisible(this.lastNameInput, 'Last Name input should be visible');
    await this.assertVisible(this.emailInput, 'Email input should be visible');
    await this.assertVisible(this.passwordInput, 'Password input should be visible');
    await this.assertVisible(this.createAccountButton, 'Create Account button should be visible');
  }

  async assertSuccessMessage(): Promise<void> {
    await this.assertVisible(this.successMessage, 'Success message should be visible');
    await this.assertContainsText(this.successMessage, 'Account Created');
  }

  async assertFieldValidationError(fieldName: string, errorMessage: string): Promise<void> {
    const fieldError = this.page.locator(`[data-qa*="${fieldName}"][data-qa*="error"]`);
    await this.assertVisible(fieldError, `Error for ${fieldName} should be visible`);
    await this.assertContainsText(fieldError, errorMessage);
  }

  async assertPasswordMismatchError(): Promise<void> {
    await this.assertContainsText(this.errorMessages.first(), 'password');
  }

  async assertEmailAlreadyExistsError(): Promise<void> {
    await this.assertContainsText(this.errorMessages.first(), 'already exists');
  }
}
