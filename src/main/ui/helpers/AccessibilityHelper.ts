import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pageLogger } from '../../shared/utils/logger';
import { attachJson } from '../../shared/reporting/reporting';

/**
 * AccessibilityHelper
 * ─────────────────────
 * Wraps axe-core (via @axe-core/playwright) for automated WCAG accessibility
 * scanning. Kept as a standalone helper — deliberately NOT folded into
 * WebActions/WebAssertions — since it's a distinct concern (auditing the
 * rendered DOM against WCAG rules) with its own dependency and result shape,
 * rather than an app interaction or a behavioural verification.
 *
 * Usage (from a test or a page object):
 *   const a11y = new AccessibilityHelper(page);
 *   const violations = await a11y.scan();
 *   a11y.assertNoViolations(violations, { minSeverity: 'serious' });
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type A11ySeverity = 'minor' | 'moderate' | 'serious' | 'critical';

export type A11yTag =
  | 'wcag2a'
  | 'wcag2aa'
  | 'wcag2aaa'
  | 'wcag21a'
  | 'wcag21aa'
  | 'wcag22aa'
  | 'best-practice';

export interface A11yViolationNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface A11yViolation {
  id: string;
  impact: A11ySeverity | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
}

export interface A11yScanOptions {
  /** WCAG rule sets to check against. Default: WCAG 2.1 Level A + AA. */
  tags?: A11yTag[];
  /** Restrict the scan to elements matching this CSS selector. */
  include?: string;
  /** Exclude elements matching this CSS selector (e.g. known third-party widgets). */
  exclude?: string;
  /** Specific axe rule IDs to skip entirely (e.g. a documented false positive). */
  disableRules?: string[];
}

const SEVERITY_RANK: Record<A11ySeverity, number> = {
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
};

// ─── AccessibilityHelper ────────────────────────────────────────────────────────

export class AccessibilityHelper {
  constructor(private readonly page: Page) {}

  // ─── Scanning ────────────────────────────────────────────────────────────────

  /**
   * Run an axe-core scan against the current page (or a scoped region).
   * Defaults to WCAG 2.1 Level A + AA — the most commonly required bar.
   * Automatically attaches the raw results to the test report.
   */
  async scan(options: A11yScanOptions = {}): Promise<A11yViolation[]> {
    const {
      tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      include,
      exclude,
      disableRules,
    } = options;

    let builder = new AxeBuilder({ page: this.page }).withTags(tags);
    if (include) builder = builder.include(include);
    if (exclude) builder = builder.exclude(exclude);
    if (disableRules?.length) builder = builder.disableRules(disableRules);

    pageLogger.debug(`Accessibility scan starting (tags: ${tags.join(', ')})`);
    const results = await builder.analyze();
    const violations = results.violations as A11yViolation[];

    if (violations.length > 0) {
      pageLogger.warn(`Accessibility scan: ${violations.length} violation type(s) found`);
    } else {
      pageLogger.info('Accessibility scan: no violations found');
    }

    await attachJson('Accessibility scan results', violations);
    return violations;
  }

  /** Scan only a specific component/region instead of the whole page. */
  async scanElement(
    selector: string,
    options: Omit<A11yScanOptions, 'include'> = {}
  ): Promise<A11yViolation[]> {
    return this.scan({ ...options, include: selector });
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  /** Violations at or above the given severity (default: 'minor' — i.e. everything). */
  filterBySeverity(violations: A11yViolation[], minSeverity: A11ySeverity = 'minor'): A11yViolation[] {
    const threshold = SEVERITY_RANK[minSeverity];
    return violations.filter((v) => v.impact !== null && SEVERITY_RANK[v.impact] >= threshold);
  }

  /** Total number of affected elements across all violations (not just violation types). */
  countAffectedElements(violations: A11yViolation[]): number {
    return violations.reduce((sum, v) => sum + v.nodes.length, 0);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert there are no violations at or above `minSeverity` (default: 'serious').
   * Violations below the threshold are still logged/attached, but don't fail
   * the test — useful when scanning third-party or legacy UI with known,
   * lower-severity issues that aren't worth gating the build on.
   */
  assertNoViolations(violations: A11yViolation[], options: { minSeverity?: A11ySeverity } = {}): void {
    const { minSeverity = 'serious' } = options;
    const blocking = this.filterBySeverity(violations, minSeverity);

    expect(
      blocking,
      blocking.length > 0
        ? `Found ${blocking.length} accessibility violation(s) at "${minSeverity}" or above:\n${this.formatViolations(blocking)}`
        : undefined
    ).toHaveLength(0);
  }

  /** Strict variant — fails on any violation at all, regardless of severity. */
  assertFullyCompliant(violations: A11yViolation[]): void {
    expect(
      violations,
      violations.length > 0
        ? `Found ${violations.length} accessibility violation(s):\n${this.formatViolations(violations)}`
        : undefined
    ).toHaveLength(0);
  }

  // ─── Reporting ───────────────────────────────────────────────────────────────

  /** Human-readable summary of violations — one line per rule, with affected element count. */
  formatViolations(violations: A11yViolation[]): string {
    if (violations.length === 0) return 'No accessibility violations';
    return violations
      .map(
        (v) =>
          `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help} (${v.nodes.length} element(s)) — ${v.helpUrl}`
      )
      .join('\n');
  }
}
