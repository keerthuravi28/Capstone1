# Locator Strategy Guide
## Playwright E-Commerce Automation Framework

**Purpose:** Document the locator selection philosophy, maintenance strategy, and synchronization handling.

---

## 1. Locator Selection Philosophy

### Principle: Priority Order (Specificity → Resilience)

We select locators using this priority order:

| Priority | Method | Example | Resilience | Use Case |
|---|---|---|---|---|
| **1** | `data-qa` attributes | `[data-qa="login_email"]` | ⭐⭐⭐⭐⭐ Highest | Primary choice - explicit automation hooks |
| **2** | `data-testid` | `[data-testid="user-profile"]` | ⭐⭐⭐⭐⭐ | Same reliability as `data-qa` |
| **3** | ARIA attributes | `[aria-label="Login"]`, `[role="button"]` | ⭐⭐⭐⭐ | Accessibility-focused apps |
| **4** | Semantic HTML | `button:has-text("Submit")`, `input[type="email"]` | ⭐⭐⭐ | Standard forms |
| **5** | CSS class (stable) | `.login-form input[name="email"]` | ⭐⭐⭐ | Established design systems |
| **6** | ID attributes | `#submitButton` | ⭐⭐⭐ | Single-instance elements |
| **7** | XPath (last resort) | `//button[contains(text(), "Login")]` | ⭐⭐ | Only when no alternatives |

---

## 2. Locator Implementation in Code

### RegistrationPage Example

```typescript
export class RegistrationPage extends BasePage {
  // ✅ GOOD: Explicit data-qa attributes (automation-aware)
  private readonly firstNameInput = this.page.locator('input[data-qa="first_name"]');
  private readonly lastNameInput = this.page.locator('input[data-qa="last_name"]');
  
  // ✅ GOOD: Semantic HTML with type
  private readonly emailInput = this.page.locator('input[type="email"][data-qa="email_address"]');
  
  // ✅ GOOD: Has-text for stable buttons
  private readonly createAccountButton = this.page.locator('button[data-qa="create_account"]');
  
  // ✅ GOOD: ARIA attributes for accessibility
  private readonly termsCheckbox = this.page.locator('input#optin, input[aria-label="I agree to terms"]');
  
  // ❌ AVOID: CSS classes that change frequently
  // private readonly submitBtn = this.page.locator('.btn-primary.rounded-lg.mt-4');
  
  // ❌ AVOID: Complex XPath
  // private readonly submitBtn = this.page.locator('//div[@class="form"]//button[1]');
}
```

### ECommerceLoginPage Example

```typescript
export class ECommerceLoginPage extends BasePage {
  // ✅ Priority 1: data-qa (app explicitly supports automation)
  private readonly loginEmailInput = this.page.locator('input[data-qa="login_email"]');
  private readonly loginButton = this.page.locator('button[data-qa="login_button"]');
  
  // ✅ Priority 3: ARIA attributes (accessible markup)
  private readonly loginErrorMessage = this.page.locator('[role="alert"]');
  
  // ✅ Priority 4: Semantic + text
  private readonly loginFormSection = this.page.locator('div:has-text("Login to your account")');
  
  // ✅ Combination: Most specific + semantic
  private readonly signupButton = this.page.locator('button[data-qa="signup_button"]:visible');
}
```

---

## 3. Selector Maintenance Strategy

### Problem: Selectors Break When App Changes

**Scenario:** Developer changes `data-qa="login_email"` → `data-qa="email_login"`

**Solution: Multi-Strategy Fallbacks**

```typescript
// ✅ GOOD: Multiple strategies (fallback pattern)
private readonly emailInput = this.page.locator(
  'input[data-qa="login_email"], input[data-qa="email_login"], input[type="email"]'
);

// ✅ GOOD: Text-based + type (stable combination)
private readonly submitButton = this.page.locator(
  'button:has-text("Login"), button[type="submit"]:visible'
);

// ✅ GOOD: Combination of multiple attributes
private readonly checkbox = this.page.locator(
  'input[type="checkbox"][aria-label="Accept Terms"], input#terms_accept, input.terms-checkbox'
);
```

### Locator Maintenance Checklist

When a test breaks:

1. **Inspect the app:**
   ```bash
   npx playwright test --debug
   # Or: npx playwright codegen https://automationexercise.com/
   ```

2. **Update selector** using priority order

3. **Add fallback patterns** if attribute might change

4. **Test multiple browsers** (selectors may differ)

5. **Document why** if using XPath/complex selectors

---

## 4. Synchronization Handling

### Playwright's Built-In Waiting (Auto-Waiting)

