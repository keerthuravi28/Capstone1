import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: CheckoutPage encapsulates the checkout flow and payment processing.
 * ABOUTME: Handles delivery address, payment details, and order confirmation.
 */
export class CheckoutPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  private readonly checkoutContainer = this.page.locator('[class*="checkout"], .container');
  private readonly deliveryAddressSection = this.page.locator('[class*="address"], text=/Delivery Address/i');
  private readonly reviewOrderSection = this.page.locator('[class*="review"], text=/Review Your Order/i');
  private readonly paymentSection = this.page.locator('[class*="payment"]');
  private readonly firstNameInput = this.page.locator('input[data-qa="first_name"], input[name="first_name"]');
  private readonly lastNameInput = this.page.locator('input[data-qa="last_name"], input[name="last_name"]');
  private readonly addressInput = this.page.locator('textarea[data-qa="address"], textarea[name="address"]');
  private readonly countrySelect = this.page.locator('select[data-qa="country"], select[name="country"]');
  private readonly stateInput = this.page.locator('input[data-qa="state"], input[name="state"]');
  private readonly cityInput = this.page.locator('input[data-qa="city"], input[name="city"]');
  private readonly zipcodeInput = this.page.locator('input[data-qa="zipcode"], input[name="zipcode"]');
  private readonly phoneInput = this.page.locator('input[data-qa="mobile_number"], input[name="mobile_number"]');
  private readonly placeOrderButton = this.page.locator('a[data-qa="pay-button"], button:has-text("Place Order")');
  private readonly commentTextarea = this.page.locator('textarea[name="comment"], textarea[data-qa="comment"]');
  private readonly cartItems = this.page.locator('tr[id*="product"]');
  private readonly orderTotal = this.page.locator('[class*="total"]');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/checkout');
    await this.waitForVisible(this.checkoutContainer);
    pageLogger.info('Checkout page loaded');
  }

  // ─── Delivery Address Actions ─────────────────────────────────────────────────

  async fillFirstName(firstName: string): Promise<void> {
    await this.fill(this.firstNameInput, firstName, 'First Name');
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.fill(this.lastNameInput, lastName, 'Last Name');
  }

  async fillAddress(address: string): Promise<void> {
    await this.fill(this.addressInput, address, 'Address');
  }

  async fillCity(city: string): Promise<void> {
    await this.fill(this.cityInput, city, 'City');
  }

  async fillState(state: string): Promise<void> {
    await this.fill(this.stateInput, state, 'State');
  }

  async fillZipcode(zipcode: string): Promise<void> {
    await this.fill(this.zipcodeInput, zipcode, 'Zipcode');
  }

  async fillPhoneNumber(phone: string): Promise<void> {
    await this.fill(this.phoneInput, phone, 'Phone Number');
  }

  async selectCountry(country: string): Promise<void> {
    await this.selectDropdown(this.countrySelect, country, 'Country');
  }

  async fillDeliveryAddress(addressData: {
    firstName: string;
    lastName: string;
    address: string;
    country: string;
    state: string;
    city: string;
    zipcode: string;
    phone: string;
  }): Promise<void> {
    await this.fillFirstName(addressData.firstName);
    await this.fillLastName(addressData.lastName);
    await this.fillAddress(addressData.address);
    await this.selectCountry(addressData.country);
    await this.fillState(addressData.state);
    await this.fillCity(addressData.city);
    await this.fillZipcode(addressData.zipcode);
    await this.fillPhoneNumber(addressData.phone);
    pageLogger.info('Delivery address filled');
  }

  // ─── Order Review Actions ─────────────────────────────────────────────────────

  async getOrderItemCount(): Promise<number> {
    return this.getCount(this.cartItems);
  }

  async getOrderTotal(): Promise<string> {
    return this.getText(this.orderTotal.last());
  }

  async addComments(comment: string): Promise<void> {
    await this.fill(this.commentTextarea, comment, 'Order Comments');
    pageLogger.info(`Added comment: ${comment}`);
  }

  async scrollToReviewOrder(): Promise<void> {
    await this.reviewOrderSection.scrollIntoViewIfNeeded();
    pageLogger.info('Scrolled to review order section');
  }

  // ─── Checkout Actions ────────────────────────────────────────────────────────

  async placeOrder(): Promise<void> {
    await this.click(this.placeOrderButton, 'Place Order button');
    pageLogger.info('Clicked place order button');
  }

  async proceedToPayment(): Promise<void> {
    await this.click(this.placeOrderButton, 'Proceed to Payment');
    pageLogger.info('Proceeded to payment');
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOnCheckoutPage(): Promise<void> {
    await this.assertUrl(/checkout/);
    pageLogger.info('Verified on checkout page');
  }

  async assertDeliveryAddressSectionVisible(): Promise<void> {
    await this.assertVisible(this.deliveryAddressSection, 'Delivery Address section should be visible');
  }

  async assertReviewOrderSectionVisible(): Promise<void> {
    await this.assertVisible(this.reviewOrderSection, 'Review Order section should be visible');
  }

  async assertPlaceOrderButtonVisible(): Promise<void> {
    await this.assertVisible(this.placeOrderButton, 'Place Order button should be visible');
  }

  async assertCartItemsDisplayed(expectedCount: number): Promise<void> {
    const actualCount = await this.getOrderItemCount();
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items in checkout, but found ${actualCount}`);
    }
    pageLogger.info(`Checkout verified with ${expectedCount} items`);
  }

  async assertAddressFieldsFilled(): Promise<void> {
    const firstNameValue = await this.getValue(this.firstNameInput);
    const lastNameValue = await this.getValue(this.lastNameInput);
    const addressValue = await this.getValue(this.addressInput);

    if (!firstNameValue || !lastNameValue || !addressValue) {
      throw new Error('Required address fields are not filled');
    }
    pageLogger.info('Address fields verified as filled');
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private async getValue(locator: any): Promise<string> {
    return locator.inputValue().catch(() => '');
  }
}
