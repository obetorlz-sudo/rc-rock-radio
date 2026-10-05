import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;
const rut = 'ADMIN';
const password = process.env.RC360_INIT_VALUE || '';
if(!process.env.DATABASE_URL || !password) throw new Error('Falta configuración de inicialización');
const pool = new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const hash = await bcrypt.hash(password,12);
await pool.query(`insert into rc360_users(rut,full_name,role,password_hash) values($1,$2,'admin',$3)
 on conflict(rut) do update set full_name=excluded.full_name,role='admin',password_hash=excluded.password_hash,active=true`,[rut,'Administrador RC Leadership 360',hash]);
console.log('Administrador RC360 creado/actualizado');
await pool.end();
