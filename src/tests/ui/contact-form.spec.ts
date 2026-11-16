import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import * as path from 'path';

// ABOUTME: Contact Us form validation tests for automationexercise.com.
// ABOUTME: Covers Requirement #5 - Contact form display, validation, and submission.

test.describe('Contact Us Form', () => {

  test.beforeEach(async ({ contactPage }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Contact Us',
      owner: 'QA Team',
      layer: 'ui',
    });
    stepLogger.info(`Starting: ${testInfo.title}`);
    await contactPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(page, `FAIL-contact-${testInfo.title.replace(/\W+/g, '-')}`);
    }
  });

  // --- Form display ---

  test('contact form displays all fields and submit button', { tag: '@smoke' }, async ({ contactPage }) => {
    await annotate({ story: 'Form display', severity: Severity.BLOCKER });

    await contactPage.assertOnContactPage();
    await contactPage.assertFormFieldsVisible();
    stepLogger.info('All contact form fields present');
  });

  // --- Successful submission ---

  test('submit contact form with all valid fields', { tag: ['@smoke', '@critical'] }, async ({ contactPage }) => {
    await annotate({ story: 'Valid submission', severity: Severity.BLOCKER });

    await contactPage.fillAndSubmit({
      name: 'John Doe',
      email: 'john.doe@example.com',
      subject: 'Product Inquiry',
      message: 'I would like to know more about your return policy.',
    });

    await contactPage.assertSuccessMessageShown();
    stepLogger.info('Contact form submitted successfully');
  });

  test('submit form with special characters in name', { tag: '@regression' }, async ({ contactPage }) => {
    await annotate({ story: 'Special chars', severity: Severity.NORMAL });

    await contactPage.fillAndSubmit({
      name: "O'Brien-Smith",
      email: 'obrien@test.com',
      subject: 'Name test',
      message: 'Testing special characters in name field.',
    });

    await contactPage.assertSuccessMessageShown();
  });

  test('submit form with long message text', { tag: '@regression' }, async ({ contactPage }) => {
    await annotate({ story: 'Long content', severity: Severity.MINOR });

    const longMsg = 'This is a detailed inquiry. '.repeat(20).trim();

    await contactPage.fillAndSubmit({
      name: 'Test User',
      email: 'longmsg@test.com',
      subject: 'Long message',
      message: longMsg,
    });

    await contactPage.assertSuccessMessageShown();
    stepLogger.info(`Submitted message of ${longMsg.length} chars`);
  });

  // --- Validation: required fields ---

  test('form stays open when submitted with empty name', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Name required', severity: Severity.NORMAL });

    await contactPage.fillEmail('test@example.com');
    await contactPage.fillSubject('Subject');
    await contactPage.fillMessage('Some message');
    await contactPage.clickSubmit();

    // browser-native validation should block submission - form stays visible
    await contactPage.assertFormStillVisible();
    // URL shouldn't change
    expect(page.url()).toContain('contact_us');
  });

  test('form stays open when submitted with empty email', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Email required', severity: Severity.NORMAL });

    await contactPage.fillName('Test User');
    await contactPage.fillSubject('Subject');
    await contactPage.fillMessage('Some message');
    await contactPage.clickSubmit();

    await contactPage.assertFormStillVisible();
    expect(page.url()).toContain('contact_us');
  });

  test('form rejects invalid email format', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Email validation', severity: Severity.NORMAL });

    await contactPage.fillName('Test User');
    await contactPage.fillEmail('not-an-email');
    await contactPage.fillSubject('Test');
    await contactPage.fillMessage('Test message');
    await contactPage.clickSubmit();

    // browser validation should catch this - still on contact page
    await contactPage.assertFormStillVisible();
    expect(page.url()).toContain('contact_us');
  });

  test('form stays open when submitted with empty message', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Message required', severity: Severity.NORMAL });

    await contactPage.fillName('Test User');
    await contactPage.fillEmail('test@example.com');
    await contactPage.fillSubject('Subject');
    // leave message empty
    await contactPage.clickSubmit();

    await contactPage.assertFormStillVisible();
  });

  // --- Edge cases ---

  test('clear form resets all fields to empty', { tag: '@regression' }, async ({ contactPage }) => {
    await annotate({ story: 'Form reset', severity: Severity.MINOR });

    await contactPage.fillName('To Be Cleared');
    await contactPage.fillEmail('clear@test.com');
    await contactPage.fillSubject('Clear subject');
    await contactPage.fillMessage('Clear message');

    await contactPage.clearAllFields();

    expect(await contactPage.getNameValue()).toBe('');
    expect(await contactPage.getEmailValue()).toBe('');
    expect(await contactPage.getSubjectValue()).toBe('');
    expect(await contactPage.getMessageValue()).toBe('');
    stepLogger.info('All fields cleared successfully');
  });

  test('form handles whitespace-only inputs', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Whitespace edge case', severity: Severity.MINOR });

    await contactPage.fillName('   ');
    await contactPage.fillEmail('test@example.com');
    await contactPage.fillSubject('   ');
    await contactPage.fillMessage('   ');
    await contactPage.clickSubmit();

    // site might accept whitespace-only fields - document actual behavior
    const url = page.url();
    stepLogger.info(`After whitespace submission, URL: ${url}`);
    // we just care it doesn't crash
  });

  test('navigate home after successful submission', { tag: '@regression' }, async ({
    page, contactPage,
  }) => {
    await annotate({ story: 'Post-submit navigation', severity: Severity.MINOR });

    await contactPage.fillAndSubmit({
      name: 'Nav Test',
      email: 'nav@test.com',
      subject: 'Nav test',
      message: 'Testing navigation after submit',
    });

    await contactPage.assertSuccessMessageShown();
    await contactPage.clickHomeAfterSuccess();

    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toMatch(/automationexercise\.com\/?$/);
    stepLogger.info('Navigated home after contact submission');
  });
});
