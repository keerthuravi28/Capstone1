import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

// ABOUTME: Page object for the shopping cart on automationexercise.com.
// ABOUTME: Handles viewing, updating, and removing cart items plus checkout navigation.

export class CartPage extends BasePage {

  // table rows - each product row has id="product-{n}"
  private readonly cartRows = this.page.locator('tr[id^="product-"]');
  private readonly cartTable = this.page.locator('#cart_info_table, #cart_info table');

  // individual cell selectors within a row
  private readonly productDescriptions = this.page.locator('td.cart_description');
  private readonly productPrices = this.page.locator('td.cart_price p');
  private readonly productQuantities = this.page.locator('td.cart_quantity button');
  private readonly productTotals = this.page.locator('td.cart_total p.cart_total_price');

  // the X button is in the last column of each product row
  private readonly removeButtons = this.page.locator('td.cart_delete a, .cart_quantity_delete a, a.cart_quantity_delete');

  private readonly proceedToCheckoutBtn = this.page.locator('a.check_out, a:has-text("Proceed To Checkout")');
  private readonly emptyCartMsg = this.page.locator('#empty_cart, b:has-text("Cart is empty"), p:has-text("empty")');

  // the "register/login" modal that shows if you try to checkout without being logged in
  private readonly loginModal = this.page.locator('#checkoutModal');
  private readonly registerLoginLink = this.page.locator('#checkoutModal a[href="/login"]');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/view_cart');
    // table might take a sec to populate
    await this.page.waitForLoadState('networkidle').catch(() => {});
    pageLogger.info('Cart page loaded');
  }

  async getItemCount(): Promise<number> {
    // rows include header - count only data rows
    const rows = await this.cartRows.count();
    return rows;
  }

  async getProductNameAtRow(idx: number): Promise<string> {
    const desc = this.productDescriptions.nth(idx);
    // product name is in an <h4><a> inside the description cell
    const nameLink = desc.locator('h4 a, a').first();
    return (await nameLink.innerText()).trim();
  }

  async getPriceAtRow(idx: number): Promise<string> {
    return (await this.productPrices.nth(idx).innerText()).trim();
  }

  async getQuantityAtRow(idx: number): Promise<string> {
    return (await this.productQuantities.nth(idx).innerText()).trim();
  }

  async getTotalAtRow(idx: number): Promise<string> {
    return (await this.productTotals.nth(idx).innerText()).trim();
  }

  async removeItemAtRow(idx: number): Promise<void> {
    // the delete button uses a font-icon <a> that Playwright's accessibility tree
    // can't see, so we use JS to find and click it in the browser DOM directly
    const clicked = await this.page.evaluate((rowIdx) => {
      const rows = document.querySelectorAll('tr[id^="product-"]');
      if (!rows[rowIdx]) return false;
      const el = rows[rowIdx].querySelector('.cart_quantity_delete a') ||
                 rows[rowIdx].querySelector('a.cart_quantity_delete') ||
                 rows[rowIdx].querySelector('.cart_delete a') ||
                 rows[rowIdx].querySelector('td:last-child a');
      if (el) { (el as HTMLElement).click(); return true; }
      // last resort: click the last cell itself
      const cells = rows[rowIdx].querySelectorAll('td');
      const last = cells[cells.length - 1];
      if (last) { (last as HTMLElement).click(); return true; }
      return false;
    }, idx);
    if (!clicked) pageLogger.warn(`Could not find delete button for row ${idx}`);
    // row disappears with fade animation
    await this.page.waitForTimeout(1500);
    pageLogger.info(`Removed item at row ${idx}`);
  }

  async removeItemByName(productName: string): Promise<void> {
    const row = this.page.locator(`tr:has(a:has-text("${productName}"))`);
    const removeBtn = row.locator('td.cart_delete a, .cart_quantity_delete a, a.cart_quantity_delete');
    const count = await removeBtn.count();
    if (count > 0) {
      await removeBtn.first().click();
    } else {
      await row.locator('td').last().click();
    }
    await this.page.waitForTimeout(800);
    pageLogger.info(`Removed "${productName}" from cart`);
  }

  async proceedToCheckout(): Promise<void> {
    await this.click(this.proceedToCheckoutBtn, 'Proceed To Checkout');
  }

  // if not logged in, site shows a modal instead of going to checkout
  async isLoginModalShown(): Promise<boolean> {
    try {
      await this.loginModal.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickRegisterLoginFromModal(): Promise<void> {
    await this.registerLoginLink.click();
  }

  async isCartEmpty(): Promise<boolean> {
    // wait briefly for any row animation to finish
    await this.page.waitForTimeout(500);
    const emptyVisible = await this.emptyCartMsg.isVisible().catch(() => false);
    if (emptyVisible) return true;
    // also check if there are simply no product rows
    const rowCount = await this.cartRows.count();
    return rowCount === 0;
  }

  // assertions

  async assertCartHasItems(expectedMin: number = 1): Promise<void> {
    const count = await this.getItemCount();
    if (count < expectedMin) {
      throw new Error(`Expected at least ${expectedMin} cart items, got ${count}`);
    }
  }

  async assertCartIsEmpty(): Promise<void> {
    const empty = await this.isCartEmpty();
    if (!empty) throw new Error('Expected cart to be empty but it has items');
  }

  async assertProductInCart(productName: string): Promise<void> {
    const productLink = this.page.locator(`#cart_info_table a:has-text("${productName}")`);
    await this.assertVisible(productLink, `"${productName}" in cart`);
  }

  async assertCheckoutButtonVisible(): Promise<void> {
    await this.assertVisible(this.proceedToCheckoutBtn, 'Proceed To Checkout button');
  }

  async assertOnCartPage(): Promise<void> {
    await this.assertUrl(/view_cart/);
  }
}
