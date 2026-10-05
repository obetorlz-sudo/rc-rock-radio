import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
const { Pool } = pg;
let pool = globalThis.__rc360Pool;
if(!pool){
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized:false }, max:4 });
  try { attachDatabasePool(pool); } catch {}
  if(process.env.NODE_ENV!=='production') globalThis.__rc360Pool=pool;
}
export async function query(text, params=[]){ return pool.query(text,params); }
export async function tx(fn){ const c=await pool.connect(); try{ await c.query('begin'); const out=await fn(c); await c.query('commit'); return out; }catch(e){ await c.query('rollback'); throw e; }finally{ c.release(); } }
