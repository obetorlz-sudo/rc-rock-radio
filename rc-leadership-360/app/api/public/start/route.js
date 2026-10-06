import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut, validRut } from '../../../../lib/rut';
export async function POST(req){
  try{
    const {mode,rut}=await req.json(); const r=normalizeRut(rut);
    if(!validRut(r)) return NextResponse.json({error:'RUT inválido.'},{status:400});
    const team=mode==='team';
    if(!['self','team'].includes(mode))return NextResponse.json({error:'Modo inválido.'},{status:400});
    const {rows}=await query(`select a.id assessment_id,s.full_name supervisor_name,c.name company_name,a.cycle_name
      from rc360_assessments a join rc360_supervisors s on s.id=a.supervisor_id join rc360_companies c on c.id=a.company_id
      where a.status='open' and s.active=true and s.rut=$1 ${team?'and a.team_survey_open=true':'and a.self_completed_at is null'}
      order by a.created_at desc limit 1`,[r]);
    if(!rows.length) return NextResponse.json({error:'No existe una evaluación abierta asociada a ese RUT.'},{status:404});
    const qs=await query(`select id,text,disc,competency,position from rc360_questions
      where mode=$1 and active=true and deleted_at is null order by position,id`,[mode]);
    if(!qs.rows.length)return NextResponse.json({error:'La evaluación no tiene preguntas activas.'},{status:409});
    return NextResponse.json({...rows[0],questions:qs.rows});
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible iniciar la evaluación.'},{status:500});}
}