Playwright **automatically waits** for elements before interacting:

```typescript
// ✅ Playwright auto-waits (default 30s from playwright.config.ts)
await this.click(this.loginButton);      // Waits for button visibility
await this.fill(this.emailInput, email); // Waits for input to be enabled
```

### Explicit Waits (When Auto-Waiting Isn't Enough)

```typescript
export class WebActions {
  // ✅ Wait for visibility (in WebActions - portable)
  async waitForVisible(
    locator: Locator,
    timeout = 5000
  ): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  // ✅ Wait for condition (polling)
  async waitUntilVisible(locator: Locator): Promise<void> {
    await this.page.waitForFunction(() => locator.isVisible());
  }

  // ✅ Wait for specific URL
  async waitForUrlChange(urlPattern: RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }
}
```

### Applied in Tests

```typescript
// From RegistrationPage.ts
async goto(): Promise<void> {
  await this.navigate('/signup');
  await this.waitForVisible(this.firstNameInput);  // ← Explicit wait
  pageLogger.info('Registration page loaded');
}

// From ECommerceLoginPage.ts
async getLoginErrorMessage(): Promise<string> {
  await this.waitForVisible(this.loginErrorMessage, 5000); // ← Explicit wait
  return this.getText(this.loginErrorMessage);
}
```

---

## 5. Locator Debugging

### Method 1: Codegen (Auto-Generate Selectors)

```bash
# Interactive selector generation
npx playwright codegen https://automationexercise.com/

# Opens browser - click elements, get selectors automatically
```

### Method 2: Inspector (Debug Mode)

```bash
# Step through test with live inspector
npx playwright test src/tests/ui/ecommerce-login.spec.ts --debug

# In inspector:
# - Hover over elements in browser
# - Execute locators in console
# - Evaluate against current page state
```

### Method 3: Console Evaluation

```typescript
// In test with --debug:
test('debug locators', async ({ page }) => {
  await page.goto('https://automationexercise.com/login');
  
  // Test selector in console
  const result = await page.locator('input[data-qa="login_email"]').count();
  console.log(`Found ${result} matching elements`);
  
  // Get element text for verification
  const text = await page.locator('button[data-qa="login_button"]').textContent();
  console.log(`Button text: ${text}`);
});
```

### Method 3: Screenshot Analysis

```typescript
// Take screenshot to visually inspect elements
await page.screenshot({ path: 'debug-page.png' });

// Highlight element
await page.locator('input[data-qa="login_email"]').highlight();
```

---

## 6. Locator Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Brittle CSS Classes

```typescript
// BAD: Classes change with design updates
private readonly loginButton = this.page.locator('.btn-primary-large-rounded');

// GOOD: Use data-qa or semantic HTML
private readonly loginButton = this.page.locator('button[data-qa="login_button"]');
```

### ❌ Anti-Pattern 2: Deep XPath

```typescript
// BAD: Deep path breaks with DOM changes
private readonly email = this.page.locator(
  '//div[@class="container"]//div[@class="form"]//div[@class="field"]//input[1]'
);

// GOOD: Use data-qa or semantic attributes
private readonly email = this.page.locator('input[data-qa="email"]');
```

### ❌ Anti-Pattern 3: Positional Selectors

```typescript
// BAD: Order-dependent (brittle)
private readonly buttons = this.page.locator('button').nth(3); // Which button is "3"?

// GOOD: Use identifier
private readonly submitButton = this.page.locator('button[data-qa="submit"]');
```

### ❌ Anti-Pattern 4: Text-Only Matching

```typescript
// BAD: Text changes with language/design
private readonly button = this.page.locator('button:has-text("Click Me")');

// GOOD: Combine text with data attribute
private readonly button = this.page.locator('button[data-qa="action"]:has-text("Click")');
```

### ❌ Anti-Pattern 5: Raw Locators in Tests

```typescript
// BAD: Selectors scattered in tests
test('login', async ({ page }) => {
  await page.locator('input[name="email"]').fill('test@test.com');
  await page.locator('input[name="password"]').fill('Pass123');
  await page.locator('button[type="submit"]').click();
});

// GOOD: Encapsulated in page object
test('login', async ({ loginPage }) => {
  await loginPage.login('test@test.com', 'Pass123');
});
```

---

## 7. Real-World Example: RegistrationPage

### How Selectors Are Organized

