import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';

export async function POST(req){
  const s=await getSession();
  if(!s)return NextResponse.json({error:'No autorizado.'},{status:401});
  if(!['admin','company'].includes(s.role))return NextResponse.json({error:'Sin acceso para crear ciclos.'},{status:403});
  try{
    const b=await req.json();
    const sup=(await query('select id,company_id from rc360_supervisors where id=$1',[b.supervisorId])).rows[0];
    if(!sup)return NextResponse.json({error:'Supervisor no encontrado.'},{status:404});
    if(s.role==='company'&&String(sup.company_id)!==String(s.companyId))return NextResponse.json({error:'Sin acceso.'},{status:403});
    if(!b.cycleName)return NextResponse.json({error:'Nombre del ciclo obligatorio.'},{status:400});

    const existing=(await query(`select id,cycle_name,status
      from rc360_assessments
      where supervisor_id=$1 and status='open'
      order by created_at desc limit 1`,[sup.id])).rows[0];

    if(existing){
      return NextResponse.json({...existing,reused:true});
    }

    const {rows}=await query(`insert into rc360_assessments(company_id,supervisor_id,cycle_name)
      values($1,$2,$3) returning id,cycle_name,status`,[sup.company_id,sup.id,b.cycleName]);
    return NextResponse.json(rows[0]);
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible abrir el ciclo.'},{status:500});
  }
}
