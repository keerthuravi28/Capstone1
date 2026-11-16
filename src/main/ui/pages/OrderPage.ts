import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { pageLogger } from '../../shared/utils/logger';

/**
 * ABOUTME: OrderPage encapsulates order confirmation and order details viewing.
 * ABOUTME: Handles order verification, tracking, and order history.
 */
export class OrderPage extends BasePage {
  // ─── Selectors ───────────────────────────────────────────────────────────────

  private readonly orderConfirmationMessage = this.page.locator('text=/Order Placed Successfully|Your order has been placed|Congratulations/i');
  private readonly orderNumber = this.page.locator('[class*="order-number"], text=/Order #|Order Number/i');
  private readonly orderDetailsSection = this.page.locator('[class*="order-details"], .container');
  private readonly orderItems = this.page.locator('tr[class*="order-item"]');
  private readonly orderTotal = this.page.locator('[class*="order-total"]');
  private readonly downloadInvoiceButton = this.page.locator('a:has-text("Download Invoice")');
  private readonly continueShoppingButton = this.page.locator('a:has-text("Continue Shopping"), button:has-text("Continue")');
  private readonly orderHistoryLink = this.page.locator('a:has-text("Order History")');
  private readonly myOrdersLink = this.page.locator('a:has-text("My Orders")');
  private readonly accountLink = this.page.locator('a:has-text("Account")');
  private readonly ordersTable = this.page.locator('table[class*="order"]');
  private readonly viewOrderButton = this.page.locator('a:has-text("View")');
  private readonly deliveryStatus = this.page.locator('[class*="status"], text=/Delivered|Processing|Shipped/i');

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/order_placed');
    await this.waitForVisible(this.orderConfirmationMessage);
    pageLogger.info('Order confirmation page loaded');
  }

  async gotoOrderHistory(): Promise<void> {
    await this.navigate('/orders');
    pageLogger.info('Navigated to order history');
  }

  async gotoMyOrders(): Promise<void> {
    await this.click(this.myOrdersLink, 'My Orders link');
    pageLogger.info('Navigated to my orders');
  }

  // ─── Order Confirmation Actions ───────────────────────────────────────────────

  async getOrderNumber(): Promise<string> {
    const orderNumberText = await this.getText(this.orderNumber);
    const match = orderNumberText.match(/\d+/);
    return match ? match[0] : orderNumberText;
  }

  async getOrderTotal(): Promise<string> {
    return this.getText(this.orderTotal);
  }

  async getOrderItemsCount(): Promise<number> {
    return this.getCount(this.orderItems);
  }

  async downloadInvoice(): Promise<void> {
    await this.click(this.downloadInvoiceButton, 'Download Invoice button');
    pageLogger.info('Clicked download invoice');
  }

  async continueShopping(): Promise<void> {
    await this.click(this.continueShoppingButton, 'Continue Shopping button');
    pageLogger.info('Clicked continue shopping');
  }

  async getDeliveryStatus(): Promise<string> {
    return this.getText(this.deliveryStatus);
  }

  // ─── Order History Actions ────────────────────────────────────────────────────

  async getOrdersCount(): Promise<number> {
    const rows = await this.ordersTable.locator('tbody tr').all();
    return rows.length;
  }

  async viewFirstOrder(): Promise<void> {
    const firstViewButton = this.viewOrderButton.first();
    await this.click(firstViewButton, 'View first order button');
    pageLogger.info('Viewed first order');
  }

  async viewOrderByNumber(orderNumber: string): Promise<void> {
    const orderRow = this.page.locator(`tr:has-text("${orderNumber}")`);
    const viewButton = orderRow.locator('a:has-text("View")');
    await this.click(viewButton, `View order ${orderNumber}`);
    pageLogger.info(`Viewed order ${orderNumber}`);
  }

  // ─── Getters for Order Details ────────────────────────────────────────────────

  async getOrderDetails(): Promise<{
    orderNumber: string;
    total: string;
    itemsCount: number;
    status: string;
  }> {
    return {
      orderNumber: await this.getOrderNumber(),
      total: await this.getOrderTotal(),
      itemsCount: await this.getOrderItemsCount(),
      status: await this.getDeliveryStatus(),
    };
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertOrderPlacedSuccessfully(): Promise<void> {
    await this.assertVisible(this.orderConfirmationMessage, 'Order confirmation message should be visible');
    pageLogger.info('Order placed successfully verified');
  }

  async assertOrderNumberDisplayed(): Promise<void> {
    await this.assertVisible(this.orderNumber, 'Order number should be displayed');
  }

  async assertOrderDetailsVisible(): Promise<void> {
    await this.assertVisible(this.orderDetailsSection, 'Order details section should be visible');
  }

  async assertOrderTotalDisplayed(): Promise<void> {
    await this.assertVisible(this.orderTotal, 'Order total should be displayed');
  }

  async assertDownloadInvoiceButtonVisible(): Promise<void> {
    await this.assertVisible(this.downloadInvoiceButton, 'Download Invoice button should be visible');
  }

  async assertOnOrderHistoryPage(): Promise<void> {
    await this.assertUrl(/order|history/);
    pageLogger.info('Verified on order history page');
  }

  async assertOrdersTableDisplayed(): Promise<void> {
    await this.assertVisible(this.ordersTable, 'Orders table should be displayed');
  }

  async assertOrderInHistory(orderNumber: string): Promise<void> {
    const orderRow = this.page.locator(`tr:has-text("${orderNumber}")`);
    const isVisible = await this.isVisible(orderRow, 2000);
    if (!isVisible) {
      throw new Error(`Order ${orderNumber} not found in history`);
    }
    pageLogger.info(`Order ${orderNumber} found in history`);
  }

  async assertMultipleOrdersDisplayed(expectedCount: number): Promise<void> {
    const actualCount = await this.getOrdersCount();
    if (actualCount < expectedCount) {
      throw new Error(`Expected at least ${expectedCount} orders, but found ${actualCount}`);
    }
    pageLogger.info(`${actualCount} orders displayed in history`);
  }
}
