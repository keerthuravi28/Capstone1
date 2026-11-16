import { test, expect } from '@playwright/test';

/**
 * ABOUTME: Simple diagnostic test to verify the application loads correctly.
 * ABOUTME: Helps debug any startup issues with the e-commerce platform.
 */

test.describe('Diagnostic - Page Load Check', () => {
  test('E-Commerce home page loads', async ({ page }) => {
    console.log('Navigating to automationexercise.com');
    await page.goto('https://automationexercise.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/diagnostics/home-page.png' });

    // Verify page loaded
    expect(title).toBeTruthy();
  });

  test('Registration page loads', async ({ page }) => {
    console.log('Navigating to registration page');
    await page.goto('https://automationexercise.com/signup', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    console.log(`Registration page title: ${title}`);

    // Check if form exists
    const formExists = await page.locator('input[data-qa="first_name"], input[name="first_name"], input[placeholder*="First"]').count() > 0;
    console.log(`Registration form found: ${formExists}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/diagnostics/registration-page.png' });

    expect(formExists).toBeTruthy();
  });

  test('Login page loads', async ({ page }) => {
    console.log('Navigating to login page');
    await page.goto('https://automationexercise.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    console.log(`Login page title: ${title}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/diagnostics/login-page.png' });

    expect(title).toBeTruthy();
  });
});
