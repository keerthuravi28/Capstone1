import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';

// ABOUTME: Test suite for product browsing, search, and cart operations.
// ABOUTME: Covers Requirement #2 - Product Search, Add/Remove Products from Cart.

const BASE_URL = 'https://automationexercise.com';

test.describe('Product Search & Cart Management', () => {

  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Product Search and Cart',
      owner: 'QA Team',
      layer: 'ui',
    });
    stepLogger.info(`Starting: ${testInfo.title}`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(page, `FAIL-${testInfo.title.replace(/\W+/g, '-')}`);
    }
  });

  // --- Product catalog ---

  test('products page loads with visible product cards', { tag: '@smoke' }, async ({ productsPage }) => {
    await annotate({ story: 'Product listing', severity: Severity.BLOCKER });

    await productsPage.goto();
    await productsPage.assertOnProductsPage();
    await productsPage.assertProductsVisible();

    const count = await productsPage.getVisibleProductCount();
    expect(count).toBeGreaterThan(0);
    stepLogger.info(`Found ${count} products on the page`);
  });

  test('search returns matching products', { tag: '@critical' }, async ({ productsPage }) => {
    await annotate({ story: 'Product search', severity: Severity.BLOCKER });

    await productsPage.goto();
    await productsPage.searchFor('Top');

    await productsPage.assertSearchResultsShown();
    const names = await productsPage.getProductNames();
    expect(names.length).toBeGreaterThan(0);

    // at least one result should contain the search term (case-insensitive)
    const hasMatch = names.some(n => n.toLowerCase().includes('top'));
    expect(hasMatch).toBeTruthy();
    stepLogger.info(`Search "Top" returned ${names.length} results`);
  });

  test('search for nonexistent product shows empty results', { tag: '@regression' }, async ({ productsPage }) => {
    await annotate({ story: 'Search edge case', severity: Severity.NORMAL });

    await productsPage.goto();
    await productsPage.searchFor('xyznonexistent12345');

    // site still shows "SEARCHED PRODUCTS" heading but with 0 product cards
    await productsPage.assertNoSearchResults();
  });

  test('category filter narrows product list', { tag: '@regression' }, async ({ page, productsPage }) => {
    await annotate({ story: 'Category filtering', severity: Severity.NORMAL });

    await productsPage.goto();
    const totalBefore = await productsPage.getVisibleProductCount();

    // expand "Women" and pick "Dress"
    await productsPage.expandCategory('Women');
    await productsPage.selectSubcategory('Dress');

    // page navigates to category URL
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    expect(url).toContain('category_products');

    stepLogger.info(`Filtered from ${totalBefore} total to category view`);
  });

  // --- Add to cart ---

  test('add a product to cart and verify it appears', { tag: ['@smoke', '@critical'] }, async ({
    productsPage,
    cartPage,
  }) => {
    await annotate({ story: 'Add to cart', severity: Severity.BLOCKER });

    await productsPage.goto();

    // grab the name of the first product before adding
    const productNames = await productsPage.getProductNames();
    const firstName = productNames[0];
    stepLogger.info(`Will add: "${firstName}"`);

    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    await cartPage.assertOnCartPage();
    await cartPage.assertCartHasItems(1);

    // verify the product we added is actually in the cart
    const cartProductName = await cartPage.getProductNameAtRow(0);
    expect(cartProductName.toLowerCase()).toContain(firstName.toLowerCase().substring(0, 5));
  });

  test('add product and continue shopping keeps you on products page', { tag: '@regression' }, async ({
    page,
    productsPage,
  }) => {
    await annotate({ story: 'Continue shopping flow', severity: Severity.NORMAL });

    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickContinueShopping();

    // should still be on products page
    expect(page.url()).toContain('/products');
    await productsPage.assertProductsVisible();
  });

  test('add multiple products to cart', { tag: '@critical' }, async ({ productsPage, cartPage }) => {
    await annotate({ story: 'Multiple cart items', severity: Severity.BLOCKER });

    await productsPage.goto();

    // add first product
    await productsPage.addProductByIndex(0);
    await productsPage.clickContinueShopping();

    // add second product
    await productsPage.addProductByIndex(1);
    await productsPage.clickViewCartFromModal();

    await cartPage.assertOnCartPage();
    const count = await cartPage.getItemCount();
    expect(count).toBe(2);
    stepLogger.info('Verified 2 items in cart');
  });

  // --- Remove from cart ---

  test('remove item from cart', { tag: '@regression' }, async ({ productsPage, cartPage }) => {
    await annotate({ story: 'Remove from cart', severity: Severity.NORMAL });

    // add something first
    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    await cartPage.assertCartHasItems(1);

    // now remove it
    await cartPage.removeItemAtRow(0);

    const empty = await cartPage.isCartEmpty();
    expect(empty).toBeTruthy();
    stepLogger.info('Item removed, cart is empty');
  });

  // --- Cart to checkout ---

  test('proceed to checkout from cart (logged out user gets login prompt)', { tag: '@critical' }, async ({
    productsPage,
    cartPage,
  }) => {
    await annotate({ story: 'Checkout initiation', severity: Severity.BLOCKER });

    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    await cartPage.proceedToCheckout();

    // without being logged in, site shows a modal asking to register/login
    const modalShown = await cartPage.isLoginModalShown();
    expect(modalShown).toBeTruthy();
    stepLogger.info('Login/register modal shown for guest checkout attempt');
  });

  test('cart page shows prices and totals for each item', { tag: '@regression' }, async ({
    productsPage,
    cartPage,
  }) => {
    await annotate({ story: 'Cart pricing', severity: Severity.NORMAL });

    await productsPage.goto();
    await productsPage.addFirstProductToCart();
    await productsPage.clickViewCartFromModal();

    const price = await cartPage.getPriceAtRow(0);
    const total = await cartPage.getTotalAtRow(0);
    const qty = await cartPage.getQuantityAtRow(0);

    // price format is "Rs. NNN"
    expect(price).toMatch(/Rs\.\s*\d+/);
    expect(total).toMatch(/Rs\.\s*\d+/);
    expect(qty).toBeTruthy();

    stepLogger.info(`Row 0: price=${price}, qty=${qty}, total=${total}`);
  });
});
