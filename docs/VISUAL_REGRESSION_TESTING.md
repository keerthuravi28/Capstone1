# Visual Regression Testing Strategy
## Playwright E-Commerce Automation Framework

**Purpose:** Document visual regression testing approach, baseline management, and cross-browser visual validation.

---

## 1. Visual Regression Testing Overview

### What It Tests
- **UI consistency** — Ensures layouts haven't changed unexpectedly
- **CSS regression** — Catches styling issues before production
- **Cross-browser rendering** — Validates appearance across browsers
- **Responsive design** — Verifies mobile/tablet/desktop layouts

### When to Use
- ✅ After CSS changes
- ✅ After design library updates
- ✅ Cross-browser validation
- ✅ Regression detection (visual changes)
- ❌ NOT for functional testing (use UI tests instead)

---

## 2. Visual Testing Implementation

### Configuration (playwright.config.ts)

```typescript
export default defineConfig({
  // ... other config ...
  
  snapshotPathTemplate:
    '{testDir}/../../resources/visual-baselines/{testFileName}/{arg}{-projectName}{-platform}{ext}',
  
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,    // Allow 2% pixel difference
      animations: 'disabled',      // Disable animations for consistency
      // caret: 'hide',           // Hide cursor blinking
      // timeout: 5000,           // Custom timeout
    },
  },
});
```

### Creating Visual Tests

```typescript
import { test } from '@playwright/test';

test('registration page layout matches baseline',
  { tag: '@visual' },
  async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    
    // Full page screenshot
    await expect(page).toHaveScreenshot('registration-full-page.png');
  });

test('login form visual consistency',
  { tag: '@visual' },
  async ({ page }) => {
    await page.goto('/login');
    
    // Specific element screenshot
    const loginForm = page.locator('div.login-form');
    await expect(loginForm).toHaveScreenshot('login-form.png');
  });
```

---

## 3. Baseline Management

### Initial Baseline Creation

```bash
# Generate visual baselines (first run)
npm run test:visual:update

# Or manually:
npx playwright test src/tests/ui/registration.spec.ts --grep "@visual" --update-snapshots
```

**Location:** `resources/visual-baselines/`

**Naming Convention:**
```
<testFileName>/<snapshotName>-<projectName>-<platform>.png

Example:
resources/visual-baselines/
  registration.spec.ts/
    registration-full-page-ui-win32.png
    registration-full-page-ui-linux.png
    login-form-ui-chromium.png
    login-form-ui-firefox.png
```

### Baseline Structure

```
resources/visual-baselines/
├── registration.spec.ts/
│   ├── registration-form-ui-chromium.png
│   ├── registration-form-ui-firefox.png
│   ├── registration-success-ui-chromium.png
│   └── registration-success-ui-linux.png
├── ecommerce-login.spec.ts/
│   ├── login-page-layout-ui-chromium.png
│   ├── login-page-layout-ui-firefox.png
│   └── login-error-state-ui-chromium.png
└── dashboard.spec.ts/
    ├── dashboard-full-ui-chromium.png
    └── dashboard-sidebar-ui-chromium.png
```

### Committing Baselines

```bash
# Important: Baselines MUST be committed to git
git add resources/visual-baselines/
git commit -m "Add visual baselines for registration and login tests"

# ✅ Baselines are source of truth — stored in git
# ❌ Do NOT regenerate without reviewing changes
```

---

## 4. Running Visual Tests

### Run All Visual Tests

```bash
npm run test:visual
# or
npx playwright test --grep "@visual"
```

### Run Visual Tests for Specific Page

```bash
npx playwright test src/tests/ui/registration.spec.ts --grep "@visual"
```

### Generate/Update Baselines After UI Change

```bash
# Only do this after intentional design changes!
npm run test:visual:update

# Manual update:
npx playwright test --grep "@visual" --update-snapshots
```

### Run with Different Browsers

