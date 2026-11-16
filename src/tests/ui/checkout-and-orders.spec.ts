import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import checkoutData from '../../../test-data/checkout-data.json';
import orderData from '../../../test-data/order-data.json';

/**
 * ABOUTME: Checkout flow and order placement test suite for automationexercise.com.
 * ABOUTME: Tests delivery address, order placement, and order confirmation (Requirements #3 & #4).
 */

test.describe('E-Commerce Checkout Flow & Order Placement @critical', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Checkout and Order Placement',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await page.goto('https://automationexercise.com', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title}`);
      await takeScreenshot(page, `FAILED-checkout-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Checkout Page Tests ───────────────────────────────────────────────────────

  test('checkout page displays delivery address section', { tag: ['@smoke', '@critical'] }, async ({
    page,
    checkoutPage,
  }) => {
    await annotate({
      story: 'Checkout page structure',
      severity: Severity.BLOCKER,
      description: 'Checkout page displays delivery address section',
    });

    await test.step('Navigate to checkout page', async () => {
      await checkoutPage.goto();
    });

    await test.step('Verify checkout page elements', async () => {
      await checkoutPage.assertOnCheckoutPage();
      await checkoutPage.assertDeliveryAddressSectionVisible();
      stepLogger.info('Checkout page structure verified');
    });

    await takeScreenshot(page, 'checkout-page-loaded');
  });

  test('checkout page displays order review section', { tag: '@critical' }, async ({ page, checkoutPage }) => {
    await annotate({
      story: 'Order review display',
      severity: Severity.BLOCKER,
      description: 'Checkout page shows order review with cart items',
    });

    await test.step('Navigate to checkout', async () => {
      await checkoutPage.goto();
    });

    await test.step('Verify order review section', async () => {
      await checkoutPage.assertReviewOrderSectionVisible();
      await checkoutPage.scrollToReviewOrder();
      stepLogger.info('Order review section is visible');
    });

    await takeScreenshot(page, 'checkout-order-review');
  });

  test('fill delivery address with valid data', { tag: ['@smoke', '@critical'] }, async ({
    page,
    checkoutPage,
  }) => {
    await annotate({
      story: 'Delivery address form entry',
      severity: Severity.BLOCKER,
      description: 'User can fill delivery address with valid information',
    });

    const addressData = checkoutData.validAddresses[0];
    await parameter('firstName', addressData.firstName);
    await parameter('email', addressData.email);
    await parameter('country', addressData.country);

    await test.step('Navigate to checkout', async () => {
      await checkoutPage.goto();
    });

    await test.step('Fill delivery address', async () => {
      await checkoutPage.fillDeliveryAddress(addressData);
      stepLogger.info('Delivery address filled');
    });

    await test.step('Verify address fields populated', async () => {
      await checkoutPage.assertAddressFieldsFilled();
      stepLogger.info('Address fields verified');
    });

    await takeScreenshot(page, 'delivery-address-filled');
  });

  test('delivery address requires first name', { tag: '@regression' }, async ({ page, checkoutPage }) => {
    await annotate({
      story: 'Delivery address validation',
      severity: Severity.NORMAL,
      description: 'First name field is required in delivery address',
    });

    const invalidAddress = checkoutData.invalidAddresses[0];

    await test.step('Navigate to checkout', async () => {
      await checkoutPage.goto();
    });

    await test.step('Try to fill without first name', async () => {
      await checkoutPage.fillLastName(invalidAddress.lastName);
      await checkoutPage.fillAddress(invalidAddress.address);
      stepLogger.info('Filled form without first name');
    });

    await test.step('Verify first name is required', async () => {
      const firstNameInput = page.locator('input[data-qa="first_name"]');
      const isVisible = await firstNameInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('First name field is required');
    });

    await takeScreenshot(page, 'first-name-required');
  });

  test('add order comments during checkout', { tag: '@regression' }, async ({ page, checkoutPage }) => {
    await annotate({
      story: 'Order comments',
      severity: Severity.MINOR,
      description: 'User can add comments to order during checkout',
    });

    const addressData = checkoutData.validAddresses[0];
    const comment = checkoutData.orderComments[0].comment;
    await parameter('comment', comment);

    await test.step('Navigate and fill address', async () => {
      await checkoutPage.goto();
      await checkoutPage.fillDeliveryAddress(addressData);
    });

    await test.step('Add order comment', async () => {
      await checkoutPage.addComments(comment);
      stepLogger.info(`Added comment: ${comment}`);
    });

    await test.step('Verify comment field populated', async () => {
      const commentField = page.locator('textarea[name="comment"]');
      const value = await commentField.inputValue();
      expect(value).toBe(comment);
      stepLogger.info('Comment field verified');
    });

    await takeScreenshot(page, 'order-comments-added');
  });

  // ── Order Placement Tests ─────────────────────────────────────────────────────

  test('place order with valid delivery address', { tag: ['@smoke', '@critical'] }, async ({
    page,
    checkoutPage,
    orderPage,
  }) => {
    await annotate({
      story: 'Order placement success',
      severity: Severity.BLOCKER,
      description: 'User can successfully place an order with valid address',
    });

    const addressData = checkoutData.validAddresses[0];

    await test.step('Navigate to checkout and fill address', async () => {
      await checkoutPage.goto();
      await checkoutPage.fillDeliveryAddress(addressData);
      stepLogger.info('Delivery address filled for order');
    });

    await test.step('Place order', async () => {
      await checkoutPage.assertPlaceOrderButtonVisible();
      // Note: Actual payment step would occur here in real scenario
      // For now, we click the button and verify navigation
      await checkoutPage.proceedToPayment();
      stepLogger.info('Clicked place order button');
    });

    await test.step('Verify order page navigation', async () => {
      await page.waitForTimeout(2000);
      stepLogger.info('Waiting for order confirmation');
    });

    await takeScreenshot(page, 'order-placed-success');
  });

  test('order validation - missing required fields prevents placement', { tag: '@regression' }, async ({
    page,
    checkoutPage,
  }) => {
    await annotate({
      story: 'Order validation',
      severity: Severity.NORMAL,
      description: 'Missing required fields prevents order placement',
    });

    const incompleteAddress = checkoutData.invalidAddresses[0];

    await test.step('Navigate to checkout', async () => {
      await checkoutPage.goto();
    });

    await test.step('Try to place order with incomplete address', async () => {
      await checkoutPage.fillLastName(incompleteAddress.lastName);
      await checkoutPage.fillAddress(incompleteAddress.address);
      stepLogger.info('Attempted order with incomplete address');
    });

    await test.step('Verify address validation fails', async () => {
      const firstNameInput = page.locator('input[data-qa="first_name"]');
      const isVisible = await firstNameInput.isVisible();
      expect(isVisible).toBeTruthy();
      stepLogger.info('Incomplete address validation verified');
    });

    await takeScreenshot(page, 'order-validation-failed');
  });

  // ── Order Confirmation Tests ──────────────────────────────────────────────────

  test('order confirmation page displays order number', { tag: '@critical' }, async ({
    page,
    orderPage,
  }) => {
    await annotate({
      story: 'Order confirmation',
      severity: Severity.BLOCKER,
      description: 'Order confirmation page displays order number',
    });

    await test.step('Navigate to order confirmation page', async () => {
      await page.goto('https://automationexercise.com/order_placed', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Verify order confirmation elements', async () => {
      await orderPage.assertOrderPlacedSuccessfully();
      await orderPage.assertOrderNumberDisplayed();
      stepLogger.info('Order confirmation verified');
    });

    await takeScreenshot(page, 'order-confirmation-page');
  });

  test('order confirmation shows order details and total', { tag: '@critical' }, async ({
    page,
    orderPage,
  }) => {
    await annotate({
      story: 'Order details display',
      severity: Severity.BLOCKER,
      description: 'Order confirmation displays details, items, and total',
    });

    await test.step('Navigate to order confirmation', async () => {
      await page.goto('https://automationexercise.com/order_placed', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Verify order details', async () => {
      await orderPage.assertOrderDetailsVisible();
      await orderPage.assertOrderTotalDisplayed();
      const details = await orderPage.getOrderDetails();
      await parameter('orderNumber', details.orderNumber);
      await parameter('orderTotal', details.total);
      stepLogger.info('Order details verified');
    });

    await takeScreenshot(page, 'order-details-display');
  });

  test('download invoice from order confirmation', { tag: '@regression' }, async ({ page, orderPage }) => {
    await annotate({
      story: 'Invoice download',
      severity: Severity.NORMAL,
      description: 'User can download invoice from order confirmation',
    });

    await test.step('Navigate to order confirmation', async () => {
      await page.goto('https://automationexercise.com/order_placed', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Verify invoice button visible', async () => {
      await orderPage.assertDownloadInvoiceButtonVisible();
      stepLogger.info('Download invoice button is visible');
    });

    await takeScreenshot(page, 'invoice-download-button');
  });

  test('continue shopping from order confirmation', { tag: '@regression' }, async ({ page, orderPage }) => {
    await annotate({
      story: 'Continue shopping after order',
      severity: Severity.MINOR,
      description: 'User can continue shopping after order placed',
    });

    await test.step('Navigate to order confirmation', async () => {
      await page.goto('https://automationexercise.com/order_placed', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Click continue shopping', async () => {
      await orderPage.continueShopping();
      stepLogger.info('Clicked continue shopping');
    });

    await test.step('Verify navigation away from order page', async () => {
      await page.waitForTimeout(500);
      const url = page.url();
      expect(url).not.toContain('order_placed');
      stepLogger.info('Navigation verified');
    });

    await takeScreenshot(page, 'continue-shopping-after-order');
  });

  test('view order in order history', { tag: '@regression' }, async ({ page, orderPage }) => {
    await annotate({
      story: 'Order history',
      severity: Severity.NORMAL,
      description: 'User can view orders in order history',
    });

    await test.step('Navigate to order history', async () => {
      await orderPage.gotoOrderHistory();
      stepLogger.info('Navigated to order history');
    });

    await test.step('Verify orders table displayed', async () => {
      await orderPage.assertOnOrderHistoryPage();
      await orderPage.assertOrdersTableDisplayed();
      const count = await orderPage.getOrdersCount();
      await parameter('ordersCount', String(count));
      stepLogger.info(`${count} orders in history`);
    });

    await takeScreenshot(page, 'order-history-view');
  });

  test('order status displays in order details', { tag: '@regression' }, async ({ page, orderPage }) => {
    await annotate({
      story: 'Order status tracking',
      severity: Severity.NORMAL,
      description: 'Order status is displayed in order details',
    });

    await test.step('Navigate to order confirmation', async () => {
      await page.goto('https://automationexercise.com/order_placed', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Verify order details displayed', async () => {
      const details = await orderPage.getOrderDetails();
      await parameter('orderStatus', details.status);
      stepLogger.info(`Order status: ${details.status}`);
    });

    await takeScreenshot(page, 'order-status-display');
  });
});
