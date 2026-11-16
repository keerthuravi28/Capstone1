import { dataLogger } from '../utils/logger';
import { DatabaseClient, DatabaseConnectionConfig, QueryOptions, QueryResult } from './types';

export class GenericDatabaseClient implements DatabaseClient {
  public readonly type;
  private connected = false;

  constructor(private readonly config: DatabaseConnectionConfig) {
    this.type = config.type;
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.enabled &&
      this.config.type &&
      this.config.host &&
      this.config.database &&
      this.config.user
    );
  }

  async connect(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(
        'Database is not fully configured. Set DB_ENABLED=true and provide DB_TYPE, DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env.'
      );
    }

    this.connected = true;
    dataLogger.info(
      `Generic database client initialized for future implementation (${this.config.type}) at ${this.config.host}:${this.config.port || 'default'}`
    );
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    dataLogger.info('Generic database client disconnected');
  }

  async query<T>(_sql: string, _options: QueryOptions = {}): Promise<QueryResult<T>> {
    if (!this.connected) {
      throw new Error('Database client is not connected. Call connect() before query().');
    }

    throw new Error(
      `No concrete database driver is implemented yet for type "${this.config.type}". Add a specific client later and wire it through the factory.`
    );
  }
}