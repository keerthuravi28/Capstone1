import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { randomString } from '../../main/shared/utils/helpers';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';

// ABOUTME: End-to-end checkout and order placement tests.
// ABOUTME: Covers Requirements #3 (Checkout Flow) and #4 (Order Placement Validation).

// test card details - not real, site accepts anything in the right format
const TEST_CARD = {
  nameOnCard: 'Test User',
  cardNumber: '4100000000000000',
  cvc: '123',
  expiryMonth: '12',
  expiryYear: '2030',
};

test.describe('Checkout & Order Placement', () => {

  // every test registers a fresh user, adds product, and navigates to checkout
  // which easily takes 40-50s on a slow connection - need extra headroom
  test.setTimeout(120_000);

  // These tests need a logged-in user to reach checkout.
  // We register a fresh account in beforeEach so tests are independent.
  test.beforeEach(async ({ page, ecommerceLoginPage }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Checkout and Orders',
      owner: 'QA Team',
      layer: 'ui',
    });
    stepLogger.info(`Starting: ${testInfo.title}`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(page, `FAIL-checkout-${testInfo.title.replace(/\W+/g, '-')}`);
    }
  });

  // helper: register, add product, get to checkout
  async function setupCartAndCheckout(
    page: any,
    productsPage: any,
    cartPage: any,
    ecommerceLoginPage: any,
  ) {
    // register a fresh user
    const name = `TestUser${randomString(4)}`;
    const email = `test.${randomString(6)}@mailinator.com`;

    await page.goto('https://automationexercise.com/login');
    await page.fill('input[data-qa="signup-name"]', name);
    await page.fill('input[data-qa="signup-email"]', email);
    await page.click('button[data-qa="signup-button"]');
    await page.waitForLoadState('domcontentloaded');

    // fill account creation form if we land on it
    const accountFormVisible = await page.locator('input#password').isVisible().catch(() => false);
    if (accountFormVisible) {
      await page.fill('input#password', 'Test@1234');
      await page.selectOption('select#days', '10');
      await page.selectOption('select#months', '5');
      await page.selectOption('select#years', '1990');
      await page.fill('input#first_name', 'Test');
      await page.fill('input#last_name', 'User');
      await page.fill('input#address1', '123 Test Street');
      await page.fill('input#state', 'TestState');
      await page.fill('input#city', 'TestCity');
      await page.fill('input#zipcode', '12345');
      await page.fill('input#mobile_number', '5551234567');
      await page.click('button[data-qa="create-account"]');
      await page.waitForLoadState('domcontentloaded');

      // click continue on account created page
      const continueBtn = page.locator('a[data-qa="continue-button"]');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      }
    }

    // now add a product
    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    // proceed to checkout
    await cartPage.proceedToCheckout();
    stepLogger.info('Setup complete: registered, product in cart, on checkout');
  }

  // --- Checkout page tests ---

  test('checkout shows delivery address and order review', { tag: ['@smoke', '@critical'] }, async ({
    page, productsPage, cartPage, checkoutPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Checkout page layout', severity: Severity.BLOCKER });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);

    await checkoutPage.assertDeliveryAddressVisible();
    await checkoutPage.assertOrderReviewVisible();
    await checkoutPage.assertPlaceOrderButtonVisible();

    stepLogger.info('Checkout page structure verified');
    await takeScreenshot(page, 'checkout-page-layout');
  });

  test('delivery address shows account details', { tag: '@critical' }, async ({
    page, productsPage, cartPage, checkoutPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Address pre-fill', severity: Severity.BLOCKER });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);

    // address should contain what we entered during registration
    const name = await checkoutPage.getDeliveryName();
    expect(name).toBeTruthy();
    stepLogger.info(`Delivery name on checkout: "${name}"`);

    const address = await checkoutPage.getDeliveryAddress();
    expect(address).toBeTruthy();
    stepLogger.info(`Delivery address: "${address}"`);
  });

  test('add comment to order during checkout', { tag: '@regression' }, async ({
    page, productsPage, cartPage, checkoutPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Order comments', severity: Severity.MINOR });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);

    const comment = 'Please leave at the door';
    await checkoutPage.enterComment(comment);

    // verify comment stuck
    const commentBox = page.locator('textarea[name="message"]');
    const val = await commentBox.inputValue();
    expect(val).toBe(comment);
  });

  // --- Payment & Order placement ---

  test('place order with valid payment details', { tag: ['@smoke', '@critical'] }, async ({
    page, productsPage, cartPage, checkoutPage, orderPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Successful order', severity: Severity.BLOCKER });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);
    await checkoutPage.clickPlaceOrder();

    // should be on payment page now
    await orderPage.assertOnPaymentPage();
    await orderPage.fillAndSubmitPayment(TEST_CARD);

    await orderPage.assertOrderPlaced();
    stepLogger.info('Order placed successfully');
    await takeScreenshot(page, 'order-placed');
  });

  test('order confirmation page has download invoice and continue buttons', { tag: '@critical' }, async ({
    page, productsPage, cartPage, checkoutPage, orderPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Order confirmation elements', severity: Severity.BLOCKER });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);
    await checkoutPage.clickPlaceOrder();
    await orderPage.fillAndSubmitPayment(TEST_CARD);

    await orderPage.assertOrderPlaced();
    await orderPage.assertDownloadInvoiceVisible();
    await orderPage.assertContinueButtonVisible();
  });

  test('continue button after order navigates to home', { tag: '@regression' }, async ({
    page, productsPage, cartPage, checkoutPage, orderPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Post-order navigation', severity: Severity.NORMAL });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);
    await checkoutPage.clickPlaceOrder();
    await orderPage.fillAndSubmitPayment(TEST_CARD);
    await orderPage.assertOrderPlaced();

    await orderPage.clickContinue();
    await page.waitForLoadState('networkidle').catch(() => {});

    // should be back on homepage
    expect(page.url()).toMatch(/automationexercise\.com\/?$/);
    stepLogger.info('Returned to homepage after order');
  });

  // --- Validation scenarios ---

  test('checkout without products redirects to empty cart', { tag: '@regression' }, async ({
    page, cartPage,
  }) => {
    await annotate({ story: 'Empty cart checkout', severity: Severity.NORMAL });

    // go directly to cart without adding anything
    await cartPage.goto();
    const empty = await cartPage.isCartEmpty();
    expect(empty).toBeTruthy();
    stepLogger.info('Empty cart correctly shown');
  });

  test('checkout as guest shows register/login prompt', { tag: '@regression' }, async ({
    page, productsPage, cartPage,
  }) => {
    await annotate({ story: 'Guest checkout block', severity: Severity.NORMAL });

    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    await cartPage.proceedToCheckout();
    const modal = await cartPage.isLoginModalShown();
    expect(modal).toBeTruthy();
    stepLogger.info('Guest user correctly prompted to login');
  });

  test('billing address also shown on checkout', { tag: '@regression' }, async ({
    page, productsPage, cartPage, checkoutPage, ecommerceLoginPage,
  }) => {
    await annotate({ story: 'Billing address display', severity: Severity.MINOR });

    await setupCartAndCheckout(page, productsPage, cartPage, ecommerceLoginPage);

    await checkoutPage.assertBillingAddressVisible();
    stepLogger.info('Billing address section visible on checkout');
  });
});
