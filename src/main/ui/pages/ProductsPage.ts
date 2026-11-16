import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

// ABOUTME: Page object for the products catalog and search on automationexercise.com.
// ABOUTME: Covers product listing, search, category filtering, and add-to-cart actions.

export class ProductsPage extends BasePage {

  // search field id is "search_product" - confirmed via devtools
  private readonly searchInput = this.page.locator('input#search_product');
  private readonly searchBtn = this.page.locator('#submit_search');

  // .productinfo wraps each product card - price + name + overlay with "Add to cart"
  private readonly productCards = this.page.locator('.productinfo');

  // product names live in <p> inside .productinfo
  private readonly productNames = this.page.locator('.productinfo p');

  private readonly viewProductLinks = this.page.locator('a[href*="/product_details/"]');

  // each product card has TWO "Add to cart" links: one in .productinfo (visible),
  // one in .product-overlay (shown on hover). Scope to .productinfo to avoid duplicates.
  private readonly addToCartBtns = this.page.locator('.productinfo a.add-to-cart');

  private readonly prices = this.page.locator('.productinfo h2');

  // the site shows "SEARCHED PRODUCTS" heading when search returns results,
  // but no explicit "no results" text - just an empty container
  private readonly searchedProductsHeading = this.page.locator('h2:has-text("Searched Products")');

  // modal that pops up after adding to cart - has class "modal" and shows "Added!"
  private readonly addedModal = this.page.locator('.modal-dialog:has-text("Added")');
  private readonly continueShoppingBtn = this.page.locator('.modal-dialog button:has-text("Continue Shopping")');
  private readonly viewCartLink = this.page.locator('.modal-dialog a:has-text("View Cart")');

  // sidebar category links
  private readonly categoryPanel = this.page.locator('#accordian');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.navigate('/products');
      try {
        await this.productCards.first().waitFor({ state: 'visible', timeout: 15000 });
        pageLogger.info('Products page loaded');
        return;
      } catch {
        pageLogger.warn(`Products page attempt ${attempt}/3 — content not visible, reloading`);
        if (attempt < 3) await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    }
    await this.productCards.first().waitFor({ state: 'visible', timeout: 30000 });
    pageLogger.info('Products page loaded');
  }

  async searchFor(term: string): Promise<void> {
    await this.fill(this.searchInput, term, 'search box');
    await this.click(this.searchBtn, 'search button');
    // page reloads with results - wait for heading
    await this.searchedProductsHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      pageLogger.warn(`Search heading didn't appear for term: ${term}`);
    });
    pageLogger.info(`Searched for: ${term}`);
  }

  async clearSearchField(): Promise<void> {
    await this.searchInput.clear();
  }

  async getVisibleProductCount(): Promise<number> {
    return this.productCards.count();
  }

  async getProductNames(): Promise<string[]> {
    const names: string[] = [];
    const count = await this.productNames.count();
    for (let i = 0; i < count; i++) {
      const text = await this.productNames.nth(i).innerText();
      if (text.trim()) names.push(text.trim());
    }
    return names;
  }

  // each product wrapper has an "Add to cart" link below the product image.
  // use evaluate to trigger DOM .click() directly - bypasses viewport/overlay
  // issues from ads AND fires jQuery event handlers that dispatchEvent misses.
  async addFirstProductToCart(): Promise<void> {
    const btn = this.addToCartBtns.first();
    await btn.waitFor({ state: 'attached', timeout: 15000 });
    await btn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);
    pageLogger.info('Added first product to cart');
  }

  async addProductByIndex(idx: number): Promise<void> {
    const btn = this.addToCartBtns.nth(idx);
    await btn.waitFor({ state: 'attached', timeout: 15000 });
    await btn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(1000);
    pageLogger.info(`Added product at index ${idx}`);
  }

  // after adding, a modal pops up - but it's flaky on this site (ads, slow AJAX).
  // if it doesn't show, fall back to direct navigation.
  async clickContinueShopping(): Promise<void> {
    try {
      await this.addedModal.waitFor({ state: 'visible', timeout: 5000 });
      await this.click(this.continueShoppingBtn, 'Continue Shopping');
      await this.addedModal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    } catch {
      pageLogger.info('Modal did not appear, staying on products page');
    }
  }

  async clickViewCartFromModal(): Promise<void> {
    try {
      await this.addedModal.waitFor({ state: 'visible', timeout: 5000 });
      await this.click(this.viewCartLink, 'View Cart link in modal');
    } catch {
      pageLogger.info('Modal did not appear, navigating to cart directly');
      await this.navigate('/view_cart');
    }
  }

  async viewProductDetails(idx: number): Promise<void> {
    await this.viewProductLinks.nth(idx).click();
    pageLogger.info(`Opened product details for item ${idx}`);
  }

  // expand a top-level category (Women, Men, Kids) in the sidebar accordion
  async expandCategory(categoryName: string): Promise<void> {
    const categoryHeader = this.categoryPanel.locator(`a:has-text("${categoryName}")`).first();
    await categoryHeader.click();
    // accordion animation takes a moment
    await this.page.waitForTimeout(500);
    pageLogger.info(`Expanded category: ${categoryName}`);
  }

  // click a subcategory link (e.g. "Dress", "Tops" under "Women")
  // subcategory names can repeat across categories (e.g. Women>Dress and Kids>Dress),
  // so grab the first visible match since only the expanded panel is shown
  async selectSubcategory(subcategoryName: string): Promise<void> {
    const link = this.categoryPanel.locator(`a:has-text("${subcategoryName}")`).first();
    await link.click();
    pageLogger.info(`Selected subcategory: ${subcategoryName}`);
  }

  async getFirstProductPrice(): Promise<string> {
    return (await this.prices.first().innerText()).trim();
  }

  // assertions

  async assertProductsVisible(): Promise<void> {
    const count = await this.getVisibleProductCount();
    if (count === 0) throw new Error('Expected products to be visible but found none');
    pageLogger.info(`${count} products visible on page`);
  }

  async assertSearchResultsShown(): Promise<void> {
    await this.assertVisible(this.searchedProductsHeading, 'Searched Products heading');
  }

  async assertNoSearchResults(): Promise<void> {
    // site doesn't show "no results" text explicitly, just an empty product list
    await this.assertSearchResultsShown();
    const count = await this.getVisibleProductCount();
    if (count > 0) throw new Error(`Expected 0 results but found ${count}`);
  }

  async assertOnProductsPage(): Promise<void> {
    await this.assertUrl(/\/products/);
  }
}
