import pg from 'pg'; import bcrypt from 'bcryptjs';
const {Pool}=pg; const rut=(process.env.BOOTSTRAP_ADMIN_RUT||'').toUpperCase().replace(/[^0-9K]/g,'');
const password=process.env.BOOTSTRAP_ADMIN_PASSWORD||'';
if(!process.env.DATABASE_URL||!rut||!password) throw new Error('Define DATABASE_URL, BOOTSTRAP_ADMIN_RUT y BOOTSTRAP_ADMIN_PASSWORD');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const hash=await bcrypt.hash(password,12);
await pool.query(`insert into rc360_users(rut,full_name,role,password_hash) values($1,$2,'admin',$3)
 on conflict(rut) do update set full_name=excluded.full_name,role='admin',password_hash=excluded.password_hash,active=true`,[rut,'Administrador RC Leadership 360',hash]);
console.log('Administrador creado/actualizado:',rut); await pool.end();
