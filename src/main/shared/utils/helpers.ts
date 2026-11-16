import { Page, test } from '@playwright/test';

// ─── Wait Helpers ─────────────────────────────────────────────────────────────

/**
 * Pause execution for a given number of milliseconds.
 * Use sparingly — prefer Playwright's built-in auto-waiting.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until a condition function returns true, polling every interval ms.
 */
export async function waitUntil(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 10000, interval = 500, message = 'Condition not met' } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await sleep(interval);
  }

  throw new Error(`Timeout after ${timeout}ms: ${message}`);
}

// ─── Random Data Generators ───────────────────────────────────────────────────

/**
 * Generate a random string of given length using alphanumeric characters.
 */
export function randomString(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a unique employee username for OrangeHRM.
 * e.g. "emp_aB3xYz9k"
 */
export function generateUsername(prefix = 'emp'): string {
  return `${prefix}_${randomString(8)}`;
}

/**
 * Generate a unique email address.
 */
export function generateEmail(domain = 'test.com'): string {
  return `user_${randomString(6).toLowerCase()}@${domain}`;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Format a Date object to 'YYYY-MM-DD'.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Return today's date as 'YYYY-MM-DD'.
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * Add/subtract days from a date. Returns 'YYYY-MM-DD'.
 */
export function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDate(result);
}

// ─── Page Helpers ─────────────────────────────────────────────────────────────

/**
 * Take a screenshot, save it to disk, and attach it to the test report.
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<Buffer> {
  const buffer = await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
  try {
    await test.info().attach(name, { body: buffer, contentType: 'image/png' });
  } catch {
    // Not running inside a Playwright test context (e.g. unit context) — ignore.
  }
  return buffer;
}

/**
 * Scroll to the bottom of the page gradually.
 */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Clear browser cookies and local storage.
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
}

// ─── String Helpers ───────────────────────────────────────────────────────────

/**
 * Capitalise first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trim and normalise whitespace in a string.
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}
