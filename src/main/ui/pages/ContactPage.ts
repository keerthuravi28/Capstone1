import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

// ABOUTME: Page object for the Contact Us form on automationexercise.com.
// ABOUTME: Handles form entry, file upload, submission, and success verification.

export class ContactPage extends BasePage {

  private readonly getInTouchHeading = this.page.locator('h2:has-text("Get In Touch")');

  // form fields - all use data-qa attributes which is nice
  private readonly nameInput = this.page.locator('input[data-qa="name"]');
  private readonly emailInput = this.page.locator('input[data-qa="email"]');
  private readonly subjectInput = this.page.locator('input[data-qa="subject"]');
  private readonly messageArea = this.page.locator('textarea[data-qa="message"]');
  private readonly fileUpload = this.page.locator('input[name="upload_file"]');
  private readonly submitBtn = this.page.locator('input[data-qa="submit-button"]');

  // success state - shows after form submission + OK on the browser alert
  private readonly successMsg = this.page.locator('div.status.alert-success');

  // green "Home" button shown after successful submission (not the nav bar link)
  private readonly homeBtn = this.page.locator('.contact-form a.btn-success, a.btn.btn-success:has-text("Home")');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/contact_us');
    await this.getInTouchHeading.waitFor({ state: 'visible', timeout: 5000 });
    pageLogger.info('Contact Us page loaded');
  }

  async fillName(name: string): Promise<void> {
    await this.fill(this.nameInput, name, 'name');
  }

  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email, 'email');
  }

  async fillSubject(subject: string): Promise<void> {
    await this.fill(this.subjectInput, subject, 'subject');
  }

  async fillMessage(msg: string): Promise<void> {
    await this.fill(this.messageArea, msg, 'message');
  }

  async attachFile(filePath: string): Promise<void> {
    await this.fileUpload.setInputFiles(filePath);
    pageLogger.info(`Attached file: ${filePath}`);
  }

  async clickSubmit(): Promise<void> {
    await this.submitBtn.click();
    pageLogger.info('Clicked submit');
  }

  // the site triggers a browser confirm() dialog on submit - need to handle it
  async submitForm(): Promise<void> {
    // set up dialog handler BEFORE clicking submit
    this.page.once('dialog', async dialog => {
      pageLogger.info(`Dialog appeared: "${dialog.message()}"`);
      await dialog.accept();
    });
    await this.clickSubmit();
    // wait for success message to appear after dialog is accepted
    await this.page.waitForTimeout(500);
  }

  async fillAndSubmit(data: {
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
  }

  async clearAllFields(): Promise<void> {
    await this.nameInput.clear();
    await this.emailInput.clear();
    await this.subjectInput.clear();
    await this.messageArea.clear();
  }

  async clickHomeAfterSuccess(): Promise<void> {
    await this.click(this.homeBtn, 'Home button');
  }

  // getters for verifying form state
  async getNameValue(): Promise<string> { return this.nameInput.inputValue(); }
  async getEmailValue(): Promise<string> { return this.emailInput.inputValue(); }
  async getSubjectValue(): Promise<string> { return this.subjectInput.inputValue(); }
  async getMessageValue(): Promise<string> { return this.messageArea.inputValue(); }

  // assertions

  async assertOnContactPage(): Promise<void> {
    await this.assertUrl(/contact_us/);
    await this.assertVisible(this.getInTouchHeading, '"Get In Touch" heading');
  }

  async assertFormFieldsVisible(): Promise<void> {
    await this.assertVisible(this.nameInput, 'name field');
    await this.assertVisible(this.emailInput, 'email field');
    await this.assertVisible(this.subjectInput, 'subject field');
    await this.assertVisible(this.messageArea, 'message field');
    await this.assertVisible(this.submitBtn, 'submit button');
  }

  async assertSuccessMessageShown(): Promise<void> {
    await this.successMsg.waitFor({ state: 'visible', timeout: 5000 });
    const text = await this.successMsg.innerText();
    if (!text.toLowerCase().includes('success')) {
      throw new Error(`Expected success message, got: "${text}"`);
    }
    pageLogger.info('Success message verified');
  }

  async assertFormStillVisible(): Promise<void> {
    // if validation failed, form should still be on screen
    await this.assertVisible(this.nameInput, 'name field (form still showing)');
  }
}
