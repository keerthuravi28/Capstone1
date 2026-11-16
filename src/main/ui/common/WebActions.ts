import { Page, Locator, FrameLocator, BrowserContext, Cookie } from '@playwright/test';
import { ENV } from '../../shared/config/env.config';
import { pageLogger } from '../../shared/utils/logger';
import { takeScreenshot } from '../../shared/utils/helpers';

/**
 * WebActions
 * ───────────
 * Generic, application-agnostic UI interaction library.
 * Contains every reusable browser/element action — no application selectors,
 * no application URLs. This file is portable: it can be dropped into any
 * project together with logger.ts and env.config.ts.
 *
 * Layering:
 *   WebActions (interactions/waits/getters)
 *     └── WebAssertions (verifications)
 *           └── BasePage (application-facing base for page objects)
 */
export class WebActions {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Page-Level ──────────────────────────────────────────────────────────────

  getCurrentUrl(): string {
    return this.page.url();
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForDomLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async reload(): Promise<void> {
    pageLogger.debug('Reloading page');
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  async goForward(): Promise<void> {
    await this.page.goForward({ waitUntil: 'domcontentloaded' });
  }

  // ─── Click Actions ───────────────────────────────────────────────────────────

  async click(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Click: ${description || locator.toString()}`);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async doubleClick(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Double click: ${description || locator.toString()}`);
    await locator.waitFor({ state: 'visible' });
    await locator.dblclick();
  }

  async rightClick(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Right click: ${description || locator.toString()}`);
    await locator.waitFor({ state: 'visible' });
    await locator.click({ button: 'right' });
  }

  /**
   * Force click — bypasses actionability checks.
   * Use only when an overlay legitimately intercepts pointer events.
   */
  async forceClick(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Force click: ${description || locator.toString()}`);
    await locator.click({ force: true });
  }

