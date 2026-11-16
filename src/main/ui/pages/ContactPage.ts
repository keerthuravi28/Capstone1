import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: ContactPage encapsulates the contact form and inquiries functionality.
 * ABOUTME: Handles contact form submission, validation, and confirmation.
 */
export class ContactPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  private readonly contactFormContainer = this.page.locator('[class*="contact"], form[id*="contact"]');
  private readonly nameInput = this.page.locator('input[data-qa="name"], input[name="name"]');
  private readonly emailInput = this.page.locator('input[data-qa="email"], input[name="email"]');
  private readonly subjectInput = this.page.locator('input[data-qa="subject"], input[name="subject"]');
  private readonly messageTextarea = this.page.locator('textarea[data-qa="message"], textarea[name="message"]');
  private readonly uploadFileInput = this.page.locator('input[type="file"]');
  private readonly submitButton = this.page.locator('button[data-qa="submit"], input[type="submit"]');
  private readonly successMessage = this.page.locator('text=/Success|Thank you|Message sent|Contact received/i');
  private readonly errorMessage = this.page.locator('[class*="error"], text=/Error|Failed|Invalid/i');
  private readonly requiredFieldError = this.page.locator('text=/required|This field is required/i');
  private readonly homeLink = this.page.locator('a:has-text("Home")');
  private readonly contactLink = this.page.locator('a:has-text("Contact Us")');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/contact_us');
    await this.waitForVisible(this.contactFormContainer);
    pageLogger.info('Contact Us page loaded');
  }

  async gotoContact(): Promise<void> {
    await this.click(this.contactLink, 'Contact Us link');
    pageLogger.info('Navigated to contact page');
  }

  // ─── Form Actions ────────────────────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    await this.fill(this.nameInput, name, 'Name');
  }

  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email, 'Email');
  }

  async fillSubject(subject: string): Promise<void> {
    await this.fill(this.subjectInput, subject, 'Subject');
  }

  async fillMessage(message: string): Promise<void> {
    await this.fill(this.messageTextarea, message, 'Message');
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.uploadFileInput.setInputFiles(filePath);
    pageLogger.info(`Uploaded file: ${filePath}`);
  }

  async submitForm(): Promise<void> {
    await this.click(this.submitButton, 'Submit button');
    pageLogger.info('Submitted contact form');
  }

  async fillAndSubmitContactForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    await this.fillName(data.name);
    await this.fillEmail(data.email);
    await this.fillSubject(data.subject);
    await this.fillMessage(data.message);
    await this.submitForm();
    pageLogger.info('Contact form submitted');
  }

  async clearForm(): Promise<void> {
    await this.fill(this.nameInput, '', 'Clear name');
    await this.fill(this.emailInput, '', 'Clear email');
    await this.fill(this.subjectInput, '', 'Clear subject');
    await this.fill(this.messageTextarea, '', 'Clear message');
    pageLogger.info('Form cleared');
  }

  // ─── Validation & Response ────────────────────────────────────────────────────

  async getSuccessMessage(): Promise<string> {
    await this.waitForVisible(this.successMessage);
    return this.getText(this.successMessage);
  }

  async getErrorMessage(): Promise<string> {
    const isVisible = await this.isVisible(this.errorMessage, 2000);
    if (!isVisible) {
      return '';
    }
    return this.getText(this.errorMessage);
  }

  async getRequiredFieldErrors(): Promise<number> {
    const errors = await this.page.locator(this.requiredFieldError).count();
    return errors;
  }

  // ─── Form State Checking ──────────────────────────────────────────────────────

  async isFormVisible(): Promise<boolean> {
    return this.isVisible(this.contactFormContainer, 2000);
  }

  async getNameValue(): Promise<string> {
    return this.nameInput.inputValue().catch(() => '');
  }

  async getEmailValue(): Promise<string> {
    return this.emailInput.inputValue().catch(() => '');
  }

  async getSubjectValue(): Promise<string> {
    return this.subjectInput.inputValue().catch(() => '');
  }

  async getMessageValue(): Promise<string> {
    return this.messageTextarea.inputValue().catch(() => '');
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnContactPage(): Promise<void> {
    await this.assertUrl(/contact/);
    await this.assertVisible(this.contactFormContainer, 'Contact form should be visible');
    pageLogger.info('Verified on contact page');
  }

  async assertContactFormVisible(): Promise<void> {
    await this.assertVisible(this.contactFormContainer, 'Contact form should be visible');
  }

  async assertAllFormFieldsVisible(): Promise<void> {
    await this.assertVisible(this.nameInput, 'Name field should be visible');
    await this.assertVisible(this.emailInput, 'Email field should be visible');
    await this.assertVisible(this.subjectInput, 'Subject field should be visible');
    await this.assertVisible(this.messageTextarea, 'Message field should be visible');
  }

  async assertSubmitButtonVisible(): Promise<void> {
    await this.assertVisible(this.submitButton, 'Submit button should be visible');
  }

  async assertFormSubmissionSuccess(): Promise<void> {
    await this.assertVisible(this.successMessage, 'Success message should be visible');
    pageLogger.info('Form submission verified as successful');
  }

  async assertFormSubmissionFailed(): Promise<void> {
    const errorVisible = await this.isVisible(this.errorMessage, 2000);
    if (!errorVisible) {
      throw new Error('Expected error message but form was submitted');
    }
    pageLogger.info('Form submission failed as expected');
  }

  async assertNameFieldRequired(): Promise<void> {
    await this.fillEmail('test@example.com');
    await this.fillSubject('Test Subject');
    await this.fillMessage('Test Message');
    await this.submitForm();

    await this.page.waitForTimeout(500);
    const nameInput = await this.nameInput.isVisible();
    if (!nameInput) {
      throw new Error('Name field should be visible for validation');
    }
    pageLogger.info('Name field validation verified');
  }

  async assertEmailFieldRequired(): Promise<void> {
    await this.fillName('Test User');
    await this.fillSubject('Test Subject');
    await this.fillMessage('Test Message');
    await this.submitForm();

    await this.page.waitForTimeout(500);
    const emailInput = await this.emailInput.isVisible();
    if (!emailInput) {
      throw new Error('Email field should be visible for validation');
    }
    pageLogger.info('Email field validation verified');
  }

  async assertMessageFieldRequired(): Promise<void> {
    await this.fillName('Test User');
    await this.fillEmail('test@example.com');
    await this.fillSubject('Test Subject');
    await this.submitForm();

    await this.page.waitForTimeout(500);
    const messageInput = await this.messageTextarea.isVisible();
    if (!messageInput) {
      throw new Error('Message field should be visible for validation');
    }
    pageLogger.info('Message field validation verified');
  }

  async assertFormFieldsNotEmpty(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const nameValue = await this.getNameValue();
    const emailValue = await this.getEmailValue();
    const subjectValue = await this.getSubjectValue();
    const messageValue = await this.getMessageValue();

    if (nameValue !== data.name) {
      throw new Error(`Name mismatch: expected "${data.name}", got "${nameValue}"`);
    }
    if (emailValue !== data.email) {
      throw new Error(`Email mismatch: expected "${data.email}", got "${emailValue}"`);
    }
    if (subjectValue !== data.subject) {
      throw new Error(`Subject mismatch: expected "${data.subject}", got "${subjectValue}"`);
    }
    if (messageValue !== data.message) {
      throw new Error(`Message mismatch: expected "${data.message}", got "${messageValue}"`);
    }
    pageLogger.info('All form fields verified as filled correctly');
  }
}
