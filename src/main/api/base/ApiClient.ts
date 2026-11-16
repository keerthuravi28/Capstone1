import { APIRequestContext, APIResponse } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from '../../shared/config/env.config';
import { aiLogger as apiLogger } from '../../shared/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  /** Raw response body text — populated even when the body isn't valid JSON. */
  raw: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  duration: number;
}

export interface MultipartFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export interface RequestOptions {
  /** Query string parameters. Undefined values are stripped. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Extra headers merged on top of the client defaults. */
  headers?: Record<string, string>;
  /** JSON request body. */
  data?: unknown;
  /** Multipart form fields — for file uploads. Mutually exclusive with `data`. */
  multipart?: Record<string, string | MultipartFile>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Best-effort MIME type lookup by file extension, for multipart uploads. */
function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

/**
 * Base API client shared across all domain clients.
 * Built on Playwright's native APIRequestContext — no external HTTP library.
 *
 * Responsibilities:
 *  - Resolve relative URLs against the API base URL from ENV
 *  - Inject the Authorization header automatically once a token is set
 *  - Log every request and response (URL, method, status, duration)
 *  - Wrap responses in a consistent, typed ApiResponse shape
 *
 * Non-2xx responses do NOT throw — assert on `status`/`ok` in the test.
 */
export class ApiClient {
  protected readonly request: APIRequestContext;
  protected readonly baseURL: string;

  private token: string | null = null;
  private tokenType = 'Bearer';
  private defaultHeaders: Record<string, string> = {};

  constructor(request: APIRequestContext, baseURL?: string) {
    this.request = request;
    this.baseURL = baseURL ?? ENV.apiBaseUrl;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /** Set the bearer token injected into every subsequent request. */
  setToken(token: string, tokenType = 'Bearer'): void {
    this.token = token;
    this.tokenType = tokenType;
  }

  clearToken(): void {
    this.token = null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /** HTTP Basic auth — base64-encodes credentials into the Authorization header. */
  setBasicAuth(username: string, password: string): void {
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    this.setToken(encoded, 'Basic');
  }

  /** API-key auth via a custom header (e.g. "X-API-Key") — independent of the bearer token. */
  setApiKey(key: string, headerName = 'X-API-Key'): void {
    this.setDefaultHeader(headerName, key);
  }

  // ─── Default Headers ─────────────────────────────────────────────────────────
  // Persist headers (tenant IDs, API keys, feature flags, …) across every
  // subsequent request without having to pass them into each call.

  setDefaultHeader(name: string, value: string): void {
    this.defaultHeaders[name] = value;
  }

  removeDefaultHeader(name: string): void {
    delete this.defaultHeaders[name];
  }

  clearDefaultHeaders(): void {
    this.defaultHeaders = {};
  }

  // ─── HTTP Methods ──────────────────────────────────────────────────────────

  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.send<T>('GET', url, options);
  }

  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.send<T>('POST', url, { ...options, data });
  }

  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.send<T>('PUT', url, { ...options, data });
  }

