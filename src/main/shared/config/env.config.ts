import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─── Types ────────────────────────────────────────────────────────────────────

export type BrowserType = 'chromium' | 'firefox' | 'webkit';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type DatabaseType = 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite' | 'generic';

export interface EnvConfig {
  // Application
  baseUrl: string;
  credentials: {
    username: string;
    password: string;
  };

  // API
  apiBaseUrl: string;
  apiTimeout: number;

  // Browser
  browser: BrowserType;
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
  actionTimeout: number;

  // Logging
  logLevel: LogLevel;

  // Database
  db: {
    enabled: boolean;
    type: DatabaseType;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    schema?: string;
    ssl: boolean;
    connectionTimeoutMs: number;
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(
      `Missing required environment variable: "${key}". ` +
      `Copy .env.example to .env and set the value.`
    );
  }
  return value;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ─── Config Export ────────────────────────────────────────────────────────────

export const ENV: EnvConfig = {
  // Application
  baseUrl: requireEnv('BASE_URL', 'https://opensource-demo.orangehrmlive.com'),
  credentials: {
    username: requireEnv('APP_USERNAME', 'Admin'),
    password: requireEnv('APP_PASSWORD', 'admin123'),
  },

  // API
  apiBaseUrl: requireEnv(
    'API_BASE_URL',
    'https://opensource-demo.orangehrmlive.com/web/index.php/api/v2'
  ),
  apiTimeout: toInt(process.env.API_TIMEOUT, 15000),

  // Browser
  browser: (process.env.BROWSER as BrowserType) || 'chromium',
  headless: toBool(process.env.HEADLESS, false),
  slowMo: toInt(process.env.SLOW_MO, 0),
  timeout: toInt(process.env.TIMEOUT, 30000),
  navigationTimeout: toInt(process.env.NAV_TIMEOUT, 30000),
  actionTimeout: toInt(process.env.ACTION_TIMEOUT, 10000),

  // Logging
  logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',

  // Database
  db: {
    enabled: toBool(process.env.DB_ENABLED, false),
    type: (process.env.DB_TYPE as DatabaseType) || 'generic',
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 0),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    schema: process.env.DB_SCHEMA || undefined,
    ssl: toBool(process.env.DB_SSL, false),
    connectionTimeoutMs: toInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
  },
};

export default ENV;
