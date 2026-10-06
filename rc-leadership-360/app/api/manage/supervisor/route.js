import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';
import { normalizeRut,validRut } from '../../../../lib/rut';

export async function POST(req){
  const s=await getSession();
  if(!s)return NextResponse.json({error:'No autorizado.'},{status:401});
  try{
    const b=await req.json();
    const action=b.action||'create';

    if(action==='create'){
      const companyId=s.role==='company'?s.companyId:b.companyId;
      if(!companyId)return NextResponse.json({error:'Selecciona empresa.'},{status:400});
      if(!['admin','company'].includes(s.role))return NextResponse.json({error:'Sin acceso.'},{status:403});
      const rut=normalizeRut(b.rut);
      if(!validRut(rut))return NextResponse.json({error:'RUT del supervisor inválido.'},{status:400});
      const {rows}=await query(`insert into rc360_supervisors(company_id,rut,full_name,position,area,email)
        values($1,$2,$3,$4,$5,$6) returning id,full_name,rut`,
        [companyId,rut,String(b.fullName||'').trim(),b.position||null,b.area||null,b.email||null]);
      return NextResponse.json(rows[0]);
    }

    if(s.role!=='admin')return NextResponse.json({error:'Solo administrador puede editar registros.'},{status:403});
    if(!b.id)return NextResponse.json({error:'Supervisor inválido.'},{status:400});

    if(action==='update'){
      const rut=normalizeRut(b.rut);
      if(!validRut(rut))return NextResponse.json({error:'RUT del supervisor inválido.'},{status:400});
      const {rows}=await query(`update rc360_supervisors
        set company_id=$2,rut=$3,full_name=$4,position=$5,area=$6,email=$7
        where id=$1 returning id,full_name,rut,active`,
        [b.id,b.companyId,rut,String(b.fullName||'').trim(),b.position||null,b.area||null,b.email||null]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='toggle'){
      const {rows}=await query('update rc360_supervisors set active=not active where id=$1 returning id,active',[b.id]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='delete'){
      const {rows}=await query('delete from rc360_supervisors where id=$1 returning id,full_name,rut',[b.id]);
      if(!rows[0])return NextResponse.json({error:'Supervisor no encontrado.'},{status:404});
      return NextResponse.json({ok:true,deleted:rows[0]});
    }

    return NextResponse.json({error:'Acción no válida.'},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.code==='23505'?'Ese supervisor ya existe en la empresa seleccionada.':'No fue posible gestionar el supervisor.'},{status:500});
  }
}
