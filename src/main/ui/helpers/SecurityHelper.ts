import { Page, Cookie, Dialog, expect } from '@playwright/test';

/**
 * SecurityHelper
 * ────────────────
 * Lightweight, non-destructive security checks — NOT a penetration-testing
 * tool. Covers what's safe and genuinely useful to assert automatically on
 * every run: response security headers, cookie flags, and whether the app
 * reflects or executes attacker-controlled input unescaped. Deliberately
 * does NOT attempt real exploitation, brute-forcing, or anything that
 * generates meaningful load — this framework targets a shared public demo
 * instance it doesn't own, and staying a good citizen of that constraint
 * matters as much as the checks themselves.
 *
 * Kept as a standalone helper (like AccessibilityHelper) since it's a
 * distinct concern from app interaction/verification.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecurityHeaderExpectation {
  /** Header name (case-insensitive). */
  name: string;
  /** Exact substring or pattern to match; omit to only check presence. */
  value?: string | RegExp;
}

export interface CookieSecurityOptions {
  /** Require the Secure flag (cookie only sent over HTTPS). Default: true. */
  requireSecure?: boolean;
  /** Require the HttpOnly flag (inaccessible to JS — mitigates XSS cookie theft). Default: true. */
  requireHttpOnly?: boolean;
  /** Require SameSite to be 'Strict' or 'Lax' (mitigates CSRF). Default: true. */
  requireSameSite?: boolean;
}

// ─── Common Header / Payload Sets ──────────────────────────────────────────────

/** A sane baseline of security headers worth checking for on any web response. */
export const RECOMMENDED_SECURITY_HEADERS: SecurityHeaderExpectation[] = [
  { name: 'x-content-type-options', value: 'nosniff' },
  { name: 'x-frame-options' },
  { name: 'content-security-policy' },
];

/**
 * A small, non-destructive set of XSS probe strings — enough to reveal
 * missing output-encoding without attempting real exploitation. Each sets a
 * detectable marker (`window.__xssProbe`) rather than doing anything harmful.
 */
export const XSS_PAYLOADS: string[] = [
  '<script>window.__xssProbe = true;</script>',
  '"><img src=x onerror="window.__xssProbe = true">',
  "'><svg onload=\"window.__xssProbe = true\">",
];

/** A small set of SQL-injection probe strings — enough to reveal unhandled DB errors, not to exfiltrate data. */
export const SQLI_PAYLOADS: string[] = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1' UNION SELECT NULL--",
];

/** Substrings that indicate a raw database/stack-trace error leaked into a response. */
const DB_ERROR_SIGNATURES = [
  'SQLSTATE', 'ORA-', 'SQLException', 'syntax error at or near',
  'mysql_fetch', 'ODBC Driver', 'PDOException', 'Unhandled exception',
  'Stack trace:', 'at Object.<anonymous>',
];

// ─── SecurityHelper ────────────────────────────────────────────────────────────

export class SecurityHelper {
  constructor(private readonly page: Page) {}

  // ─── Headers ─────────────────────────────────────────────────────────────────

  /**
   * Assert a set of security headers are present (and optionally match a
   * value) on a header map. Works with either a Playwright Response's
   * `.headers()` or an ApiResponse's `.headers` — pass either in directly.
   */
  assertSecurityHeaders(
    headers: Record<string, string>,
    expectations: SecurityHeaderExpectation[] = RECOMMENDED_SECURITY_HEADERS
  ): void {
    const normalized = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    for (const { name, value } of expectations) {
      const actual = normalized[name.toLowerCase()];
      expect(
        actual,
        `Expected security header "${name}" to be present. Headers seen: ${JSON.stringify(normalized)}`
      ).toBeDefined();

      if (value instanceof RegExp) {
        expect(actual).toMatch(value);
      } else if (typeof value === 'string') {
        expect(actual?.toLowerCase()).toContain(value.toLowerCase());
      }
    }
  }

  // ─── Cookies ─────────────────────────────────────────────────────────────────

  /** Fetch a cookie by name from the current browser context, or undefined if not set. */
  async getCookie(name: string): Promise<Cookie | undefined> {
    const cookies = await this.page.context().cookies();
    return cookies.find((c) => c.name === name);
  }

  /**
   * Find a cookie by predicate instead of exact name — useful when the exact
   * session-cookie name isn't known/stable (e.g. `c => /sess/i.test(c.name)`
   * to locate whatever the app calls its session cookie).
   */
  async findCookie(predicate: (cookie: Cookie) => boolean): Promise<Cookie | undefined> {
    const cookies = await this.page.context().cookies();
    return cookies.find(predicate);
  }

  /**
   * Assert a cookie carries the security flags expected of a session cookie:
   * Secure, HttpOnly, and a SameSite policy. Defaults are the safe baseline —
   * relax individual flags via `options` only for a documented reason.
   */
  async assertCookieSecurity(name: string, options: CookieSecurityOptions = {}): Promise<void> {
    const { requireSecure = true, requireHttpOnly = true, requireSameSite = true } = options;
    const cookie = await this.getCookie(name);

    expect(cookie, `Expected cookie "${name}" to be set`).toBeDefined();
    if (!cookie) return;

    if (requireSecure) {
      expect(cookie.secure, `Cookie "${name}" should have the Secure flag`).toBe(true);
    }
    if (requireHttpOnly) {
      expect(cookie.httpOnly, `Cookie "${name}" should have the HttpOnly flag`).toBe(true);
    }
    if (requireSameSite) {
      expect(
        ['Strict', 'Lax'].includes(cookie.sameSite ?? ''),
        `Cookie "${name}" should have SameSite=Strict or Lax (got "${cookie.sameSite}")`
      ).toBe(true);
    }
  }

  // ─── XSS / Injection Probing ──────────────────────────────────────────────────

  /**
   * Run `action` (whatever submits/reflects a payload somewhere in the page)
   * and fail if a JS dialog fires during it — the most reliable signal that
   * injected script actually EXECUTED rather than being safely escaped.
   * Registers and cleans up its own dialog listener regardless of outcome.
   *
   * @example
   * await security.assertNoScriptExecutes(async () => {
   *   await webActions.fill(searchInput, XSS_PAYLOADS[0]);
   *   await webActions.click(searchButton);
   * });
   */
  async assertNoScriptExecutes(action: () => Promise<void>): Promise<void> {
    let dialogFired = false;
    let dialogMessage = '';

    const onDialog = async (dialog: Dialog) => {
      dialogFired = true;
      dialogMessage = dialog.message();
      await dialog.dismiss().catch(() => {});
    };

    this.page.on('dialog', onDialog);
    try {
      await action();
    } finally {
      this.page.off('dialog', onDialog);
    }

    expect(
      dialogFired,
      `A JS dialog fired ("${dialogMessage}") — injected script executed instead of being escaped`
    ).toBe(false);
  }

  /** Assert the raw page HTML does not contain `payload` verbatim (i.e. it was escaped, not reflected as live markup). */
  async assertPayloadNotReflectedRaw(payload: string): Promise<void> {
    const html = await this.page.content();
    expect(html, `Payload appears unescaped in the page HTML: ${payload}`).not.toContain(payload);
  }

  // ─── DB Error Leakage ────────────────────────────────────────────────────────

  /** Assert a response body doesn't leak a raw database/stack-trace error — a common SQLi/robustness tell. */
  assertNoDatabaseErrorLeaked(body: string): void {
    const leaked = DB_ERROR_SIGNATURES.find((sig) => body.includes(sig));
    expect(leaked, `Response body appears to leak a raw database/server error ("${leaked}")`).toBeUndefined();
  }
}
