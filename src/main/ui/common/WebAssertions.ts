import { Locator, expect } from '@playwright/test';
import { WebActions } from './WebActions';

/** Options accepted by the visual-comparison assertions below. */
export interface VisualAssertionOptions {
  /** Elements to mask out of the comparison (dynamic content: clocks, avatars, live counters). */
  mask?: Locator[];
  /** Override the global maxDiffPixelRatio (playwright.config.ts → expect.toHaveScreenshot) for this one comparison. */
  maxDiffPixelRatio?: number;
  /** Override the global pixel-color-difference threshold for this one comparison. */
  threshold?: number;
  /** Freeze CSS animations/transitions before capturing. Defaults to the global config ('disabled'). */
  animations?: 'disabled' | 'allow';
  /** Capture the full scrollable page instead of just the viewport. Page-level only — defaults to true. */
  fullPage?: boolean;
}

/**
 * WebAssertions
 * ──────────────
 * Generic, application-agnostic verification layer.
 * Extends WebActions so page objects inherit both interactions and
 * assertions through a single base — see the layering note in WebActions.
 *
 * All methods use Playwright's web-first `expect` (auto-retrying).
 */
export class WebAssertions extends WebActions {

  // ─── Visibility ──────────────────────────────────────────────────────────────

  async assertVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible();
  }

  async assertHidden(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeHidden();
  }

  /** Element exists in the DOM (visible or not). */
  async assertAttached(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeAttached();
  }

  /** Element is within the visible viewport (scrolled into view). */
  async assertInViewport(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeInViewport();
  }

  // ─── Text / Value ────────────────────────────────────────────────────────────

  async assertText(locator: Locator, expectedText: string | RegExp): Promise<void> {
    await expect(locator).toHaveText(expectedText);
  }

  async assertContainsText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text);
  }

  async assertNotContainsText(locator: Locator, text: string): Promise<void> {
    await expect(locator).not.toContainText(text);
  }

  async assertValue(locator: Locator, expectedValue: string | RegExp): Promise<void> {
    await expect(locator).toHaveValue(expectedValue);
  }

  /** Element has no text content and no child elements. */
  async assertEmpty(locator: Locator): Promise<void> {
    await expect(locator).toBeEmpty();
  }

  async assertNotEmpty(locator: Locator): Promise<void> {
    await expect(locator).not.toBeEmpty();
  }

  async assertAttribute(locator: Locator, name: string, value: string | RegExp): Promise<void> {
    await expect(locator).toHaveAttribute(name, value);
  }

  async assertCssValue(locator: Locator, property: string, value: string | RegExp): Promise<void> {
    await expect(locator).toHaveCSS(property, value);
  }

  /** Full class attribute matches exactly (string) or by pattern (RegExp). */
  async assertClass(locator: Locator, expected: string | RegExp): Promise<void> {
    await expect(locator).toHaveClass(expected);
  }

  /** Element's class list contains the given class name(s). */
  async assertContainsClass(locator: Locator, className: string | string[]): Promise<void> {
    await expect(locator).toContainClass(className);
  }

  async assertId(locator: Locator, id: string | RegExp): Promise<void> {
    await expect(locator).toHaveId(id);
  }

  async assertJsProperty(locator: Locator, name: string, value: unknown): Promise<void> {
    await expect(locator).toHaveJSProperty(name, value);
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  async assertEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
  }

  async assertDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled();
  }

  async assertChecked(locator: Locator): Promise<void> {
    await expect(locator).toBeChecked();
  }

  async assertUnchecked(locator: Locator): Promise<void> {
    await expect(locator).not.toBeChecked();
  }

  async assertFocused(locator: Locator): Promise<void> {
    await expect(locator).toBeFocused();
  }

  async assertEditable(locator: Locator): Promise<void> {
    await expect(locator).toBeEditable();
  }

  // ─── Count ───────────────────────────────────────────────────────────────────

  async assertCount(locator: Locator, expectedCount: number): Promise<void> {
    await expect(locator).toHaveCount(expectedCount);
  }

  /** Auto-retrying: waits until the locator matches more than `minCount` elements. */
  async assertCountGreaterThan(locator: Locator, minCount: number): Promise<void> {
    await expect
      .poll(() => locator.count(), {
        message: `Expected more than ${minCount} elements for ${locator.toString()}`,
      })
      .toBeGreaterThan(minCount);
  }

  /** Auto-retrying: waits until the locator matches at least `minCount` elements. */
  async assertCountAtLeast(locator: Locator, minCount: number): Promise<void> {
    await expect
      .poll(() => locator.count(), {
        message: `Expected at least ${minCount} elements for ${locator.toString()}`,
      })
      .toBeGreaterThanOrEqual(minCount);
  }

  // ─── Page-Level ──────────────────────────────────────────────────────────────

  async assertUrl(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expected);
  }

  async assertUrlNot(expected: string | RegExp): Promise<void> {
    await expect(this.page).not.toHaveURL(expected);
  }

  async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  // ─── Soft Assertions ─────────────────────────────────────────────────────────
  // Record the failure but let the test continue; the test is still marked
  // failed at the end. Useful for checking several independent UI elements.

  async softAssertVisible(locator: Locator, message?: string): Promise<void> {
    await expect.soft(locator, message).toBeVisible();
  }

  async softAssertText(locator: Locator, expectedText: string | RegExp): Promise<void> {
    await expect.soft(locator).toHaveText(expectedText);
  }

  async softAssertContainsText(locator: Locator, text: string): Promise<void> {
    await expect.soft(locator).toContainText(text);
  }

  // ─── Visual Assertions ───────────────────────────────────────────────────────
  // Compare against a stored baseline snapshot; run with --update-snapshots
  // once to create/refresh baselines. Only usable inside a running test.
  // Global comparison tolerances live in playwright.config.ts → expect.toHaveScreenshot;
  // pass `options` to override them for one specific comparison.

  /**
   * Compare a single element against its stored baseline.
   * Use `options.mask` to hide dynamic sub-regions (timestamps, live counters,
   * avatars) so they don't cause false-positive diffs.
   */
  async assertScreenshotMatches(
    locator: Locator,
    name?: string,
    options: VisualAssertionOptions = {}
  ): Promise<void> {
    await (name
      ? expect(locator).toHaveScreenshot(name, options)
      : expect(locator).toHaveScreenshot(options));
  }

  /**
   * Compare the full page (or viewport, via `options.fullPage: false`) against
   * its stored baseline. Use `options.mask` to hide dynamic regions.
   */
  async assertPageScreenshotMatches(
    name?: string,
    options: VisualAssertionOptions = {}
  ): Promise<void> {
    const opts = { fullPage: true, ...options };
    await (name
      ? expect(this.page).toHaveScreenshot(name, opts)
      : expect(this.page).toHaveScreenshot(opts));
  }

  // ─── Toast / Notification ────────────────────────────────────────────────────

  /**
   * Assert a toast/notification banner is visible and contains `expected`.
   * `toastSelector` defaults to common patterns (OXD toast, ARIA alert/status
   * roles) — override it for other component libraries.
   */
  async assertToastMessage(
    expected: string | RegExp,
    toastSelector = '.oxd-toast-content, [role="alert"], [role="status"]'
  ): Promise<void> {
    const toast = this.page.locator(toastSelector).first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(expected);
  }
}
