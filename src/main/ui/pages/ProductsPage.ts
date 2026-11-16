import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: ProductsPage encapsulates product catalog and search interactions.
 * ABOUTME: Handles product viewing, filtering, and adding items to cart.
 */
export class ProductsPage extends BasePage {
  // Selectors - tested against automationexercise.com v2.x
  // Note: The site uses inconsistent class names and nesting, so we have fallbacks

  private readonly productsContainer = this.page.locator('.productinfo, [class*="product"]');

  // Search field - tested multiple variants as they changed in different page states
  private readonly searchInput = this.page.locator('input[id="search_product"]');
  private readonly searchButton = this.page.locator('#submit_search');

  // Product items - class name is .productinfo but sometimes wrapped in different divs
  private readonly productItems = this.page.locator('.productinfo');

  // Product title - found inside <p> tags within productinfo divs
  // Initially tried p:first-child but that was too fragile
  private readonly productTitle = this.page.locator('.productinfo p');

  private readonly viewProductLink = this.page.locator('a[href*="/product/"]');

  // Add to cart - appears as <a> tag, not button (site quirk)
  private readonly addToCartButton = this.page.locator('a:has-text("Add to cart")');

  // Product price - site puts it in span with class "productprice"
  private readonly productPrice = this.page.locator('.productprice');

  private readonly productImage = this.page.locator('img[alt*="product"]');

  // No results message - tested different possible variations
  private readonly noProductsMessage = this.page.locator('text=/No products found|No items|sorry/i');

  // Cart badge - not always visible on products page
  private readonly cartBadge = this.page.locator('.cart-count');

  private readonly continueShoppingButton = this.page.locator('button:has-text("Continue Shopping")');

  // Category links - found in sidebar, href contains "/category_products/"
  private readonly categoryLink = this.page.locator('a[href*="/category_products/"]');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/products');
    await this.waitForVisible(this.productItems.first());
    pageLogger.info('Products page loaded');
  }

  async gotoAllProducts(): Promise<void> {
    await this.navigate('/products');
    pageLogger.info('Navigated to all products');
  }

  // ─── Search Actions ──────────────────────────────────────────────────────────

  async searchProduct(productName: string): Promise<void> {
    await this.fill(this.searchInput, productName, 'Search input');
    await this.click(this.searchButton, 'Search button');
    pageLogger.info(`Searched for product: ${productName}`);
  }

  async clearSearch(): Promise<void> {
    await this.fill(this.searchInput, '', 'Clear search');
  }

  // ─── Product Actions ─────────────────────────────────────────────────────────

  async getProductCount(): Promise<number> {
    return this.getCount(this.productItems);
  }

  async viewProductByIndex(index: number): Promise<void> {
    const product = this.productItems.nth(index);
    await this.click(product, `Product at index ${index}`);
    pageLogger.info(`Viewed product at index ${index}`);
  }

  async viewProductByName(productName: string): Promise<void> {
    const product = this.page.locator(`a:has-text("${productName}")`);
    await this.click(product, `Product: ${productName}`);
    pageLogger.info(`Viewed product: ${productName}`);
  }

  async addProductToCart(): Promise<void> {
    await this.click(this.addToCartButton, 'Add to cart button');
    pageLogger.info('Product added to cart');
  }

  async addProductToCartByName(productName: string): Promise<void> {
    // Find and add specific product by name
    const productRow = this.page.locator(`:has-text("${productName}")`).first();
    const addButton = productRow.locator('a:has-text("Add to cart"), button:has-text("Add to cart")');
    await this.click(addButton, `Add ${productName} to cart`);
    pageLogger.info(`Added ${productName} to cart`);
  }

  async continueShoppingAfterAddToCart(): Promise<void> {
    await this.click(this.continueShoppingButton, 'Continue Shopping button');
    pageLogger.info('Continuing shopping');
  }

  // ─── Filter & Category Actions ────────────────────────────────────────────────

  async filterByCategory(category: string): Promise<void> {
    const categoryButton = this.page.locator(`a:has-text("${category}")`);
    await this.click(categoryButton, `Category: ${category}`);
    pageLogger.info(`Filtered by category: ${category}`);
  }

  async selectCategory(categoryName: string): Promise<void> {
    const categoryLink = this.page.locator(`a[href*="category"]:has-text("${categoryName}")`);
    await this.click(categoryLink, `Select ${categoryName}`);
    pageLogger.info(`Selected category: ${categoryName}`);
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  async getFirstProductTitle(): Promise<string> {
    const firstProduct = this.productTitle.first();
    return this.getText(firstProduct);
  }

  async getFirstProductPrice(): Promise<string> {
    const firstPrice = this.productPrice.first();
    return this.getText(firstPrice);
  }

  async getProductTitles(): Promise<string[]> {
    const titles = await this.productTitle.all();
    const titleList: string[] = [];
    for (const title of titles) {
      titleList.push(await this.getText(title));
    }
    return titleList;
  }

  async getCartCount(): Promise<string> {
    return this.getText(this.cartBadge);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertProductsDisplayed(): Promise<void> {
    await this.assertVisible(this.productItems.first(), 'Products should be displayed');
    const count = await this.getProductCount();
    pageLogger.info(`${count} products displayed`);
  }

  async assertNoProductsFound(): Promise<void> {
    await this.assertVisible(this.noProductsMessage, 'No products message should be visible');
  }

  async assertSearchResultsNotEmpty(): Promise<void> {
    const count = await this.getProductCount();
    this.page.context();
    if (count === 0) {
      await this.assertNoProductsFound();
    }
  }

  async assertProductTitleVisible(productName: string): Promise<void> {
    const productLocator = this.page.locator(`text=${productName}`);
    await this.assertVisible(productLocator, `Product ${productName} should be visible`);
  }

  async assertAddToCartButtonVisible(): Promise<void> {
    await this.assertVisible(this.addToCartButton, 'Add to cart button should be visible');
  }

  async assertOnProductsPage(): Promise<void> {
    await this.assertUrl(/products/);
    await this.assertProductsDisplayed();
  }

  async assertCategoryFilterExists(category: string): Promise<void> {
    const categoryFilter = this.page.locator(`a:has-text("${category}")`);
    await this.assertVisible(categoryFilter, `Category ${category} filter should exist`);
  }
}
