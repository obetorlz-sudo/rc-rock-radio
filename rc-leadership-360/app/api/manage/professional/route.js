import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession,hashPassword } from '../../../../lib/security';
export async function POST(req){
  const s=await getSession();
  if(!s||s.role!=='admin') return NextResponse.json({error:'Solo administrador.'},{status:403});
  try{
    const b=await req.json();
    const username=String(b.username||'').trim().toUpperCase().replace(/\s+/g,'');
    if(!username||username.length<4||!b.fullName||!b.password) return NextResponse.json({error:'Nombre, usuario y contraseña son obligatorios.'},{status:400});
    const hash=await hashPassword(b.password);
    const {rows}=await query(`insert into rc360_users(rut,full_name,role,password_hash)
      values($1,$2,'psychologist',$3)
      on conflict(rut) do update set full_name=excluded.full_name,role='psychologist',password_hash=excluded.password_hash,active=true
      returning id,rut,full_name,role`,[username,b.fullName,hash]);
    return NextResponse.json(rows[0]);
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible crear el usuario profesional.'},{status:500});}
}
