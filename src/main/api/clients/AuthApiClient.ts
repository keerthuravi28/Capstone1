import { ApiAssertions } from '../base/ApiAssertions';
import { ENV } from '../../shared/config/env.config';
import { aiLogger as apiLogger } from '../../shared/utils/logger';

/**
 * AuthApiClient
 * ──────────────
 * Handles authentication with OrangeHRM.
 *
 * OrangeHRM uses SESSION-COOKIE auth (there is no public token endpoint on the
 * demo instance): we load the login page, extract the CSRF token, and submit
 * the login form. The session cookie is then stored in the underlying
 * APIRequestContext automatically, so every ApiClient sharing that context is
 * authenticated for subsequent /api/v2 calls.
 *
 * Usage:
 *   const authApi = new AuthApiClient(request);
 *   await authApi.login('Admin', 'admin123');
 *   const employeeApi = new EmployeeApiClient(request); // same context → authenticated
 */
export class AuthApiClient extends ApiAssertions {

  private readonly webBase = `${ENV.baseUrl}/web/index.php`;

  /**
   * Fetch the login page and extract the CSRF token embedded in the form.
   */
  private async fetchCsrfToken(): Promise<string> {
    const response = await this.request.get(`${this.webBase}/auth/login`);
    const html = await response.text();

    const match = html.match(/:token="&quot;(.+?)&quot;"/);
    if (!match) {
      throw new Error('Could not extract CSRF token from the OrangeHRM login page');
    }
    return match[1];
  }

  /**
   * Attempt to log in and establish an API session on this request context.
   * Returns true when login succeeded (redirect to dashboard), false otherwise.
   * Does NOT throw on bad credentials — use for negative tests.
   */
  async tryLogin(username: string, password: string): Promise<boolean> {
    apiLogger.info(`Attempting API session login for user: ${username}`);

    const csrfToken = await this.fetchCsrfToken();

    const response = await this.request.post(`${this.webBase}/auth/validate`, {
      form: { _token: csrfToken, username, password },
      maxRedirects: 0,
    });

    const location = response.headers()['location'] ?? '';
    const success = response.status() === 302 && location.includes('/dashboard');

    apiLogger.info(
      success
        ? 'API session established'
        : `API session login failed (status ${response.status()}, redirected to ${location || 'n/a'})`
    );
    return success;
  }

  /**
   * Log in and throw if it fails — use for setup/happy paths.
   */
  async login(username: string, password: string): Promise<void> {
    const success = await this.tryLogin(username, password);
    if (!success) {
      throw new Error(`API session login failed for user "${username}"`);
    }
  }

  /**
   * Log in using credentials from ENV (default admin).
   */
  async loginFromEnv(): Promise<void> {
    await this.login(ENV.credentials.username, ENV.credentials.password);
  }
}
