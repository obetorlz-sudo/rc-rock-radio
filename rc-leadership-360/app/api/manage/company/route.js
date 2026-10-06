import { NextResponse } from 'next/server';
import { query,tx } from '../../../../lib/db';
import { getSession,hashPassword } from '../../../../lib/security';
import { normalizeRut,validRut } from '../../../../lib/rut';

export async function POST(req){
  const s=await getSession();
  if(!s||s.role!=='admin')return NextResponse.json({error:'Solo administrador.'},{status:403});
  try{
    const b=await req.json();
    const action=b.action||'create';

    if(action==='create'){
      const rut=normalizeRut(b.rut);
      if(!validRut(rut))return NextResponse.json({error:'RUT de empresa inválido.'},{status:400});
      if(!b.name||!b.password)return NextResponse.json({error:'Nombre y contraseña son obligatorios.'},{status:400});
      const hash=await hashPassword(b.password);
      const out=await tx(async c=>{
        const co=await c.query('insert into rc360_companies(name,rut,email) values($1,$2,$3) returning id,name,rut',[String(b.name).trim(),rut,b.email||null]);
        await c.query(`insert into rc360_users(company_id,rut,full_name,role,password_hash) values($1,$2,$3,'company',$4)`,[co.rows[0].id,rut,String(b.name).trim(),hash]);
        return co.rows[0];
      });
      return NextResponse.json(out);
    }

    if(!b.id)return NextResponse.json({error:'Empresa inválida.'},{status:400});

    if(action==='update'){
      const rut=normalizeRut(b.rut);
      if(!validRut(rut))return NextResponse.json({error:'RUT de empresa inválido.'},{status:400});
      const out=await tx(async c=>{
        const co=await c.query(`update rc360_companies set name=$2,rut=$3,email=$4 where id=$1 returning id,name,rut,email,active`,
          [b.id,String(b.name||'').trim(),rut,b.email||null]);
        if(!co.rows[0])throw new Error('Empresa no encontrada');
        await c.query(`update rc360_users set rut=$2,full_name=$3 where company_id=$1 and role='company'`,[b.id,rut,String(b.name||'').trim()]);
        return co.rows[0];
      });
      return NextResponse.json(out);
    }

    if(action==='toggle'){
      const {rows}=await query(`update rc360_companies set active=not active where id=$1 returning id,active`,[b.id]);
      if(rows[0])await query(`update rc360_users set active=$2 where company_id=$1 and role='company'`,[b.id,rows[0].active]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='reset_password'){
      if(!b.password||String(b.password).length<6)return NextResponse.json({error:'Ingresa una contraseña de al menos 6 caracteres.'},{status:400});
      const hash=await hashPassword(String(b.password));
      const {rows}=await query(`update rc360_users set password_hash=$2,active=true where company_id=$1 and role='company' returning id,rut,active`,[b.id,hash]);
      if(!rows[0])return NextResponse.json({error:'La empresa no tiene un usuario de acceso asociado.'},{status:404});
      return NextResponse.json({ok:true,user:rows[0]});
    }

    return NextResponse.json({error:'Acción no válida.'},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.code==='23505'?'Ese RUT ya está registrado.':'No fue posible gestionar la empresa.'},{status:500});
  }
}