  /**
   * Click via JavaScript — last resort for elements Playwright cannot
   * interact with natively (e.g. obscured by CSS quirks).
   */
  async jsClick(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`JS click: ${description || locator.toString()}`);
    await locator.evaluate((el) => (el as HTMLElement).click());
  }

  /**
   * Click while holding a modifier key (e.g. Ctrl+click for multi-select).
   */
  async clickWithModifier(
    locator: Locator,
    modifier: 'Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift',
    description = ''
  ): Promise<void> {
    pageLogger.debug(`${modifier}+Click: ${description || locator.toString()}`);
    await locator.waitFor({ state: 'visible' });
    await locator.click({ modifiers: [modifier] });
  }

  /**
   * Tap an element — mobile/touch emulation only (context needs hasTouch: true).
   */
  async tap(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Tap: ${description || locator.toString()}`);
    await locator.waitFor({ state: 'visible' });
    await locator.tap();
  }

  // ─── Input Actions ───────────────────────────────────────────────────────────

  async fill(locator: Locator, value: string, description = ''): Promise<void> {
    pageLogger.debug(`Fill "${description || locator.toString()}" → "${value}"`);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(value);
  }

  async clearAndFill(locator: Locator, value: string): Promise<void> {
    await this.fill(locator, value);
  }

  async clear(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
  }

  /**
   * Type text character by character (useful for autocomplete inputs).
   */
  async typeSlowly(locator: Locator, text: string, delayMs = 80): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.pressSequentially(text, { delay: delayMs });
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /** Press a key on a specific element (e.g. Enter inside an input). */
  async pressKeyOn(locator: Locator, key: string): Promise<void> {
    await locator.press(key);
  }

  /** Hold a key down (pair with keyUp — e.g. Shift while clicking a range). */
  async keyDown(key: string): Promise<void> {
    await this.page.keyboard.down(key);
  }

  /** Release a key previously held with keyDown. */
  async keyUp(key: string): Promise<void> {
    await this.page.keyboard.up(key);
  }

  async focus(locator: Locator): Promise<void> {
    await locator.focus();
  }

  async blur(locator: Locator): Promise<void> {
    await locator.blur();
  }

  // ─── Checkbox / Radio ────────────────────────────────────────────────────────

  async check(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Check: ${description || locator.toString()}`);
    await locator.check();
  }

  async uncheck(locator: Locator, description = ''): Promise<void> {
    pageLogger.debug(`Uncheck: ${description || locator.toString()}`);
    await locator.uncheck();
  }

  async setChecked(locator: Locator, checked: boolean): Promise<void> {
    await locator.setChecked(checked);
  }

  async isChecked(locator: Locator): Promise<boolean> {
    return locator.isChecked();
  }

  // ─── Dropdowns (native <select>) ─────────────────────────────────────────────

  async selectByValue(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption({ value });
  }

  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption({ label });
  }

  async selectByIndex(locator: Locator, index: number): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption({ index });
  }

  /** Back-compat alias: select by value string. */
  async selectOption(locator: Locator, value: string): Promise<void> {
    await this.selectByValue(locator, value);
  }

  /** Select multiple options of a <select multiple> by their value attributes. */
  async selectMultipleByValue(locator: Locator, values: string[]): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption(values.map((value) => ({ value })));
  }

  async getSelectedOptionLabel(locator: Locator): Promise<string> {
    return locator.evaluate(
      (el) => (el as HTMLSelectElement).selectedOptions[0]?.label ?? ''
    );
  }

  /**
   * Select dropdown option — alias for selectByLabel for convenience.
   */
  async selectDropdown(locator: Locator, value: string, description = ''): Promise<void> {
    pageLogger.debug(`Select dropdown: ${description || locator.toString()} → "${value}"`);
    await this.selectByLabel(locator, value);
  }

  // ─── Mouse / Movement ────────────────────────────────────────────────────────

  async hover(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.hover();
  }

  async dragAndDrop(source: Locator, target: Locator): Promise<void> {
    pageLogger.debug(`Drag ${source.toString()} → ${target.toString()}`);
    await source.dragTo(target);
  }

  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  /** Scroll with the mouse wheel (works inside custom scroll containers). */
  async scrollByWheel(deltaX: number, deltaY: number): Promise<void> {
    await this.page.mouse.wheel(deltaX, deltaY);
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getText(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' });
    return (await locator.textContent())?.trim() ?? '';
  }

  /** Text of every element matching the locator. */
  async getAllTexts(locator: Locator): Promise<string[]> {
    const texts = await locator.allTextContents();
    return texts.map((t) => t.trim()).filter((t) => t.length > 0);
  }

  /** Rendered (visible) text — respects CSS, unlike textContent. */
  async getInnerText(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' });
    return (await locator.innerText()).trim();
  }

  async getInnerHtml(locator: Locator): Promise<string> {
    return locator.innerHTML();
  }

  async getValue(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' });
    return locator.inputValue();
  }

  async getAttribute(locator: Locator, name: string): Promise<string | null> {
    return locator.getAttribute(name);
  }

  async getCssValue(locator: Locator, property: string): Promise<string> {
    return locator.evaluate(
      (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
      property
    );
  }

  async getCount(locator: Locator): Promise<number> {
    return locator.count();
  }

  // ─── State Checks (non-throwing) ─────────────────────────────────────────────

  async isVisible(locator: Locator, timeout = 3000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async isHidden(locator: Locator): Promise<boolean> {
    return locator.isHidden();
  }

  async isEnabled(locator: Locator): Promise<boolean> {
    return locator.isEnabled();
  }

  async isDisabled(locator: Locator): Promise<boolean> {
    return locator.isDisabled();
  }

  // ─── Wait Helpers ────────────────────────────────────────────────────────────

  async waitForVisible(locator: Locator, timeout = ENV.timeout): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(locator: Locator, timeout = ENV.timeout): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  async waitForAttached(locator: Locator, timeout = ENV.timeout): Promise<void> {
    await locator.waitFor({ state: 'attached', timeout });
  }

  async waitForEnabled(locator: Locator, timeout = ENV.timeout): Promise<void> {
    await locator.and(this.page.locator(':enabled')).waitFor({ timeout });
  }

  async waitForUrl(urlOrPattern: string | RegExp, timeout = ENV.navigationTimeout): Promise<void> {
    await this.page.waitForURL(urlOrPattern, { timeout });
  }

  async waitForSelector(selector: string, timeout = ENV.timeout): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /** Wait until the locator matches exactly `count` elements. */
  async waitForCount(locator: Locator, count: number, timeout = ENV.timeout): Promise<void> {
    const deadline = Date.now() + timeout;
    while ((await locator.count()) !== count) {
      if (Date.now() > deadline) {
        throw new Error(
          `Timeout: expected ${count} elements for ${locator.toString()}, found ${await locator.count()}`
        );
      }
      await this.page.waitForTimeout(100);
    }
  }

  /** Wait for a network response whose URL matches the pattern. */
  async waitForResponse(urlPattern: string | RegExp, timeout = ENV.timeout): Promise<void> {
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  /** Wait until a JavaScript condition evaluates truthy in the browser. */
  async waitForCondition(
    predicate: () => boolean,
    timeout = ENV.timeout
  ): Promise<void> {
    await this.page.waitForFunction(predicate, undefined, { timeout });
  }

  // ─── Frames / Tabs / Dialogs ─────────────────────────────────────────────────

  /** Get a FrameLocator for interacting inside an iframe. */
  frame(selector: string): FrameLocator {
    return this.page.frameLocator(selector);
  }

  /**
   * Click an element that opens a new tab/window and return the new Page.
   */
  async clickAndWaitForNewTab(locator: Locator, description = ''): Promise<Page> {
    pageLogger.debug(`Click (expecting new tab): ${description || locator.toString()}`);
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      locator.click(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  /** Number of open tabs/windows in the current browser context. */
  getTabCount(): number {
    return this.page.context().pages().length;
  }

  /**
   * Bring the tab at `index` (opening order) to the front and return it.
   * Note: this instance keeps driving its original page — use the returned
   * Page (e.g. wrap it in a page object) to interact with the other tab.
   */
  async switchToTab(index: number): Promise<Page> {
    const pages = this.page.context().pages();
    if (index < 0 || index >= pages.length) {
      throw new Error(`No tab at index ${index} — ${pages.length} tab(s) open`);
    }
    const target = pages[index];
    await target.bringToFront();
    return target;
  }

  /**
   * Arm a one-time handler for the NEXT dialog (alert/confirm/prompt).
   * Call BEFORE the action that triggers the dialog.
   */
  handleNextDialog(action: 'accept' | 'dismiss', promptText?: string): void {
    this.page.once('dialog', async (dialog) => {
      pageLogger.debug(`Dialog (${dialog.type()}): "${dialog.message()}" → ${action}`);
      if (action === 'accept') {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  // ─── File Upload / Download ──────────────────────────────────────────────────

  async uploadFile(locator: Locator, filePath: string | string[]): Promise<void> {
    pageLogger.debug(`Upload file(s): ${filePath}`);
    await locator.setInputFiles(filePath);
  }

  /**
   * Click a download trigger and save the file. Returns the saved path.
   */
  async downloadFile(trigger: Locator, saveDir = 'test-results/downloads'): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      trigger.click(),
    ]);
    const filePath = `${saveDir}/${download.suggestedFilename()}`;
    await download.saveAs(filePath);
    pageLogger.info(`Downloaded: ${filePath}`);
    return filePath;
  }

  // ─── Cookies / Storage ───────────────────────────────────────────────────────

  async getCookies(): Promise<Cookie[]> {
    return this.page.context().cookies();
  }

  async addCookies(cookies: Parameters<BrowserContext['addCookies']>[0]): Promise<void> {
    await this.page.context().addCookies(cookies);
  }

  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  async setSessionStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [key, value]);
  }

  async getSessionStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => sessionStorage.getItem(k), key);
  }

  async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => sessionStorage.clear());
  }

  // ─── Clipboard ───────────────────────────────────────────────────────────────
  // Requires 'clipboard-read'/'clipboard-write' permissions on the context
  // (Chromium): context.grantPermissions(['clipboard-read', 'clipboard-write'])

  async setClipboardText(text: string): Promise<void> {
    await this.page.evaluate((t) => navigator.clipboard.writeText(t), text);
  }

  async getClipboardText(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  // ─── Network Mocking ─────────────────────────────────────────────────────────

  /**
   * Stub every request matching the pattern with a canned response.
   * Objects passed as `body` are JSON-stringified automatically.
   */
  async mockRoute(
    urlPattern: string | RegExp,
    response: { status?: number; contentType?: string; body?: string | object }
  ): Promise<void> {
    pageLogger.debug(`Mocking route: ${urlPattern}`);
    await this.page.route(urlPattern, (route) =>
      route.fulfill({
        status: response.status ?? 200,
        contentType: response.contentType ?? 'application/json',
        body:
          typeof response.body === 'string'
            ? response.body
            : JSON.stringify(response.body ?? {}),
      })
    );
  }

  /** Abort every request matching the pattern (e.g. block analytics/images). */
  async blockRequests(urlPattern: string | RegExp): Promise<void> {
    pageLogger.debug(`Blocking requests: ${urlPattern}`);
    await this.page.route(urlPattern, (route) => route.abort());
  }

  /** Remove a mock/block previously installed for the pattern. */
  async unmockRoute(urlPattern: string | RegExp): Promise<void> {
    await this.page.unroute(urlPattern);
  }

  // ─── JavaScript Utilities ────────────────────────────────────────────────────

  /** Run a script in the browser context. */
  async executeScript<T>(script: () => T): Promise<T> {
    return this.page.evaluate(script);
  }

  /** Outline an element in red — useful when debugging or demoing. */
  async highlight(locator: Locator): Promise<void> {
    await locator.evaluate((el) => {
      (el as HTMLElement).style.outline = '3px solid red';
    });
  }

  // ─── Screenshots ─────────────────────────────────────────────────────────────

  async screenshot(name: string): Promise<Buffer> {
    pageLogger.debug(`Taking screenshot: ${name}`);
    return takeScreenshot(this.page, name);
  }

  async screenshotLocator(locator: Locator): Promise<Buffer> {
    return locator.screenshot();
  }

  // ─── Custom Dropdowns (non-native listbox/option widgets) ───────────────────
  // Most component libraries (OXD, Material, Ant Design, etc.) render their
  // own dropdown instead of a native <select> — a trigger element opens a
  // floating list of options. These methods handle that pattern generically.

  /**
   * Select an option from a custom (non-native) dropdown widget.
   * Opens the dropdown via `trigger`, then clicks the option matching
   * `optionText` inside elements matching `optionSelector` — defaults to
   * `[role="option"]`, which accessible component libraries expose.
   *
   * @example
   * await webActions.selectCustomDropdown(page.locator('.oxd-select-text'), 'Enabled');
   */
  async selectCustomDropdown(
    trigger: Locator,
    optionText: string,
    optionSelector = '[role="option"]'
  ): Promise<void> {
    pageLogger.debug(`Custom dropdown: opening ${trigger.toString()}`);
    await this.click(trigger, 'Custom dropdown trigger');
    const option = this.page.locator(optionSelector).filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    pageLogger.debug(`Custom dropdown: selecting "${optionText}"`);
    await option.click();
  }

  /** Visible text currently shown on a custom dropdown trigger. */
  async getCustomDropdownValue(trigger: Locator): Promise<string> {
    return this.getText(trigger);
  }

  // ─── Tables / Grids ──────────────────────────────────────────────────────────
  // Generic helpers for row-based UI grids. `rows` is a Locator matching every
  // row, e.g. page.locator('.oxd-table-row') or page.locator('tbody tr').

  /** First row whose text contains `text`. */
  getTableRowByText(rows: Locator, text: string): Locator {
    return rows.filter({ hasText: text }).first();
  }

  /** Every row whose text contains `text`. */
  getTableRowsByText(rows: Locator, text: string): Locator {
    return rows.filter({ hasText: text });
  }

  /**
   * Text of every cell in a given column, across all rows.
   * `cellSelector` defaults to common cell patterns (real <td>, ARIA grid
   * cells, and OXD table cells) — override it for other component libraries.
   */
  async getColumnValues(
    rows: Locator,
    columnIndex: number,
    cellSelector = 'td, [role="cell"], .oxd-table-cell'
  ): Promise<string[]> {
    const count = await rows.count();
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const cell = rows.nth(i).locator(cellSelector).nth(columnIndex);
      values.push((await cell.textContent())?.trim() ?? '');
    }
    return values;
  }

  /** The row whose cell at `columnIndex` equals `value` exactly. Throws if none match. */
  async getRowByColumnValue(
    rows: Locator,
    columnIndex: number,
    value: string,
    cellSelector = 'td, [role="cell"], .oxd-table-cell'
  ): Promise<Locator> {
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cellText = (await row.locator(cellSelector).nth(columnIndex).textContent())?.trim();
      if (cellText === value) return row;
    }
    throw new Error(`No row found where column ${columnIndex} = "${value}"`);
  }

  // ─── Loading Overlay ─────────────────────────────────────────────────────────

  /**
   * Wait for a loading spinner/overlay to disappear, if one shows up at all.
   * Safe to call unconditionally — resolves immediately when the loader
   * never appears (e.g. the response was cached or already finished).
   */
  async waitForLoaderToDisappear(
    loaderSelector = '.oxd-loading-spinner, [class*="spinner"], [class*="loader"], [aria-busy="true"]',
    timeout = ENV.timeout
  ): Promise<void> {
    const loader = this.page.locator(loaderSelector).first();
    try {
      await loader.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      return; // never appeared — nothing to wait for
    }
    await loader.waitFor({ state: 'hidden', timeout });
  }

  // ─── Toast / Notification ────────────────────────────────────────────────────

  /** Text of the currently visible toast/notification banner. */
  async getToastText(
    toastSelector = '.oxd-toast-content, [role="alert"], [role="status"]'
  ): Promise<string> {
    const toast = this.page.locator(toastSelector).first();
    await toast.waitFor({ state: 'visible', timeout: ENV.timeout });
    return this.getText(toast);
  }
}
