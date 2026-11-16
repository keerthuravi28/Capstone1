import { Page } from '@playwright/test';
import { WebAssertions } from '../common/WebAssertions';
import { ENV } from '../../shared/config/env.config';
import { pageLogger } from '../../shared/utils/logger';

/**
 * BasePage
 * ─────────
 * Abstract base class for all Page Objects — the application-facing layer.
 *
 * All generic, reusable browser interactions live in the portable UI common
 * layer (src/main/ui/common/):
 *   WebActions     — clicks, inputs, dropdowns, waits, getters, tabs, files…
 *   WebAssertions  — web-first assertions (extends WebActions)
 *
 * BasePage inherits both, and adds only what is application-specific:
 * navigation relative to the app's BASE_URL. Every page object must
 * extend this class.
 */
export abstract class BasePage extends WebAssertions {

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigate to a path relative to BASE_URL, or an absolute URL.
   */
  async navigate(path = ''): Promise<void> {
    const url = path.startsWith('http') ? path : `${ENV.baseUrl}${path}`;
    pageLogger.info(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }
}
