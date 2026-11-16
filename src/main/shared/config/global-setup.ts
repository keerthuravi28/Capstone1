/// <reference types="node" />
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from './env.config';
import { DbClientFactory } from '../db/DbClientFactory';

/**
 * Global Setup — verify the environment, then authenticate once, reuse everywhere.
 * ─────────────────────────────────────────────────────────────────────────────────
 * Runs a SINGLE time before the whole suite (wired via
 * playwright.config.ts → `globalSetup`). Two jobs, in order:
 *
 * 1. **Pre-flight environment check** (`verifyEnvironment`) — confirm the target
 *    app/API are actually reachable and, if DB_ENABLED, that the DB config is
 *    complete — BEFORE spending time driving a browser. A dead environment now
 *    fails in ~1 second with a clear message instead of a confusing login timeout
 *    two steps later.
 * 2. **Authenticate** — drive the OrangeHRM login form once and write the
 *    resulting browser session (cookies) to `.auth/admin.json`.
 *
 * The `loggedIn` fixture (src/main/ui/fixtures/authorization.ts) then restores
 * that session instead of logging in through the UI on every test — cutting
 * one full login round-trip per authenticated test, reducing flakiness, and
 * being a good citizen of the shared public demo instance.
 *
 * OrangeHRM auth is cookie-based, so cookies alone are enough to restore the
 * session — see the matching note in fixtures/api.ts.
 *
 * The saved file holds a live session token: `.auth/` is gitignored and must
 * never be committed.
 */

/** Absolute path to the saved admin session. Shared with the fixtures layer. */
export const STORAGE_STATE = path.resolve(process.cwd(), '.auth', 'admin.json');

/** How long to wait for a reachability check before giving up. */
const PREFLIGHT_TIMEOUT_MS = 10_000;

/**
 * Confirm a URL responds at all — any HTTP response (even a 404/500) counts as
 * "reachable" because it proves the network path and server are up. Only a
 * network-level failure (DNS, refused connection, timeout) is treated as down.
 */
async function checkReachable(label: string, url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREFLIGHT_TIMEOUT_MS);
  try {
    await fetch(url, { method: 'GET', signal: controller.signal });
    // eslint-disable-next-line no-console
    console.log(`[global-setup] ✓ ${label} reachable: ${url}`);
  } catch (err) {
    throw new Error(
      `[global-setup] ✗ ${label} is NOT reachable at ${url}. ` +
      `Check the URL in .env and your network/VPN connection before re-running tests. ` +
      `(${(err as Error).message})`
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Pre-flight checks: run BEFORE touching a browser, so failures are fast and clear. */
async function verifyEnvironment(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[global-setup] Running pre-flight environment checks...');

  await checkReachable('BASE_URL', ENV.baseUrl);
  await checkReachable('API_BASE_URL', ENV.apiBaseUrl);

  if (ENV.db.enabled) {
    const dbClient = DbClientFactory.create();
    if (!dbClient.isConfigured()) {
      throw new Error(
        '[global-setup] ✗ DB_ENABLED=true but the database config is incomplete. ' +
        'Set DB_TYPE, DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env, or set DB_ENABLED=false.'
      );
    }
    // eslint-disable-next-line no-console
    console.log('[global-setup] ✓ Database config present (DB_ENABLED=true)');
  }

  // eslint-disable-next-line no-console
  console.log('[global-setup] Pre-flight checks passed.');
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await verifyEnvironment();

  const authDir = path.dirname(STORAGE_STATE);
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const loginUrl = `${ENV.baseUrl}/web/index.php/auth/login`;
    // eslint-disable-next-line no-console
    console.log(`[global-setup] Authenticating admin session at ${loginUrl}`);

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="username"]', ENV.credentials.username);
    await page.fill('input[name="password"]', ENV.credentials.password);
    await page.click('button[type="submit"]');

    // Confirm the login actually succeeded before persisting the session,
    // otherwise every authenticated test would fail with a misleading error.
    await page.waitForURL(/dashboard/, { timeout: ENV.navigationTimeout });

    await context.storageState({ path: STORAGE_STATE });
    // eslint-disable-next-line no-console
    console.log(`[global-setup] Session saved → ${STORAGE_STATE}`);
  } finally {
    await browser.close();
  }
}
