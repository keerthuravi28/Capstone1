import { ENV } from '../config/env.config';
import { GenericDatabaseClient } from './GenericDatabaseClient';
import { DatabaseClient } from './types';

export class DbClientFactory {
  static create(): DatabaseClient {
    return new GenericDatabaseClient(ENV.db);
  }
}