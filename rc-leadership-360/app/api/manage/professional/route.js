import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut } from '../../../../lib/rut';
import { getSession,hashPassword } from '../../../../lib/security';

function cleanUser(v){
  const raw=String(v||'').trim();
  const looksRut=/^[0-9kK.\-]+$/.test(raw);
  return looksRut?normalizeRut(raw):raw.toUpperCase().replace(/\s+/g,'');
}

export async function POST(req){
  const s=await getSession();
  if(!s||s.role!=='admin') return NextResponse.json({error:'Solo administrador.'},{status:403});
  try{
    const b=await req.json();
    const action=b.action||'create';

    if(action==='create'){
      const username=cleanUser(b.username);
      if(!username||username.length<4||!b.fullName||!b.password)return NextResponse.json({error:'Nombre, usuario/RUT y contraseña son obligatorios.'},{status:400});
      const hash=await hashPassword(String(b.password));
      const {rows}=await query(`insert into rc360_users(rut,full_name,role,password_hash,active)
        values($1,$2,'psychologist',$3,true)
        on conflict(rut) do update set full_name=excluded.full_name,role='psychologist',password_hash=excluded.password_hash,active=true
        returning id,rut,full_name,role,active`,[username,String(b.fullName).trim(),hash]);
      return NextResponse.json(rows[0]);
    }

    if(!b.id)return NextResponse.json({error:'Profesional inválido.'},{status:400});

    if(action==='update'){
      const username=cleanUser(b.username);
      if(!username||!b.fullName)return NextResponse.json({error:'Nombre y usuario/RUT son obligatorios.'},{status:400});
      const {rows}=await query(`update rc360_users set rut=$2,full_name=$3,role='psychologist'
        where id=$1 and role='psychologist' returning id,rut,full_name,role,active`,
        [b.id,username,String(b.fullName).trim()]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='toggle'){
      const {rows}=await query(`update rc360_users set active=not active
        where id=$1 and role='psychologist' returning id,rut,full_name,active`,[b.id]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='reset_password'){
      if(!b.password||String(b.password).length<6)return NextResponse.json({error:'Ingresa una contraseña de al menos 6 caracteres.'},{status:400});
      const hash=await hashPassword(String(b.password));
      const {rows}=await query(`update rc360_users set password_hash=$2,active=true
        where id=$1 and role='psychologist' returning id,rut,full_name,active`,[b.id,hash]);
      if(!rows[0])return NextResponse.json({error:'Profesional no encontrado.'},{status:404});
      return NextResponse.json({ok:true,user:rows[0]});
    }

    return NextResponse.json({error:'Acción no válida.'},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.code==='23505'?'Ese usuario/RUT ya está registrado.':'No fue posible gestionar el usuario profesional.'},{status:500});
  }
}
