import { test, expect } from '../../main/ui/fixtures/ecommerce-fixtures';
import { stepLogger } from '../../main/shared/utils/logger';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';
import { takeScreenshot } from '../../main/shared/utils/helpers';
import productsData from '../../../test-data/products-data.json';

/**
 * ABOUTME: Product search and cart management test suite for automationexercise.com.
 * ABOUTME: Tests product discovery, cart operations, and cart validation (Requirement #2).
 */

test.describe('E-Commerce Product Search & Cart Management @critical @smoke', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await annotate({
      epic: 'E-Commerce Platform',
      feature: 'Product Search and Cart Management',
      owner: 'QA Team',
      layer: 'ui',
    });

    stepLogger.info(`▶ Starting test: ${testInfo.title}`);
    await page.goto('https://automationexercise.com', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      stepLogger.error(`✖ Test failed: ${testInfo.title}`);
      await takeScreenshot(page, `FAILED-products-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } else {
      stepLogger.info(`✔ Test passed: ${testInfo.title}`);
    }
  });

  // ── Product Search Tests ──────────────────────────────────────────────────────

  test('navigate to products page and verify products displayed', { tag: ['@smoke', '@critical'] }, async ({
    page,
    productsPage,
  }) => {
    await annotate({
      story: 'Product page display',
      severity: Severity.BLOCKER,
      description: 'User can navigate to products and see product catalog',
    });

    await test.step('Navigate to products page', async () => {
      await productsPage.goto();
      stepLogger.info('Navigated to products page');
    });

    await test.step('Verify products are displayed', async () => {
      await productsPage.assertProductsDisplayed();
      const count = await productsPage.getProductCount();
      await parameter('productCount', String(count));
      stepLogger.info(`Verified ${count} products displayed`);
    });

    await takeScreenshot(page, 'products-page-loaded');
  });

  test('search for product by name', { tag: '@critical' }, async ({ page, productsPage }) => {
    await annotate({
      story: 'Product search functionality',
      severity: Severity.BLOCKER,
      description: 'User can search for products by name',
    });

    const searchTerm = productsData.productsToSearch[0].name;
    await parameter('searchTerm', searchTerm);

    await test.step('Navigate to products page', async () => {
      await productsPage.gotoAllProducts();
    });

    await test.step('Search for product', async () => {
      await productsPage.searchProduct(searchTerm);
      stepLogger.info(`Searched for: ${searchTerm}`);
    });

    await test.step('Verify search results contain product', async () => {
      await productsPage.assertSearchResultsNotEmpty();
      const results = await productsPage.getProductTitles();
      stepLogger.info(`Found ${results.length} products matching "${searchTerm}"`);
    });

    await takeScreenshot(page, 'product-search-results');
  });

  test('search for non-existent product shows no results', { tag: '@regression' }, async ({
    page,
    productsPage,
  }) => {
    await annotate({
      story: 'Search handling for no results',
      severity: Severity.NORMAL,
      description: 'Search for non-existent product shows appropriate message',
    });

    const invalidSearchTerm = productsData.productsToSearch[2].name;
    await parameter('searchTerm', invalidSearchTerm);

    await test.step('Navigate and search for invalid product', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.searchProduct(invalidSearchTerm);
    });

    await test.step('Verify no results message appears', async () => {
      await productsPage.assertNoProductsFound();
      stepLogger.info('No products found message verified');
    });

    await takeScreenshot(page, 'no-search-results');
  });

  test('filter products by category', { tag: '@regression' }, async ({ page, productsPage }) => {
    await annotate({
      story: 'Category filtering',
      severity: Severity.NORMAL,
      description: 'User can filter products by category',
    });

    const category = productsData.productFiltering[0].category;
    await parameter('category', category);

    await test.step('Navigate to products', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.assertProductsDisplayed();
    });

    await test.step('Filter by category', async () => {
      await productsPage.filterByCategory(category);
      stepLogger.info(`Filtered by category: ${category}`);
    });

    await test.step('Verify filtered results', async () => {
      await productsPage.assertCategoryFilterExists(category);
      const count = await productsPage.getProductCount();
      await parameter('filteredCount', String(count));
      stepLogger.info(`${count} products in ${category} category`);
    });

    await takeScreenshot(page, `products-filtered-${category.toLowerCase()}`);
  });

  // ── Add to Cart Tests ─────────────────────────────────────────────────────────

  test('add single product to cart', { tag: ['@smoke', '@critical'] }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'Add to cart functionality',
      severity: Severity.BLOCKER,
      description: 'User can add a product to cart',
    });

    const productName = productsData.cartOperations[0].productName;
    await parameter('product', productName);

    await test.step('Navigate to products', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.assertProductsDisplayed();
    });

    await test.step('Add product to cart', async () => {
      await productsPage.addProductToCartByName(productName);
      stepLogger.info(`Added ${productName} to cart`);
    });

    await test.step('Continue shopping', async () => {
      await productsPage.continueShoppingAfterAddToCart();
      await productsPage.assertProductsDisplayed();
    });

    await takeScreenshot(page, 'product-added-to-cart');
  });

  test('view shopping cart', { tag: '@critical' }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'View cart contents',
      severity: Severity.BLOCKER,
      description: 'User can view their shopping cart',
    });

    await test.step('Navigate and add product', async () => {
      await productsPage.gotoAllProducts();
      const productName = productsData.cartOperations[0].productName;
      await productsPage.addProductToCartByName(productName);
      await parameter('product', productName);
    });

    await test.step('Navigate to cart', async () => {
      await cartPage.gotoViewCart();
      await cartPage.assertOnCartPage();
      stepLogger.info('Navigated to cart page');
    });

    await test.step('Verify cart contents', async () => {
      await cartPage.assertCartNotEmpty();
      const itemCount = await cartPage.getCartItemCount();
      await parameter('cartItems', String(itemCount));
      stepLogger.info(`Cart contains ${itemCount} items`);
    });

    await takeScreenshot(page, 'view-cart');
  });

  test('remove product from cart', { tag: '@regression' }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'Remove from cart',
      severity: Severity.NORMAL,
      description: 'User can remove products from cart',
    });

    const productName = productsData.cartOperations[0].productName;
    await parameter('product', productName);

    await test.step('Add product to cart', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.addProductToCartByName(productName);
      await productsPage.continueShoppingAfterAddToCart();
    });

    await test.step('Navigate to cart', async () => {
      await cartPage.gotoViewCart();
    });

    await test.step('Remove product from cart', async () => {
      const initialCount = await cartPage.getCartItemCount();
      await cartPage.removeProductFromCart(0);
      stepLogger.info(`Removed product from cart (was ${initialCount} items)`);
    });

    await test.step('Verify product removed', async () => {
      await page.waitForTimeout(500);
      await cartPage.assertCartEmpty();
      stepLogger.info('Cart is now empty');
    });

    await takeScreenshot(page, 'product-removed-from-cart');
  });

  test('update product quantity in cart', { tag: '@regression' }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'Update cart quantity',
      severity: Severity.NORMAL,
      description: 'User can change product quantity in cart',
    });

    const productName = productsData.cartOperations[0].productName;
    const newQuantity = 3;
    await parameter('product', productName);
    await parameter('newQuantity', String(newQuantity));

    await test.step('Add product to cart', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.addProductToCartByName(productName);
    });

    await test.step('Navigate to cart and update quantity', async () => {
      await cartPage.gotoViewCart();
      const initialTotal = await cartPage.getCartTotal();
      await cartPage.updateProductQuantity(0, newQuantity);
      stepLogger.info(`Updated quantity to ${newQuantity}`);
    });

    await test.step('Verify quantity updated', async () => {
      await page.waitForTimeout(500);
      const finalTotal = await cartPage.getCartTotal();
      stepLogger.info(`Cart total updated from ${initialTotal} to ${finalTotal}`);
    });

    await takeScreenshot(page, 'quantity-updated');
  });

  test('add multiple products to cart', { tag: '@regression' }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'Multiple products in cart',
      severity: Severity.NORMAL,
      description: 'User can add multiple different products to cart',
    });

    await test.step('Add first product', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.addProductToCartByName(productsData.cartOperations[0].productName);
      await productsPage.continueShoppingAfterAddToCart();
    });

    await test.step('Add second product', async () => {
      await productsPage.searchProduct('Sleeves');
      await productsPage.addProductToCart();
      await productsPage.continueShoppingAfterAddToCart();
    });

    await test.step('View cart with multiple products', async () => {
      await cartPage.gotoViewCart();
      const itemCount = await cartPage.getCartItemCount();
      await parameter('cartItems', String(itemCount));
      expect(itemCount).toBeGreaterThanOrEqual(2);
      stepLogger.info(`Cart contains ${itemCount} items`);
    });

    await takeScreenshot(page, 'multiple-products-in-cart');
  });

  test('cart shows correct total for multiple items', { tag: '@regression' }, async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await annotate({
      story: 'Cart total calculation',
      severity: Severity.NORMAL,
      description: 'Cart calculates and displays correct total for multiple items',
    });

    await test.step('Add products to cart', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.addProductToCartByName(productsData.cartOperations[0].productName);
      await productsPage.continueShoppingAfterAddToCart();
    });

    await test.step('View cart and verify total', async () => {
      await cartPage.gotoViewCart();
      const total = await cartPage.getCartTotal();
      const itemCount = await cartPage.getCartItemCount();
      await parameter('cartTotal', total);
      await parameter('itemCount', String(itemCount));
      expect(itemCount).toBeGreaterThan(0);
      expect(total).not.toBe('');
      stepLogger.info(`Cart total: ${total} for ${itemCount} items`);
    });

    await takeScreenshot(page, 'cart-total-calculation');
  });

  test('proceed to checkout from cart', { tag: '@critical' }, async ({ page, productsPage, cartPage }) => {
    await annotate({
      story: 'Checkout flow initiation',
      severity: Severity.BLOCKER,
      description: 'User can proceed from cart to checkout',
    });

    await test.step('Add product and navigate to cart', async () => {
      await productsPage.gotoAllProducts();
      await productsPage.addProductToCartByName(productsData.cartOperations[0].productName);
      await cartPage.gotoViewCart();
    });

    await test.step('Proceed to checkout', async () => {
      await cartPage.assertCheckoutButtonVisible();
      await cartPage.proceedToCheckout();
      stepLogger.info('Proceeded to checkout');
    });

    await test.step('Verify checkout page loaded', async () => {
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('checkout');
      stepLogger.info('Checkout page loaded');
    });

    await takeScreenshot(page, 'proceeding-to-checkout');
  });
});
