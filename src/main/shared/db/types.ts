export type SupportedDatabaseType = 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite' | 'generic';

export interface DatabaseConnectionConfig {
  enabled: boolean;
  type: SupportedDatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
  ssl: boolean;
  connectionTimeoutMs: number;
}

export interface QueryOptions {
  params?: unknown[];
  timeoutMs?: number;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  executedAt: string;
  durationMs: number;
}

export interface DatabaseClient {
  readonly type: SupportedDatabaseType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConfigured(): boolean;
  query<T>(sql: string, options?: QueryOptions): Promise<QueryResult<T>>;
}