```typescript
export class RegistrationPage extends BasePage {
  // Grouped by logical section
  
  // Personal Info Section
  private readonly firstNameInput = this.page.locator('input[data-qa="first_name"]');
  private readonly lastNameInput = this.page.locator('input[data-qa="last_name"]');
  
  // Contact Section
  private readonly emailInput = this.page.locator('input[data-qa="email_address"]');
  private readonly phoneInput = this.page.locator('input[data-qa="mobile_number"]');
  
  // Address Section
  private readonly addressInput = this.page.locator('input[data-qa="address1"]');
  private readonly countryDropdown = this.page.locator('select[data-qa="country"]');
  
  // Checkbox Section
  private readonly newsletterCheckbox = this.page.locator('input#newsletter');
  private readonly termsCheckbox = this.page.locator('input#optin');
  
  // Action Buttons
  private readonly createAccountButton = this.page.locator('button[data-qa="create_account"]');
  private readonly accountCreatedButton = this.page.locator('a[data-qa="continue_button"]');
  
  // Messages & Feedback
  private readonly successMessage = this.page.locator('h2:has-text("Account Created!")');
  private readonly errorMessages = this.page.locator('[data-qa*="error"]');
}
```

### Why This Structure Works

1. **Grouped by section** — Easy to find related selectors
2. **Consistent naming** — Follows `data-qa` pattern
3. **Private visibility** — Only page object methods use them
4. **Self-documenting** — Names describe purpose
5. **Easy to update** — All selectors in one place

---

## 8. Handling Dynamic Elements

### Pattern 1: Dynamic Lists

```typescript
// Get all product cards (dynamic count)
async getProductCount(): Promise<number> {
  return this.page.locator('[data-qa="product-card"]').count();
}

// Get specific product by name
async getProductByName(name: string): Promise<Locator> {
  return this.page.locator(
    `[data-qa="product-card"]:has-text("${name}")`
  );
}
```

### Pattern 2: Dynamic IDs/Classes

```typescript
// If element ID includes timestamp: element-123456789
private getCheckoutButton(timestamp: string): Locator {
  return this.page.locator(`button[id*="checkout-${timestamp}"]`);
}

// Better: Use data-qa (doesn't need ID)
private readonly checkoutButton = this.page.locator('button[data-qa="checkout"]');
```

### Pattern 3: Conditional Selectors

```typescript
// Different selectors for different states
async getSubmitButton(): Promise<Locator> {
  const isDisabled = await this.page
    .locator('button[data-qa="submit"][disabled]')
    .isVisible();
  
  if (isDisabled) {
    return this.page.locator('button[data-qa="submit"][disabled]');
  }
  return this.page.locator('button[data-qa="submit"]:not([disabled])');
}
```

---

## 9. Performance Considerations

### Locator Chaining (Avoid Repeated Queries)

```typescript
// ❌ Inefficient: Multiple DOM queries
async fillAndSubmitForm(): Promise<void> {
  await this.page.locator('input[data-qa="email"]').fill('test@test.com');
  await this.page.locator('input[data-qa="email"]').waitFor(); // Redundant query
  const value = await this.page.locator('input[data-qa="email"]').inputValue(); // 3rd query
}

// ✅ Efficient: Store and reuse locator
async fillAndSubmitForm(): Promise<void> {
  const emailInput = this.page.locator('input[data-qa="email"]');
  await emailInput.fill('test@test.com');
  await emailInput.waitFor(); // Reuse
  const value = await emailInput.inputValue(); // Reuse
}
```

### Locator Specificity (Performance Trade-off)

```typescript
// ✅ More specific = faster + more reliable
private readonly email = this.page.locator(
  'form[id="login"] input[data-qa="email"]:visible'
);

// ⚠️ Less specific = slower but more flexible
private readonly email = this.page.locator('input[data-qa="email"]');
```

---

## 10. Locator Strategy Summary

| Aspect | Strategy |
|---|---|
| **Primary Method** | Use `data-qa` attributes (automation hooks) |
| **Fallback** | Semantic HTML + type attributes |
| **Accessibility** | Prioritize ARIA attributes |
| **Avoid** | Deep XPath, brittle classes, positional selectors |
| **Maintenance** | Keep selectors in page objects only |
| **Debugging** | Use codegen, inspector, screenshots |
| **Synchronization** | Rely on auto-wait; explicit wait when needed |
| **Organization** | Group by logical section, consistent naming |

---

## Conclusion

A **good locator strategy**:
- ✅ Uses explicit automation hooks (`data-qa`)
- ✅ Has fallback options
- ✅ Is encapsulated in page objects
- ✅ Handles dynamic elements gracefully
- ✅ Synchronizes properly with waits
- ✅ Is documented and maintainable
- ✅ Performs efficiently

This approach makes tests **resilient, maintainable, and scalable** — the hallmarks of enterprise-grade automation.
