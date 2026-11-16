import { DbClientFactory } from './DbClientFactory';
import { QueryResult } from './types';

export async function fetchRowsFromDatabase<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = DbClientFactory.create();
  await client.connect();

  try {
    const result: QueryResult<T> = await client.query<T>(sql, { params });
    return result.rows;
  } finally {
    await client.disconnect();
  }
}

export async function isDatabaseReady(): Promise<boolean> {
  const client = DbClientFactory.create();
  return client.isConfigured();
}