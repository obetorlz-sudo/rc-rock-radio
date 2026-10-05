import fs from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
const sql = await fs.readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await pool.query(sql);
  console.log('RC360 schema ready');
} finally {
  await pool.end();
}