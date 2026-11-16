import { test } from '@playwright/test';

/**
 * ABOUTME: Explores the registration page to find correct selectors.
 * ABOUTME: Prints all available input fields and their attributes.
 */

test('Explore Registration Page Selectors', async ({ page }) => {
  await page.goto('https://automationexercise.com/signup', { waitUntil: 'domcontentloaded' });

  console.log('\n=== Page Title ===');
  console.log(await page.title());

  console.log('\n=== Current URL ===');
  console.log(page.url());

  console.log('\n=== All Input Fields ===');
  const inputs = await page.locator('input').all();
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    const dataQa = await input.getAttribute('data-qa');
    const id = await input.getAttribute('id');
    const className = await input.getAttribute('class');

    console.log(`Input ${i}:
  - type: ${type}
  - name: ${name}
  - placeholder: ${placeholder}
  - data-qa: ${dataQa}
  - id: ${id}
  - class: ${className}`);
  }

  console.log('\n=== All Buttons ===');
  const buttons = await page.locator('button').all();
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.textContent();
    const dataQa = await button.getAttribute('data-qa');
    const type = await button.getAttribute('type');
    console.log(`Button ${i}: text="${text?.trim()}", data-qa="${dataQa}", type="${type}"`);
  }

  console.log('\n=== All Dropdowns/Selects ===');
  const selects = await page.locator('select').all();
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const name = await select.getAttribute('name');
    const id = await select.getAttribute('id');
    const dataQa = await select.getAttribute('data-qa');
    console.log(`Select ${i}: name="${name}", id="${id}", data-qa="${dataQa}"`);
  }

  console.log('\n=== Checkboxes ===');
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    const id = await cb.getAttribute('id');
    const name = await cb.getAttribute('name');
    const value = await cb.getAttribute('value');
    const label = await page.locator(`label[for="${id}"]`).textContent();
    console.log(`Checkbox ${i}: id="${id}", name="${name}", value="${value}", label="${label?.trim()}"`);
  }

  console.log('\n=== Page Structure (First 100 lines) ===');
  const html = await page.content();
  const lines = html.split('\n').slice(0, 100);
  console.log(lines.join('\n'));

  // Take screenshot
  await page.screenshot({ path: 'test-results/selectors-page-screenshot.png' });
  console.log('\n✓ Screenshot saved to test-results/selectors-page-screenshot.png');
});
