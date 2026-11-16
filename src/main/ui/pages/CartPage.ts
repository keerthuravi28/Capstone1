import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: CartPage encapsulates shopping cart operations and management.
 * ABOUTME: Handles viewing cart, removing items, updating quantities, and checkout.
 */
export class CartPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  private readonly cartItems = this.page.locator('tr[id*="product"]');
  private readonly cartTable = this.page.locator('table[class*="cart"]');
  private readonly productInCart = this.page.locator('td[class*="cart_product"]');
  private readonly productPrice = this.page.locator('td[class*="cart_price"]');
  private readonly productQuantity = this.page.locator('input[class*="cart_quantity"], input[name="quantity"]');
  private readonly removeButton = this.page.locator('a[class*="remove"], button:has-text("Remove")');
  private readonly updateQuantityButton = this.page.locator('a[class*="update"]');
  private readonly cartSubtotal = this.page.locator('[class*="cart_total"], td:has-text("Cart Total")');
  private readonly proceedCheckoutButton = this.page.locator('a:has-text("Proceed To Checkout"), button:has-text("Checkout")');
  private readonly emptyCartMessage = this.page.locator('text=/Your cart is empty|Cart is empty/i');
  private readonly continueShopping = this.page.locator('a:has-text("Continue Shopping")');
  private readonly cartTotal = this.page.locator('h4:has-text("Cart Total"), [class*="grand_total"]');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/cart');
    await this.page.waitForTimeout(1000); // Wait for cart to load
    pageLogger.info('Cart page loaded');
  }

  async gotoViewCart(): Promise<void> {
    await this.navigate('/view_cart');
    pageLogger.info('Navigated to view cart');
  }

  // ─── Cart View Actions ────────────────────────────────────────────────────────

  async getCartItemCount(): Promise<number> {
    return this.getCount(this.cartItems);
  }

  async getProductsInCart(): Promise<string[]> {
    const products = await this.productInCart.all();
    const productList: string[] = [];
    for (const product of products) {
      productList.push(await this.getText(product));
    }
    return productList;
  }

  async getCartTotal(): Promise<string> {
    return this.getText(this.cartTotal);
  }

  async getProductPrice(index: number): Promise<string> {
    const price = this.productPrice.nth(index);
    return this.getText(price);
  }

  // ─── Cart Modification Actions ────────────────────────────────────────────────

  async updateProductQuantity(index: number, quantity: number): Promise<void> {
    const quantityInput = this.productQuantity.nth(index);
    await this.fill(quantityInput, String(quantity), `Product ${index} quantity`);
    pageLogger.info(`Updated product quantity to ${quantity}`);
  }

  async removeProductFromCart(index: number): Promise<void> {
    const removeBtn = this.removeButton.nth(index);
    await this.click(removeBtn, `Remove product at index ${index}`);
    pageLogger.info(`Removed product at index ${index} from cart`);
  }

  async removeProductByName(productName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${productName}")`);
    const removeBtn = row.locator('a[class*="remove"]');
    await this.click(removeBtn, `Remove ${productName}`);
    pageLogger.info(`Removed ${productName} from cart`);
  }

  async updateCartQuantities(): Promise<void> {
    // Find and click all update quantity buttons
    const updateButtons = await this.updateQuantityButton.all();
    for (const button of updateButtons) {
      await this.click(button, 'Update quantity');
    }
    pageLogger.info('Updated all cart quantities');
  }

  // ─── Checkout Actions ────────────────────────────────────────────────────────

  async proceedToCheckout(): Promise<void> {
    await this.click(this.proceedCheckoutButton, 'Proceed To Checkout button');
    pageLogger.info('Clicked proceed to checkout');
  }

  async continueShopping(): Promise<void> {
    await this.click(this.continueShopping, 'Continue Shopping link');
    pageLogger.info('Clicked continue shopping');
  }

  // ─── Getters for Assertions ──────────────────────────────────────────────────

  async isCartEmpty(): Promise<boolean> {
    const emptyMsg = await this.isVisible(this.emptyCartMessage, 1000);
    return emptyMsg;
  }

  async getSubtotal(): Promise<string> {
    const subtotalElement = this.page.locator('[class*="subtotal"], td:contains("Subtotal")');
    return this.getText(subtotalElement);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertCartNotEmpty(): Promise<void> {
    const isEmpty = await this.isCartEmpty();
    if (isEmpty) {
      throw new Error('Cart is empty but was expected to have items');
    }
    pageLogger.info('Cart verified as not empty');
  }

  async assertCartEmpty(): Promise<void> {
    await this.assertVisible(this.emptyCartMessage, 'Cart should be empty');
  }

  async assertProductInCart(productName: string): Promise<void> {
    const product = this.page.locator(`text=${productName}`);
    await this.assertVisible(product, `Product ${productName} should be in cart`);
  }

  async assertProductNotInCart(productName: string): Promise<void> {
    const product = this.page.locator(`text=${productName}`);
    const visible = await this.isVisible(product, 2000);
    if (visible) {
      throw new Error(`Product ${productName} should not be in cart`);
    }
    pageLogger.info(`Product ${productName} not in cart (as expected)`);
  }

  async assertCheckoutButtonVisible(): Promise<void> {
    await this.assertVisible(this.proceedCheckoutButton, 'Checkout button should be visible');
  }

  async assertOnCartPage(): Promise<void> {
    await this.assertUrl(/cart|view_cart/);
    pageLogger.info('Verified on cart page');
  }

  async assertCartItemsCount(expectedCount: number): Promise<void> {
    const actualCount = await this.getCartItemCount();
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items in cart, but found ${actualCount}`);
    }
    pageLogger.info(`Cart has expected count: ${expectedCount}`);
  }

  async assertTotalUpdated(previousTotal: string, newTotal: string): Promise<void> {
    if (previousTotal === newTotal) {
      throw new Error('Total should have updated but remains the same');
    }
    pageLogger.info(`Cart total updated from ${previousTotal} to ${newTotal}`);
  }
}
