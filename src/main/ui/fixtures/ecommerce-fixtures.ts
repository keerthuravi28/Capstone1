import { test as base } from '@playwright/test';
import { RegistrationPage } from '../pages/RegistrationPage';
import { ECommerceLoginPage } from '../pages/ECommerceLoginPage';
import { AccountPage } from '../pages/AccountPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderPage } from '../pages/OrderPage';
import { ContactPage } from '../pages/ContactPage';

/**
 * ABOUTME: E-Commerce fixture definitions for test dependency injection.
 * ABOUTME: Provides typed page objects and reusable test fixtures for UI tests.
 */

type ECommerceFixtures = {
  registrationPage: RegistrationPage;
  ecommerceLoginPage: ECommerceLoginPage;
  accountPage: AccountPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  orderPage: OrderPage;
  contactPage: ContactPage;
};

/**
 * Create reusable test fixtures for E-Commerce page objects.
 * Usage: import { test } from '@fixtures/ecommerce-fixtures'; in spec files.
 */
export const test = base.extend<ECommerceFixtures>({
  registrationPage: async ({ page }, use) => {
    const registrationPage = new RegistrationPage(page);
    await use(registrationPage);
  },

  ecommerceLoginPage: async ({ page }, use) => {
    const loginPage = new ECommerceLoginPage(page);
    await use(loginPage);
  },

  accountPage: async ({ page }, use) => {
    const accountPage = new AccountPage(page);
    await use(accountPage);
  },

  productsPage: async ({ page }, use) => {
    const productsPage = new ProductsPage(page);
    await use(productsPage);
  },

  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await use(cartPage);
  },

  checkoutPage: async ({ page }, use) => {
    const checkoutPage = new CheckoutPage(page);
    await use(checkoutPage);
  },

  orderPage: async ({ page }, use) => {
    const orderPage = new OrderPage(page);
    await use(orderPage);
  },

  contactPage: async ({ page }, use) => {
    const contactPage = new ContactPage(page);
    await use(contactPage);
  },
});

export { expect } from '@playwright/test';
