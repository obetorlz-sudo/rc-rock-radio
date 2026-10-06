import fs from 'node:fs/promises';
import pg from 'pg';
import { SELF, TEAM } from '../lib/instrument.js';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
const sql = await fs.readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await pool.query(sql);
  for(const [mode,items] of [['self',SELF],['team',TEAM]]){
    for(let i=0;i<items.length;i++){
      const q=items[i];
      await pool.query(`insert into rc360_questions(mode,text,disc,competency,reverse,position,active)
        values($1,$2,$3,$4,$5,$6,true)
        on conflict(mode,position) do nothing`,
        [mode,q.text,q.disc,q.competency,!!q.reverse,i+1]);
    }
  }
  console.log('RC360 schema ready');
} finally {
  await pool.end();
}
