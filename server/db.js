import pg from 'pg';
import { HttpError } from './http.js';

const { Pool } = pg;

let pool;

function databaseUrlConfigured() {
  return Boolean(String(process.env.DATABASE_URL || '').trim());
}

function logDatabaseError(error, operation) {
  console.error('ChipBelem database error', {
    operation,
    DATABASE_URL_CONFIGURED: databaseUrlConfigured(),
    code: error?.code || error?.cause?.code || 'unknown',
    message: error?.message || 'unknown'
  });
  if (error?.code === '42P01') {
    console.error('ChipBelem database setup hint', {
      message: 'Banco nao inicializado. Execute database/schema.sql e migrations.'
    });
  }
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    logDatabaseError({ code: 'database_url_missing', message: 'DATABASE_URL nao configurada.' }, 'getPool');
    throw new HttpError(500, 'DATABASE_URL nao configurada no ambiente da Vercel.', 'database_url_missing');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    });
  }

  return pool;
}

export async function query(text, params) {
  try {
    return await getPool().query(text, params);
  } catch (error) {
    logDatabaseError(error, 'query');
    throw error;
  }
}

export async function transaction(callback) {
  let client;
  try {
    client = await getPool().connect();
  } catch (error) {
    logDatabaseError(error, 'transaction.connect');
    throw error;
  }
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logDatabaseError(error, 'transaction');
    throw error;
  } finally {
    client.release();
  }
}
