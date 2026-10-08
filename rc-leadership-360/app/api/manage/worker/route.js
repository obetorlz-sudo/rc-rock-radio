import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';
import { normalizeRut, validRut } from '../../../../lib/rut';

async function ensure(){
  await query(`create table if not exists rc360_workers(
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references rc360_companies(id) on delete cascade,
    rut text not null,
    full_name text,
    area text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    unique(company_id,rut)
  )`);
}

export async function POST(req){
  const s=await getSession();
  if(!s||s.role!=='admin') return NextResponse.json({error:'Solo administrador.'},{status:403});
  try{
    await ensure();
    const b=await req.json();
    const action=b.action||'create';
    if(action==='create'){
      const rut=normalizeRut(b.rut);
      if(!b.companyId||!validRut(rut)) return NextResponse.json({error:'Empresa y RUT válido son obligatorios.'},{status:400});
      const {rows}=await query(`insert into rc360_workers(company_id,rut,full_name,area)
        values($1,$2,$3,$4) returning *`,[b.companyId,rut,String(b.fullName||'').trim()||null,String(b.area||'').trim()||null]);
      return NextResponse.json(rows[0]);
    }
    if(!b.id) return NextResponse.json({error:'Trabajador inválido.'},{status:400});
    if(action==='toggle'){
      const {rows}=await query('update rc360_workers set active=not active where id=$1 returning *',[b.id]);
      return NextResponse.json(rows[0]||{});
    }
    if(action==='delete'){
      const {rows}=await query('delete from rc360_workers where id=$1 returning id,rut,full_name',[b.id]);
      return NextResponse.json({ok:true,deleted:rows[0]||null});
    }
    return NextResponse.json({error:'Acción no válida.'},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.code==='23505'?'Ese trabajador ya está registrado en la empresa.':'No fue posible gestionar el trabajador.'},{status:500});
  }
}