```bash
# Chromium (default, pre-configured)
npx playwright test src/tests/ui/registration.spec.ts --project=ui --grep "@visual"

# Firefox (requires uncommenting in playwright.config.ts)
npx playwright test src/tests/ui/registration.spec.ts --project=ui-firefox --grep "@visual"

# WebKit
npx playwright test src/tests/ui/registration.spec.ts --project=ui-webkit --grep "@visual"
```

---

## 5. Visual Regression Test Scenarios

### Registration Page Visual Tests

```typescript
// From registration.spec.ts
test('registration form displays correctly',
  { tag: '@visual' },
  async ({ page, registrationPage }) => {
    await registrationPage.goto();
    
    // Full form layout
    await expect(page.locator('form')).toHaveScreenshot('registration-form-initial.png');
    
    // Form title
    await expect(page.locator('h1:has-text("Sign Up")')).toHaveScreenshot('registration-header.png');
    
    // Input fields layout
    const fieldsSection = page.locator('[class*="form-group"]');
    await expect(fieldsSection).toHaveScreenshot('registration-fields-layout.png');
  });

test('registration success state visual',
  { tag: '@visual' },
  async ({ page, registrationPage }) => {
    const testUser = {
      firstName: 'Visual',
      lastName: 'Test',
      email: 'visual-test@example.com',
      password: 'VisualTest123!',
      acceptTerms: true,
    };
    
    await registrationPage.goto();
    await registrationPage.registerUser(testUser);
    
    // Success message layout
    const successMsg = page.locator('h2:has-text("Account Created!")');
    await expect(successMsg).toHaveScreenshot('registration-success-message.png');
    
    // Entire success page
    await expect(page).toHaveScreenshot('registration-success-page.png');
  });
```

### Login Page Visual Tests

```typescript
// From ecommerce-login.spec.ts
test('login page layout visual consistency',
  { tag: '@visual' },
  async ({ page, ecommerceLoginPage }) => {
    await ecommerceLoginPage.goto();
    
    // Full page layout
    await expect(page).toHaveScreenshot('login-page-full.png');
    
    // Login form section
    const loginForm = page.locator('div:has-text("Login to your account")').first();
    await expect(loginForm).toHaveScreenshot('login-form-section.png');
    
    // Signup form section
    const signupForm = page.locator('div:has-text("New User Signup!")').first();
    await expect(signupForm).toHaveScreenshot('signup-form-section.png');
    
    // Input fields
    const inputs = page.locator('input[type="text"], input[type="password"]');
    await expect(inputs.first()).toHaveScreenshot('login-input-field.png');
  });

test('login error state visual',
  { tag: '@visual' },
  async ({ page, ecommerceLoginPage }) => {
    await ecommerceLoginPage.goto();
    
    // Enter invalid credentials
    await ecommerceLoginPage.login('invalid@test.com', 'wrongpass');
    
    // Error message appearance
    const errorMsg = page.locator('[data-qa*="error"]');
    await expect(errorMsg).toHaveScreenshot('login-error-message.png');
    
    // Full page with error
    await expect(page).toHaveScreenshot('login-page-with-error.png');
  });
```

### Account Page Visual Tests

```typescript
test('account page dashboard visual',
  { tag: '@visual' },
  async ({ page, accountPage }) => {
    await accountPage.goto();
    
    // User info section
    const userInfo = page.locator('[class*="account-info"]');
    await expect(userInfo).toHaveScreenshot('account-user-info.png');
    
    // Menu section
    const menu = page.locator('[class*="account-menu"]');
    await expect(menu).toHaveScreenshot('account-menu.png');
    
    // Full account page
    await expect(page).toHaveScreenshot('account-page-full.png');
  });
```

---

## 6. Handling Visual Differences

### When Visual Test Fails

1. **Review the diff** in HTML report:
   ```bash
   npm run test:report
   # Opens HTML report → click failed test → see visual diff
   ```

