import { test, expect } from '@playwright/test';
import { ECommerceLoginPage } from '../../main/ui/pages/ECommerceLoginPage';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, Severity } from '../../main/shared/reporting/reporting';

// ABOUTME: Visual regression tests capturing page screenshots for baseline comparison.
// ABOUTME: Uses Playwright's built-in toHaveScreenshot with baselines in resources/visual-baselines/.

const PAGES_TO_CAPTURE = [
  { name: 'Home', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Products', path: '/products' },
  { name: 'Contact Us', path: '/contact_us' },
];

test.describe('Visual Regression @regression', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Visual Regression',
      owner: 'QA Team',
      layer: 'ui',
    });

    await page.route(
      /(googlesyndication|doubleclick|adservice|google-analytics|googletagmanager|consent\.google|pagead|aswpsdkus|googleads)/,
      (route) => route.abort(),
    );

    stepLogger.info(`Starting test: ${testInfo.title}`);
  });

  for (const { name, path } of PAGES_TO_CAPTURE) {
    test(`${name} page matches visual baseline`,
      { tag: '@regression' },
      async ({ page }) => {
        await annotate({
          story: `${name} page visual check`,
          severity: Severity.NORMAL,
          description: `Screenshot comparison for the ${name} page`,
        });

        await test.step(`Navigate to ${name} page`, async () => {
          await page.goto(`https://automationexercise.com${path}`, {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForTimeout(1000);
          stepLogger.info(`Loaded ${name} page for visual capture`);
        });

        await test.step('Compare against baseline', async () => {
          await page.screenshot();
          await page.evaluate(() => window.scrollTo(0, 0));

          await expect(page).toHaveScreenshot(`${name.toLowerCase()}-page.png`, {
            fullPage: false,
            maxDiffPixelRatio: 0.03,
            animations: 'disabled',
            mask: [
              page.locator('iframe'),
              page.locator('.google-auto-placed'),
              page.locator('[id*="google"]'),
              page.locator('#slider-carousel'),
            ],
          });
          stepLogger.info(`${name} page visual comparison passed`);
        });
      });
  }

  test('Login form layout matches baseline',
    { tag: '@regression' },
    async ({ page }) => {
      await annotate({
        story: 'Login form visual check',
        severity: Severity.NORMAL,
        description: 'Component-level screenshot of the login form area',
      });

      const loginPage = new ECommerceLoginPage(page);

      await test.step('Navigate to login page', async () => {
        await loginPage.goto();
      });

      await test.step('Compare login form section', async () => {
        const formSection = page.locator('.signup-form, .login-form').first();
        await expect(formSection).toHaveScreenshot('login-form-section.png', {
          animations: 'disabled',
        });
        stepLogger.info('Login form visual comparison passed');
      });
    });
});
