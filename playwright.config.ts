/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const headless = process.env.HEADLESS === 'true';
const slowMo   = parseInt(process.env.SLOW_MO ?? '0', 10);

export default defineConfig({
  testDir: './src/tests',
  testMatch: ['**/*.spec.ts'],
  
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2,
  // Local: let Playwright auto-size to ~50% of CPU cores.
  // CI: 2 workers keeps external site from throttling concurrent requests.
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  timeout: 60000,
  // Visual-regression BASELINES (committed, source-of-truth reference images)
  // live in a single dedicated, git-tracked folder instead of scattered
  // *-snapshots/ folders next to each spec. This keeps tests/ clean and all
  // baselines in one place. Naming is preserved: <name>-<project>-<platform>.png
  // NOTE: this is NOT test-results/screenshots (throwaway failure diagnostics,
  // gitignored) — these baselines MUST stay tracked in git or CI has nothing
  // to compare against.
  snapshotPathTemplate:
    '{testDir}/../../resources/visual-baselines/{testFileName}/{arg}{-projectName}{-platform}{ext}',
  expect: {
    // Global baseline-comparison defaults for expect(...).toHaveScreenshot().
    // Override per-call via WebAssertions' VisualAssertionOptions when a
    // specific comparison needs a looser/tighter tolerance.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'https://automationexercise.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    // ── Cross-browser UI projects ─────────────────────────────────────────────
    // All three run the same spec files (src/tests/ui/**). `npm test` runs
    // every project below; use --project=<name> (or the test:* npm scripts)
    // to target a single browser.
    {
      name: 'ui',
      testMatch: ['**/tests/ui/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        headless,
        launchOptions: {
          slowMo,
          // Chromium-only flag — do not carry over to firefox/webkit projects.
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },
    {
      name: 'ui-firefox',
      testMatch: ['**/tests/ui/**/*.spec.ts'],
      use: {
        ...devices['Desktop Firefox'],
        headless,
        launchOptions: { slowMo },
      },
    },
    {
      name: 'ui-webkit',
      testMatch: ['**/tests/ui/**/*.spec.ts'],
      use: {
        ...devices['Desktop Safari'],
        headless,
        launchOptions: { slowMo },
      },
    },
  ],
});
