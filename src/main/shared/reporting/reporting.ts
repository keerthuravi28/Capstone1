/**
 * Native Reporting Helpers
 * Thin wrappers around Playwright's own `test.info()` API — annotations show
 * up in the built-in HTML report and the JSON reporter output; attachments
 * show up in the HTML report's trace/attachment panel. No external reporter
 * dependency required.
 *
 * This replaces the former Allure-backed helpers (`allure.ts`) 1:1 — same
 * function names and signatures — so call sites across the suite didn't need
 * per-line changes, only the import path.
 */
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Severity levels — same labels the specs already use. */
export enum Severity {
  BLOCKER = 'blocker',
  CRITICAL = 'critical',
  NORMAL = 'normal',
  MINOR = 'minor',
  TRIVIAL = 'trivial',
}

/** Test-level metadata applied at the start of a test (or beforeEach). */
export interface TestMeta {
  epic?: string;
  feature?: string;
  story?: string;
  severity?: Severity;
  owner?: string;
  layer?: 'ui' | 'api';
  description?: string;
  tags?: string[];
}

/** Apply a set of metadata as Playwright annotations in one call. */
export async function annotate(meta: TestMeta): Promise<void> {
  const info = test.info();
  if (meta.epic) info.annotations.push({ type: 'epic', description: meta.epic });
  if (meta.feature) info.annotations.push({ type: 'feature', description: meta.feature });
  if (meta.story) info.annotations.push({ type: 'story', description: meta.story });
  if (meta.severity) info.annotations.push({ type: 'severity', description: meta.severity });
  if (meta.owner) info.annotations.push({ type: 'owner', description: meta.owner });
  if (meta.layer) info.annotations.push({ type: 'layer', description: meta.layer });
  if (meta.description) info.annotations.push({ type: 'description', description: meta.description });
  if (meta.tags?.length) info.annotations.push({ type: 'tags', description: meta.tags.join(', ') });
}

/** Record a named test parameter (shows as an annotation in the report). */
export async function parameter(name: string, value: string): Promise<void> {
  test.info().annotations.push({ type: 'parameter', description: `${name}=${value}` });
}

/** Attach a full-page screenshot to the current test. */
export async function attachScreenshot(page: Page, name: string): Promise<void> {
  const png = await page.screenshot({ fullPage: true });
  await test.info().attach(name, { body: png, contentType: 'image/png' });
}

/** Attach any serialisable object as pretty-printed JSON. */
export async function attachJson(name: string, data: unknown): Promise<void> {
  await test.info().attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

/** Attach plain text (log excerpts, raw payloads, etc.). */
export async function attachText(name: string, text: string): Promise<void> {
  await test.info().attach(name, { body: text, contentType: 'text/plain' });
}

/**
 * Attach an API response summary (status, duration, body) to the report.
 * Works with the framework's ApiResponse<T> shape ({ status, duration, data }).
 */
export async function attachApiResponse(
  name: string,
  response: { status: number; duration?: number; data?: unknown }
): Promise<void> {
  await attachJson(name, {
    status: response.status,
    durationMs: response.duration,
    body: response.data,
  });
}