2. **Analyze the changes:**
   - Is this an expected CSS change? → Update baseline
   - Is this a regression? → Fix the code
   - Is this a flaky comparison? → Adjust tolerance

3. **Update or fix:**
   ```bash
   # If intentional change: update baseline
   npm run test:visual:update
   
   # If regression: fix CSS and rerun
   npm test -- --grep "@visual"
   ```

### Acceptable Difference Tolerance

```typescript
// From playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.02,  // 2% difference allowed
    animations: 'disabled',    // Freeze animations
  },
},

// Override per-test if needed:
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixelRatio: 0.05,  // 5% tolerance for this test
  mask: [page.locator('[dynamic-content]')], // Mask dynamic areas
});
```

### Masking Dynamic Elements

```typescript
// Mask time-based, user-generated, or unpredictable elements

test('account page with masked dynamic content',
  { tag: '@visual' },
  async ({ page }) => {
    await page.goto('/account');
    
    // Ignore timestamp, user ID, or other dynamic content
    await expect(page).toHaveScreenshot('account-page.png', {
      mask: [
        page.locator('[class*="timestamp"]'),
        page.locator('[class*="user-id"]'),
        page.locator('img[src*="avatar"]'), // Dynamic profile pictures
      ],
    });
  });
```

---

## 7. Cross-Browser Visual Testing

### Enable Firefox & WebKit Browsers

Edit `playwright.config.ts`:

```typescript
projects: [
  {
    name: 'ui',
    testMatch: ['**/tests/ui/**/*.spec.ts'],
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'ui-firefox',  // Uncomment this
    testMatch: ['**/tests/ui/**/*.spec.ts'],
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'ui-webkit',   // Uncomment this
    testMatch: ['**/tests/ui/**/*.spec.ts'],
    use: { ...devices['Desktop Safari'] },
  },
  // ... API project ...
];
```

### Run Cross-Browser Visual Tests

```bash
# Run visual tests on all browsers
npm run test:cross-browser -- --grep "@visual"

# Or specific browsers:
npx playwright test --grep "@visual" --project=ui-firefox --project=ui-webkit
```

### Expected Baseline Files After Cross-Browser Run

```
resources/visual-baselines/registration.spec.ts/
├── registration-form-ui-chromium.png
├── registration-form-ui-firefox.png
├── registration-form-ui-webkit.png
├── registration-success-ui-chromium.png
├── registration-success-ui-firefox.png
└── registration-success-ui-webkit.png
```

---

## 8. CI/CD Visual Testing

### GitHub Actions Configuration

```yaml
# In .github/workflows/test-suite.yml
- name: Run Visual Regression Tests
  run: npm run test:visual
  
- name: Upload Visual Baselines Comparison
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-test-results
    path: test-results/
    retention-days: 30
```

### Important Notes for CI

```yaml
# ⚠️ Visual tests are platform-dependent!
# Different OS rendering = different baselines

# Best practice: Generate baselines on Linux (CI environment)
- name: Regenerate baselines on Linux
  run: npm run test:visual:update
  if: github.event_name == 'pull_request'

# Then: Store Linux-generated baselines in git
```

---

## 9. Visual Testing Best Practices

### ✅ DO

- ✅ Use `@visual` tags for visual tests
- ✅ Take screenshots of entire page AND focused elements
- ✅ Commit baselines to git (source of truth)
- ✅ Generate baselines on consistent OS (usually Linux in CI)
- ✅ Mask dynamic content (timestamps, user IDs)
- ✅ Review diffs before updating baselines
- ✅ Use appropriate `maxDiffPixelRatio` tolerance
- ✅ Document why tolerance was adjusted
- ✅ Test on multiple browsers (Chromium, Firefox, WebKit)

### ❌ DON'T