  async patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.send<T>('PATCH', url, { ...options, data });
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.send<T>('DELETE', url, options);
  }

  // ─── File Upload ─────────────────────────────────────────────────────────────

  /**
   * Upload a file as multipart/form-data.
   * @param url         Endpoint (relative to baseURL, or absolute)
   * @param fieldName   Form field name the server expects for the file
   * @param filePath    Path to the file on disk
   * @param extraFields Additional plain string fields to send alongside the file
   */
  async postFile<T>(
    url: string,
    fieldName: string,
    filePath: string,
    extraFields: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    const fileName = path.basename(filePath);
    apiLogger.info(`Uploading file: ${fileName} → ${url}`);
    return this.send<T>('POST', url, {
      multipart: {
        ...extraFields,
        [fieldName]: {
          name: fileName,
          mimeType: guessMimeType(fileName),
          buffer: fs.readFileSync(filePath),
        },
      },
    });
  }

  // ─── Retry / Polling ─────────────────────────────────────────────────────────

  /**
   * Retry a request-returning function on transient failures (network errors,
   * or a response status in `retryOn`), with linear backoff between attempts.
   * Returns the last response/error if every attempt is exhausted.
   *
   * @example
   * const response = await apiClient.withRetry(() => this.get('/pim/employees'), { retries: 3 });
   */
  async withRetry<T>(
    fn: () => Promise<ApiResponse<T>>,
    options: { retries?: number; delayMs?: number; retryOn?: number[] } = {}
  ): Promise<ApiResponse<T>> {
    const { retries = 3, delayMs = 500, retryOn = [408, 429, 500, 502, 503, 504] } = options;

    let lastResponse: ApiResponse<T> | undefined;
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        lastResponse = await fn();
        if (lastResponse.ok || !retryOn.includes(lastResponse.status)) {
          return lastResponse;
        }
        apiLogger.warn(`withRetry ${attempt}/${retries + 1}: status ${lastResponse.status}`);
      } catch (err) {
        lastError = err;
        apiLogger.warn(`withRetry ${attempt}/${retries + 1}: request threw — ${String(err)}`);
      }
      if (attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }

    if (lastResponse) return lastResponse;
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Poll a request-returning function until `predicate` passes on its
   * response, or `timeout` elapses. Useful for eventually-consistent APIs
   * (e.g. waiting for an async job/status to settle).
   *
   * @example
   * await apiClient.pollUntil(
   *   () => employeeApi.getEmployeeById(empNumber),
   *   (res) => res.data.data.terminationId !== null,
   *   { timeout: 10000, interval: 1000, message: 'employee not terminated yet' }
   * );
   */
  async pollUntil<T>(
    fn: () => Promise<ApiResponse<T>>,
    predicate: (response: ApiResponse<T>) => boolean,
    options: { timeout?: number; interval?: number; message?: string } = {}
  ): Promise<ApiResponse<T>> {
    const { timeout = 10000, interval = 1000, message = 'Condition not met' } = options;
    const deadline = Date.now() + timeout;

    let lastResponse = await fn();
    while (!predicate(lastResponse)) {
      if (Date.now() > deadline) {
        throw new Error(`pollUntil timed out after ${timeout}ms: ${message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      lastResponse = await fn();
    }
    return lastResponse;
  }

  // ─── Core ──────────────────────────────────────────────────────────────────

  private async send<T>(
    method: HttpMethod,
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    const headers: Record<string, string> = {
      ...(this.token ? { Authorization: `${this.tokenType} ${this.token}` } : {}),
      ...this.defaultHeaders,
      ...options.headers,
    };

    apiLogger.debug(`→ ${method} ${fullUrl}`, {
      params: options.params,
      body: options.data,
    });

    const start = Date.now();
    const response = await this.request.fetch(fullUrl, {
      method,
      headers,
      params: this.cleanParams(options.params),
      data: options.data,
      multipart: options.multipart,
      timeout: ENV.apiTimeout,
    });
    const duration = Date.now() - start;
    const wrapped = await this.wrap<T>(response, duration);

    if (wrapped.ok) {
      apiLogger.info(`← ${wrapped.status} ${method} ${fullUrl} (${duration}ms)`);
    } else {
      apiLogger.warn(`← ${wrapped.status} ${method} ${fullUrl} (${duration}ms)`, {
        body: wrapped.raw || '<empty>',
      });
    }

    return wrapped;
  }

  private cleanParams(
    params?: Record<string, string | number | boolean | undefined>
  ): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined;
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) as Record<string, string | number | boolean>;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  private async wrap<T>(response: APIResponse, duration: number): Promise<ApiResponse<T>> {
    const raw = await response.text().catch(() => '');

    let data: T;
    try {
      data = raw ? (JSON.parse(raw) as T) : (undefined as T);
    } catch {
      data = undefined as T; // non-JSON body — still available via `raw`
    }

    return {
      data,
      raw,
      status: response.status(),
      ok: response.ok(),
      headers: response.headers(),
      duration,
    };
  }
}
