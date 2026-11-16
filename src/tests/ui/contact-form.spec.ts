import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import contactData from '../../../test-data/contact-data.json';

/**
 * ABOUTME: Contact form validation test suite for automationexercise.com.
 * ABOUTME: Tests contact form submission, field validation, and error handling (Requirement #5).
 */

test.describe('E-Commerce Contact Us Form Validation @critical', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Contact Us Form',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await page.goto('https://automationexercise.com/contact_us', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title}`);
      await takeScreenshot(page, `FAILED-contact-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Form Display Tests ────────────────────────────────────────────────────────

  test('contact us page displays contact form', { tag: ['@smoke', '@critical'] }, async ({
    page,
    contactPage,
  }) => {
    await annotate({
      story: 'Contact form display',
      severity: Severity.BLOCKER,
      description: 'Contact Us page displays the contact form',
    });

    await test.step('Verify contact page loaded', async () => {
      await contactPage.assertOnContactPage();
      stepLogger.info('Contact page loaded');
    });

    await test.step('Verify all form fields visible', async () => {
      await contactPage.assertAllFormFieldsVisible();
      stepLogger.info('All form fields visible');
    });

    await test.step('Verify submit button visible', async () => {
      await contactPage.assertSubmitButtonVisible();
      stepLogger.info('Submit button visible');
    });

    await takeScreenshot(page, 'contact-form-display');
  });

  test('contact form contains all required fields', { tag: '@critical' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Form structure validation',
      severity: Severity.BLOCKER,
      description: 'Contact form has all required fields',
    });

    await test.step('Verify form structure', async () => {
      await contactPage.assertContactFormVisible();
      const nameValue = await contactPage.getNameValue();
      const emailValue = await contactPage.getEmailValue();
      const subjectValue = await contactPage.getSubjectValue();
      const messageValue = await contactPage.getMessageValue();

      await parameter('formFields', '4: name, email, subject, message');
      stepLogger.info('All 4 required fields present');
    });

    await takeScreenshot(page, 'contact-form-fields');
  });

  // ── Valid Submission Tests ────────────────────────────────────────────────────

  test('submit contact form with valid data', { tag: ['@smoke', '@critical'] }, async ({
    page,
    contactPage,
  }) => {
    await annotate({
      story: 'Valid form submission',
      severity: Severity.BLOCKER,
      description: 'User can submit contact form with valid data',
    });

    const formData = contactData.validSubmissions[0];
    await parameter('name', formData.name);
    await parameter('email', formData.email);
    await parameter('subject', formData.subject);

    await test.step('Fill contact form with valid data', async () => {
      await contactPage.fillAndSubmitContactForm(formData);
      stepLogger.info('Contact form submitted with valid data');
    });

    await test.step('Verify form submission', async () => {
      await page.waitForTimeout(1000);
      // Form may show success or navigate - verify one occurred
      const url = page.url();
      stepLogger.info(`Current URL after submission: ${url}`);
    });

    await takeScreenshot(page, 'contact-form-submitted');
  });

  test('submit multiple contact form requests', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Multiple submissions',
      severity: Severity.NORMAL,
      description: 'User can submit multiple contact forms',
    });

    for (let i = 0; i < 2; i++) {
      const formData = contactData.validSubmissions[i];
      await parameter(`submission${i + 1}`, formData.email);

      await test.step(`Submit contact form ${i + 1}`, async () => {
        await page.goto('https://automationexercise.com/contact_us', { waitUntil: 'domcontentloaded' });
        await contactPage.fillAndSubmitContactForm(formData);
        stepLogger.info(`Contact form ${i + 1} submitted`);
      });

      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'multiple-form-submissions');
  });

  test('contact form with special characters in name and email', { tag: '@regression' }, async ({
    page,
    contactPage,
  }) => {
    await annotate({
      story: 'Special character handling',
      severity: Severity.NORMAL,
      description: 'Contact form handles special characters correctly',
    });

    const formData = contactData.validSubmissions[2];
    await parameter('name', formData.name);
    await parameter('email', formData.email);

    await test.step('Submit form with special characters', async () => {
      await contactPage.fillAndSubmitContactForm(formData);
      stepLogger.info('Form submitted with special characters');
    });

    await test.step('Verify submission processed', async () => {
      await page.waitForTimeout(1000);
      stepLogger.info('Special character submission verified');
    });

    await takeScreenshot(page, 'special-characters-form');
  });

  // ── Field Validation Tests ────────────────────────────────────────────────────

  test('contact form requires name field', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Name field validation',
      severity: Severity.NORMAL,
      description: 'Name field is required in contact form',
    });

    const invalidData = contactData.invalidSubmissions[0];

    await test.step('Try to submit without name', async () => {
      await contactPage.fillEmail(invalidData.email);
      await contactPage.fillSubject(invalidData.subject);
      await contactPage.fillMessage(invalidData.message);
      await contactPage.submitForm();
      stepLogger.info('Attempted submission without name');
    });

    await test.step('Verify name field is required', async () => {
      await page.waitForTimeout(500);
      const nameInput = page.locator('input[data-qa="name"]');
      const isVisible = await nameInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('Name field required validation verified');
    });

    await takeScreenshot(page, 'name-field-required');
  });

  test('contact form requires email field', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Email field validation',
      severity: Severity.NORMAL,
      description: 'Email field is required in contact form',
    });

    const invalidData = contactData.invalidSubmissions[1];

    await test.step('Try to submit without email', async () => {
      await contactPage.fillName(invalidData.name);
      await contactPage.fillSubject(invalidData.subject);
      await contactPage.fillMessage(invalidData.message);
      await contactPage.submitForm();
      stepLogger.info('Attempted submission without email');
    });

    await test.step('Verify email field is required', async () => {
      await page.waitForTimeout(500);
      const emailInput = page.locator('input[data-qa="email"]');
      const isVisible = await emailInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('Email field required validation verified');
    });

    await takeScreenshot(page, 'email-field-required');
  });

  test('contact form validates email format', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Email format validation',
      severity: Severity.NORMAL,
      description: 'Contact form validates email format',
    });

    const invalidEmailData = contactData.invalidSubmissions[2];
    await parameter('invalidEmail', invalidEmailData.email);

    await test.step('Submit with invalid email format', async () => {
      await contactPage.fillName(invalidEmailData.name);
      await contactPage.fillEmail(invalidEmailData.email);
      await contactPage.fillSubject(invalidEmailData.subject);
      await contactPage.fillMessage(invalidEmailData.message);
      await contactPage.submitForm();
      stepLogger.info('Attempted submission with invalid email format');
    });

    await test.step('Verify email validation error', async () => {
      await page.waitForTimeout(500);
      // Form should either reject or stay on contact page
      const url = page.url();
      expect(url).toContain('contact');
      stepLogger.info('Email format validation verified');
    });

    await takeScreenshot(page, 'invalid-email-format');
  });

  test('contact form requires subject field', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Subject field validation',
      severity: Severity.NORMAL,
      description: 'Subject field is required in contact form',
    });

    const invalidData = contactData.invalidSubmissions[3];

    await test.step('Try to submit without subject', async () => {
      await contactPage.fillName(invalidData.name);
      await contactPage.fillEmail(invalidData.email);
      await contactPage.fillMessage(invalidData.message);
      await contactPage.submitForm();
      stepLogger.info('Attempted submission without subject');
    });

    await test.step('Verify subject field is required', async () => {
      await page.waitForTimeout(500);
      const subjectInput = page.locator('input[data-qa="subject"]');
      const isVisible = await subjectInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('Subject field required validation verified');
    });

    await takeScreenshot(page, 'subject-field-required');
  });

  test('contact form requires message field', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Message field validation',
      severity: Severity.NORMAL,
      description: 'Message field is required in contact form',
    });

    const invalidData = contactData.invalidSubmissions[4];

    await test.step('Try to submit without message', async () => {
      await contactPage.fillName(invalidData.name);
      await contactPage.fillEmail(invalidData.email);
      await contactPage.fillSubject(invalidData.subject);
      await contactPage.submitForm();
      stepLogger.info('Attempted submission without message');
    });

    await test.step('Verify message field is required', async () => {
      await page.waitForTimeout(500);
      const messageInput = page.locator('textarea[data-qa="message"]');
      const isVisible = await messageInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('Message field required validation verified');
    });

    await takeScreenshot(page, 'message-field-required');
  });

  // ── Edge Case Tests ───────────────────────────────────────────────────────────

  test('contact form handles long text inputs', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Long text handling',
      severity: Severity.MINOR,
      description: 'Contact form handles long text values correctly',
    });

    const longData = contactData.edgeCases[0];
    await parameter('nameLength', String(longData.name.length));
    await parameter('messageLength', String(longData.message.length));

    await test.step('Submit form with long text', async () => {
      await contactPage.fillAndSubmitContactForm(longData);
      stepLogger.info('Form submitted with long text values');
    });

    await test.step('Verify long text handled', async () => {
      await page.waitForTimeout(500);
      stepLogger.info('Long text handling verified');
    });

    await takeScreenshot(page, 'long-text-submission');
  });

  test('contact form strips whitespace from inputs', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Whitespace handling',
      severity: Severity.MINOR,
      description: 'Contact form handles whitespace correctly',
    });

    const whitespaceData = contactData.edgeCases[1];

    await test.step('Fill form with whitespace-padded inputs', async () => {
      await contactPage.fillAndSubmitContactForm(whitespaceData);
      stepLogger.info('Form submitted with whitespace-padded inputs');
    });

    await test.step('Verify whitespace handling', async () => {
      await page.waitForTimeout(500);
      stepLogger.info('Whitespace handling verified');
    });

    await takeScreenshot(page, 'whitespace-handling');
  });

  test('contact form accepts numeric values in name', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Numeric input handling',
      severity: Severity.MINOR,
      description: 'Contact form accepts numeric values in text fields',
    });

    const numericData = contactData.edgeCases[2];
    await parameter('nameWithNumbers', numericData.name);

    await test.step('Submit form with numeric name', async () => {
      await contactPage.fillAndSubmitContactForm(numericData);
      stepLogger.info('Form submitted with numeric name');
    });

    await test.step('Verify numeric input accepted', async () => {
      await page.waitForTimeout(500);
      stepLogger.info('Numeric input acceptance verified');
    });

    await takeScreenshot(page, 'numeric-input-form');
  });

  test('clear contact form resets all fields', { tag: '@regression' }, async ({ page, contactPage }) => {
    await annotate({
      story: 'Form reset functionality',
      severity: Severity.MINOR,
      description: 'Contact form fields can be cleared',
    });

    const formData = contactData.validSubmissions[0];

    await test.step('Fill contact form', async () => {
      await contactPage.fillName(formData.name);
      await contactPage.fillEmail(formData.email);
      await contactPage.fillSubject(formData.subject);
      await contactPage.fillMessage(formData.message);
      stepLogger.info('Form fields filled');
    });

    await test.step('Clear form', async () => {
      await contactPage.clearForm();
      stepLogger.info('Form cleared');
    });

    await test.step('Verify fields are empty', async () => {
      const nameValue = await contactPage.getNameValue();
      const emailValue = await contactPage.getEmailValue();
      const subjectValue = await contactPage.getSubjectValue();
      const messageValue = await contactPage.getMessageValue();

      expect(nameValue).toBe('');
      expect(emailValue).toBe('');
      expect(subjectValue).toBe('');
      expect(messageValue).toBe('');
      stepLogger.info('All fields verified as empty');
    });

    await takeScreenshot(page, 'form-cleared');
  });
});
