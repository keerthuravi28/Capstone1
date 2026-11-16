import { expect } from '@playwright/test';
import { ZodType } from 'zod';
import { ApiClient, ApiResponse } from './ApiClient';

// ─── Path Helper ──────────────────────────────────────────────────────────────

/** Read a nested value by dot path, e.g. getByPath(obj, 'data.data.0.empNumber'). */
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * ApiAssertions
 * ──────────────
 * Generic, API-agnostic verification layer — the API-side equivalent of
 * WebAssertions. Extends ApiClient so every domain API client (AuthApiClient,
 * EmployeeApiClient, …) inherits both request methods and assertions through
 * a single base, mirroring the UI layering:
 *
 *   ApiClient (requests/auth/retry/polling)
 *     └── ApiAssertions (verifications)
 *           └── domain clients (application-facing)
 *
 * All methods take the ApiResponse<T> returned by ApiClient's request
 * methods — no re-fetching, no hidden state.
 */
export class ApiAssertions extends ApiClient {

  // ─── Status ──────────────────────────────────────────────────────────────────

  /** Assert the response status equals `expected`, or is one of `expected` if given an array. */
  assertStatus<T>(response: ApiResponse<T>, expected: number | number[]): void {
    if (Array.isArray(expected)) {
      expect(
        expected,
        `Expected status to be one of [${expected.join(', ')}] but got ${response.status}. Body: ${response.raw}`
      ).toContain(response.status);
    } else {
      expect(response.status, `Body: ${response.raw}`).toBe(expected);
    }
  }

  /** Assert a 2xx response. */
  assertOk<T>(response: ApiResponse<T>): void {
    expect(response.ok, `Expected a 2xx response but got ${response.status}. Body: ${response.raw}`).toBe(true);
  }

  /** Assert a successful create. `expectedStatus` defaults to 200 (OrangeHRM's convention) — override for APIs that return 201. */
  assertCreated<T>(response: ApiResponse<T>, expectedStatus = 200): void {
    this.assertStatus(response, expectedStatus);
  }

  /** Assert a validation error. `expectedStatus` defaults to 422 (OrangeHRM's convention) — override for APIs that return 400. */
  assertBadRequest<T>(response: ApiResponse<T>, expectedStatus = 422): void {
    this.assertStatus(response, expectedStatus);
  }

  assertUnauthorized<T>(response: ApiResponse<T>): void {
    this.assertStatus(response, 401);
  }

  assertForbidden<T>(response: ApiResponse<T>): void {
    this.assertStatus(response, 403);
  }

  assertNotFound<T>(response: ApiResponse<T>): void {
    this.assertStatus(response, 404);
  }

  // ─── Performance ─────────────────────────────────────────────────────────────

  assertResponseTimeBelow<T>(response: ApiResponse<T>, maxMs: number): void {
    expect(
      response.duration,
      `Expected response time under ${maxMs}ms but took ${response.duration}ms`
    ).toBeLessThan(maxMs);
  }

  // ─── Headers ─────────────────────────────────────────────────────────────────
  // Playwright returns header names lower-cased — pass the name in any case.

  assertHeader<T>(response: ApiResponse<T>, name: string, expected: string | RegExp): void {
    const actual = response.headers[name.toLowerCase()];
    expect(actual, `Expected header "${name}" to be present`).toBeDefined();
    if (expected instanceof RegExp) {
      expect(actual).toMatch(expected);
    } else {
      expect(actual).toBe(expected);
    }
  }

  assertHeaderExists<T>(response: ApiResponse<T>, name: string): void {
    expect(response.headers[name.toLowerCase()], `Expected header "${name}" to be present`).toBeDefined();
  }

  // ─── Body Shape / Values ─────────────────────────────────────────────────────
  // `path` is a dot path into the parsed body, e.g. 'data.empNumber' or 'data.data.0.firstName'.

  assertHasProperty<T>(response: ApiResponse<T>, path: string): void {
    const value = getByPath(response.data, path);
    expect(value, `Expected response body to have property "${path}". Body: ${response.raw}`).not.toBeUndefined();
  }

  assertPropertyEquals<T>(response: ApiResponse<T>, path: string, expected: unknown): void {
    const value = getByPath(response.data, path);
    expect(value, `Property "${path}". Body: ${response.raw}`).toEqual(expected);
  }

  /** Assert the object at `path` (default: the whole body) has every key in `keys`. */
  assertHasKeys<T>(response: ApiResponse<T>, keys: string[], path = ''): void {
    const target = path ? getByPath(response.data, path) : response.data;
    for (const key of keys) {
      const hasKey = !!target && typeof target === 'object' && key in (target as object);
      expect(hasKey, `Expected "${path || 'body'}" to have key "${key}". Got: ${JSON.stringify(target)}`).toBe(true);
    }
  }

  assertArrayNotEmpty<T>(response: ApiResponse<T>, path: string): void {
    const value = getByPath(response.data, path);
    expect(Array.isArray(value), `Expected "${path}" to be an array. Got: ${JSON.stringify(value)}`).toBe(true);
    expect((value as unknown[]).length, `Expected "${path}" to be non-empty`).toBeGreaterThan(0);
  }

  assertArrayLength<T>(response: ApiResponse<T>, path: string, expectedLength: number): void {
    const value = getByPath(response.data, path);
    expect(Array.isArray(value), `Expected "${path}" to be an array. Got: ${JSON.stringify(value)}`).toBe(true);
    expect((value as unknown[]).length).toBe(expectedLength);
  }

  /** Assert the raw response body text contains `text` — useful for non-JSON or error bodies. */
  assertBodyContains<T>(response: ApiResponse<T>, text: string): void {
    expect(response.raw, `Expected response body to contain "${text}"`).toContain(text);
  }

  // ─── Contract / Schema ───────────────────────────────────────────────────────

  /**
   * Assert the response body matches a Zod schema — catches API contract
   * drift (a field renamed, removed, or retyped server-side) that
   * assertHasKeys/assertHasProperty's shape-only checks would miss, since
   * those don't check types or catch removed fields inside nested objects.
   *
   * Returns the parsed, schema-typed data on success so callers can use it
   * with full type safety afterward — unlike the response's own `data: T`,
   * this value has actually been verified to match `T` at runtime.
   *
   * @example
   * const employee = employeeApi.assertMatchesSchema(response, EmployeeResponseSchema);
   * // `employee` is typed AND runtime-verified — not just asserted by a cast.
   */
  assertMatchesSchema<T>(response: ApiResponse<unknown>, schema: ZodType<T>): T {
    const result = schema.safeParse(response.data);

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      const message = `Response body does not match the expected schema:\n${issues}\nBody: ${response.raw}`;
      expect(false, message).toBe(true);
      throw new Error(message); // unreachable — expect() above always throws first; satisfies TS narrowing below
    }

    return result.data;
  }
}
