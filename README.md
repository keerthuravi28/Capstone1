# Playwright TypeScript E-Commerce Test Automation Framework

A TypeScript test automation framework built on **Playwright** for end-to-end UI testing of **AutomationExercise.com** (`https://automationexercise.com`). Uses the Page Object Model pattern with a layered architecture for maintainability.

---

## Application Under Test

**AutomationExercise.com** — a full-featured e-commerce demo site covering:

- User registration and login
- Product browsing, search, and filtering
- Shopping cart management
- Checkout and order placement
- Contact form submission

---

## Tech Stack

| Category | Tool |
|---|---|
| Language | TypeScript 5.4+ |
| Test runner | @playwright/test 1.44+ |
| Runtime | Node.js 18+ (CI uses 20) |
| Logging | winston |
| Data parsing | csv-parse, xlsx |
| Linting | eslint + @typescript-eslint |

---

## Project Structure

```
src/
  main/
    ui/
      common/          WebActions, WebAssertions (reusable browser helpers)
      pages/           BasePage + page objects (per-page selectors and flows)
      fixtures/        ecommerce-fixtures.ts (typed test fixtures)
    shared/
      config/          env.config.ts (typed environment config)
      data/            data-reader.ts (CSV/JSON/Excel readers)
      utils/           logger, helpers, reporting
  tests/
    ui/
      registration.spec.ts        Requirement 1: User Registration
      ecommerce-login.spec.ts     Requirement 1: Login (data-driven)
      products-and-cart.spec.ts   Requirement 2: Product Search & Cart
      checkout-and-orders.spec.ts Requirement 3 & 4: Checkout & Orders
      contact-form.spec.ts        Requirement 5: Contact Form
test-data/                        CSV/JSON fixtures for data-driven tests
.github/workflows/                CI pipeline (lint + e-commerce tests)
```

---

## Architecture

```
WebActions          reusable browser interactions (click, fill, wait, drag...)
  WebAssertions     web-first assertions (visibility, text, URL...)
    BasePage        navigate() relative to BASE_URL
      Page Objects  per-page selectors and business flows
```

Tests import typed fixtures from `ecommerce-fixtures.ts`, which provides page object instances (`registrationPage`, `productsPage`, `cartPage`, `checkoutPage`, etc.) and blocks ad networks in CI.

---

## Getting Started

```bash
npm install
npx playwright install --with-deps
```

## Running Tests

```bash
npm run test:ui          # full UI suite (Chromium)
npm run test:smoke       # @smoke tagged tests
npm run test:regression  # @regression tagged tests
npm run test:critical    # @critical tagged tests
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

Run headless (for CI):
```bash
HEADLESS=true npx playwright test --project=ui
```

---

## CI/CD

GitHub Actions workflow (`.github/workflows/test-suite.yml`):

1. **Lint & Type Check** — gates all test jobs
2. **E-Commerce Tests** — runs the 5 spec files against automationexercise.com

Ad-blocking is built into the test fixtures to prevent Google Ads overlays from interfering with test execution in CI environments.

---

## Test Tags

| Tag | Meaning |
|---|---|
| `@smoke` | Fast critical-path checks |
| `@regression` | Broader functional coverage |
| `@critical` | Business-critical scenarios |