- ❌ Regenerate baselines blindly without review
- ❌ Use extremely loose tolerance (> 10%)
- ❌ Screenshot every single interaction (only key states)
- ❌ Mix visual and functional assertions in same test
- ❌ Update baselines in local environment before CI confirmation
- ❌ Store baselines outside of git
- ❌ Use overly specific element selectors for screenshots
- ❌ Ignore rendering differences between browsers

---

## 10. Visual Testing Workflow

### Step 1: Create Visual Test

```typescript
test('login page looks correct', { tag: '@visual' }, async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-page.png');
});
```

### Step 2: Generate Baselines (First Run)

```bash
npm run test:visual:update
# Creates: resources/visual-baselines/[name]-[browser]-[os].png
```

### Step 3: Commit Baselines

```bash
git add resources/visual-baselines/
git commit -m "Add visual baselines for login page"
git push
```

### Step 4: Run Tests (Subsequent Runs)

```bash
npm run test:visual
# Compares current screenshots to baselines
# Passes if < 2% pixel difference
# Fails if > 2% difference detected
```

### Step 5: Analyze Failures

```bash
npm run test:report
# Opens HTML report with diff viewer
# Review before updating
```

### Step 6: Update if Intentional

```bash
# Only if change is intentional and approved:
npm run test:visual:update
git add resources/visual-baselines/
git commit -m "Update baselines after CSS refactor"
```

---

## 11. Troubleshooting Visual Tests

### Problem: "Baseline not found"
```bash
# Solution: Generate baseline for this browser
npm run test:visual:update
```

### Problem: Test passes locally but fails in CI
```bash
# Cause: Different rendering (OS, fonts, browser)
# Solution: Generate baselines on CI OS (Linux)
# Run on CI first, then pull baseline images

# Better: Regenerate on same OS as CI
docker run --rm -it mcr.microsoft.com/playwright:v1.44.0-focal \
  /bin/bash -c "npm run test:visual:update"
```

### Problem: Flaky visual tests (sometimes pass/fail)
```typescript
// Cause: Animations, network delays, dynamic content
// Solution: Wait for stability + mask dynamic areas

test('flaky visual test', { tag: '@visual' }, async ({ page }) => {
  await page.goto('/page');
  await page.waitForLoadState('networkidle');     // Wait for content
  
  // Disable animations
  await page.addInitScript(() => {
    (document.body.style as any).animation = 'none';
  });
  
  await expect(page).toHaveScreenshot('page.png', {
    animations: 'disabled',
    mask: [page.locator('[dynamic-class]')],  // Mask dynamic
  });
});
```

### Problem: Tolerance too strict/loose
```typescript
// Too strict: Test fails on minor acceptable changes
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixelRatio: 0.001,  // Too strict!
});

// Too loose: Misses real regressions
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixelRatio: 0.20,   // Too loose!
});

// Recommended: Start with 0.02 (2%), adjust based on results
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixelRatio: 0.02,   // ✅ Reasonable
});
```

---

## 12. Visual Testing Summary

| Aspect | Strategy |
|---|---|
| **Purpose** | Catch CSS regressions, ensure UI consistency |
| **When to Use** | CSS changes, design updates, cross-browser checks |
| **Baseline Location** | `resources/visual-baselines/` (git-tracked) |
| **Tolerance** | 2% pixel diff by default (`maxDiffPixelRatio: 0.02`) |
| **Dynamic Content** | Mask with `mask: [locators]` |
| **Cross-Browser** | Generate on all browsers (Chromium, Firefox, WebKit) |
| **CI/CD** | Upload test results as artifact; regenerate on Linux |
| **Workflow** | Create → Update → Commit → Test → Review → Update |

---

## Conclusion

Visual regression testing:
- ✅ Prevents unintended CSS changes
- ✅ Validates cross-browser consistency
- ✅ Catches design regressions early
- ✅ Documents expected UI state

Used correctly, it's a powerful quality gate. Used carelessly, it becomes maintenance burden. **Balance** is key.
