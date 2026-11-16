import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

// ABOUTME: Page object for the payment and order confirmation pages.
// ABOUTME: Handles card payment entry, order success verification, and invoice download.

export class OrderPage extends BasePage {

  // --- Payment page (shown after clicking "Place Order" on checkout) ---

  private readonly nameOnCardInput = this.page.locator('input[data-qa="name-on-card"]');
  private readonly cardNumberInput = this.page.locator('input[data-qa="card-number"]');
  private readonly cvcInput = this.page.locator('input[data-qa="cvc"]');
  private readonly expiryMonthInput = this.page.locator('input[data-qa="expiry-month"]');
  private readonly expiryYearInput = this.page.locator('input[data-qa="expiry-year"]');
  private readonly payConfirmBtn = this.page.locator('#submit, button[data-qa="pay-button"]');

  // --- Order confirmation page ---

  // the site redirects to /payment_done after successful payment
  private readonly orderConfirmTitle = this.page.locator('h2:has-text("Order Placed"), p:has-text("Congratulations")');
  private readonly orderPlacedMsg = this.page.locator('[data-qa="order-placed"]');
  private readonly downloadInvoiceBtn = this.page.locator('a:has-text("Download Invoice")');
  private readonly continueBtn = this.page.locator('a[data-qa="continue-button"]');

  constructor(page: Page) {
    super(page);
  }

  // fill the payment form with test card details
  async fillPaymentDetails(card: {
    nameOnCard: string;
    cardNumber: string;
    cvc: string;
    expiryMonth: string;
    expiryYear: string;
  }): Promise<void> {
    await this.fill(this.nameOnCardInput, card.nameOnCard, 'name on card');
    await this.fill(this.cardNumberInput, card.cardNumber, 'card number');
    await this.fill(this.cvcInput, card.cvc, 'CVC');
    await this.fill(this.expiryMonthInput, card.expiryMonth, 'expiry month');
    await this.fill(this.expiryYearInput, card.expiryYear, 'expiry year');
    pageLogger.info('Payment details filled');
  }

  async submitPayment(): Promise<void> {
    await this.click(this.payConfirmBtn, 'Pay and Confirm');
    // wait for redirect to confirmation page
    await this.page.waitForURL(/payment_done|order_placed/, { timeout: 20000 }).catch(() => {
      pageLogger.warn('Did not redirect to confirmation page after payment');
    });
    pageLogger.info('Payment submitted');
  }

  async fillAndSubmitPayment(card: {
    nameOnCard: string;
    cardNumber: string;
    cvc: string;
    expiryMonth: string;
    expiryYear: string;
  }): Promise<void> {
    await this.fillPaymentDetails(card);
    await this.submitPayment();
  }

  async downloadInvoice(): Promise<void> {
    // triggers a file download - playwright handles download events separately
    await this.downloadInvoiceBtn.click();
    pageLogger.info('Clicked Download Invoice');
  }

  async clickContinue(): Promise<void> {
    await this.click(this.continueBtn, 'Continue button');
  }

  // assertions

  async assertOrderPlaced(): Promise<void> {
    // try both possible success indicators
    const placed = this.page.locator('data-qa=order-placed');
    const congrats = this.page.locator('b:has-text("Order Placed!")');

    const isPlaced = await placed.isVisible().catch(() => false);
    const isCongrats = await congrats.isVisible().catch(() => false);

    if (!isPlaced && !isCongrats) {
      throw new Error('Order confirmation message not found on page');
    }
    pageLogger.info('Order placed successfully');
  }

  async assertOnPaymentPage(): Promise<void> {
    await this.assertUrl(/payment/);
  }

  async assertOnConfirmationPage(): Promise<void> {
    await this.assertUrl(/payment_done|order_placed/);
  }

  async assertDownloadInvoiceVisible(): Promise<void> {
    await this.assertVisible(this.downloadInvoiceBtn, 'Download Invoice button');
  }

  async assertContinueButtonVisible(): Promise<void> {
    await this.assertVisible(this.continueBtn, 'Continue button');
  }
}
