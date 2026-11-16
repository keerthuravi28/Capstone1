import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

// ABOUTME: Page object for the checkout flow on automationexercise.com.
// ABOUTME: Covers address verification, order review, comment entry, and payment.

export class CheckoutPage extends BasePage {

  // checkout page has two main sections: address details and order review
  private readonly addressDetails = this.page.locator('#address_delivery');
  private readonly billingAddress = this.page.locator('#address_invoice');
  private readonly orderReviewTable = this.page.locator('#cart_info');

  // address fields are read-only on checkout - they come from the account profile
  // so we just read them to verify, not fill them
  private readonly deliveryFirstName = this.page.locator('#address_delivery .address_firstname');
  private readonly deliveryLastName = this.page.locator('#address_delivery .address_lastname');
  private readonly deliveryAddress1 = this.page.locator('#address_delivery .address_address1').nth(1);
  private readonly deliveryCity = this.page.locator('#address_delivery .address_city');
  private readonly deliveryCountry = this.page.locator('#address_delivery .address_country_name');
  private readonly deliveryPhone = this.page.locator('#address_delivery .address_phone');

  // order items in the review table
  private readonly orderRows = this.page.locator('#cart_info tbody tr');
  private readonly orderTotal = this.page.locator('#cart_info .cart_total_price').last();

  // comment box and place order button
  private readonly commentBox = this.page.locator('textarea[name="message"]');
  private readonly placeOrderBtn = this.page.locator('a:has-text("Place Order")');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/checkout');
    await this.page.waitForLoadState('domcontentloaded');
    pageLogger.info('Checkout page loaded');
  }

  // read delivery address fields
  async getDeliveryName(): Promise<string> {
    const first = await this.deliveryFirstName.innerText().catch(() => '');
    const last = await this.deliveryLastName.innerText().catch(() => '');
    return `${first} ${last}`.trim();
  }

  async getDeliveryAddress(): Promise<string> {
    return (await this.deliveryAddress1.innerText().catch(() => '')).trim();
  }

  async getDeliveryCity(): Promise<string> {
    return (await this.deliveryCity.innerText().catch(() => '')).trim();
  }

  async getDeliveryCountry(): Promise<string> {
    return (await this.deliveryCountry.innerText().catch(() => '')).trim();
  }

  async getDeliveryPhone(): Promise<string> {
    return (await this.deliveryPhone.innerText().catch(() => '')).trim();
  }

  async getOrderItemCount(): Promise<number> {
    return this.orderRows.count();
  }

  async getOrderTotalText(): Promise<string> {
    return (await this.orderTotal.innerText()).trim();
  }

  async enterComment(comment: string): Promise<void> {
    await this.fill(this.commentBox, comment, 'order comment');
    pageLogger.info(`Added comment: "${comment}"`);
  }

  async clickPlaceOrder(): Promise<void> {
    await this.click(this.placeOrderBtn, 'Place Order');
    pageLogger.info('Clicked Place Order');
  }

  // assertions

  async assertOnCheckoutPage(): Promise<void> {
    await this.assertUrl(/checkout/);
  }

  async assertDeliveryAddressVisible(): Promise<void> {
    await this.assertVisible(this.addressDetails, 'delivery address section');
  }

  async assertBillingAddressVisible(): Promise<void> {
    await this.assertVisible(this.billingAddress, 'billing address section');
  }

  async assertOrderReviewVisible(): Promise<void> {
    await this.assertVisible(this.orderReviewTable, 'order review table');
  }

  async assertPlaceOrderButtonVisible(): Promise<void> {
    await this.assertVisible(this.placeOrderBtn, 'Place Order button');
  }

  async assertDeliveryNameContains(expectedName: string): Promise<void> {
    const actual = await this.getDeliveryName();
    if (!actual.includes(expectedName)) {
      throw new Error(`Delivery name "${actual}" doesn't contain "${expectedName}"`);
    }
  }
}
