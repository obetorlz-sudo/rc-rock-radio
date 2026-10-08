import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut, validRut } from '../../../../lib/rut';

export async function POST(req){
  try{
    const body=await req.json();
    const mode=body.mode;
    if(!['self','team'].includes(mode)) return NextResponse.json({error:'Modo inválido.'},{status:400});

    if(mode==='self'){
      const r=normalizeRut(body.rut);
      if(!validRut(r)) return NextResponse.json({error:'RUT inválido.'},{status:400});
      const {rows}=await query(`select a.id assessment_id,s.full_name supervisor_name,c.name company_name,a.cycle_name
        from rc360_assessments a
        join rc360_supervisors s on s.id=a.supervisor_id
        join rc360_companies c on c.id=a.company_id
        where a.status='open' and s.active=true and s.rut=$1 and a.self_completed_at is null
        order by a.created_at desc limit 1`,[r]);
      if(!rows.length) return NextResponse.json({error:'No existe una evaluación abierta asociada a ese supervisor.'},{status:404});
      const qs=await query(`select id,text,disc,competency,position from rc360_questions
        where mode='self' and active=true and deleted_at is null order by position,id`);
      if(!qs.rows.length)return NextResponse.json({error:'La evaluación no tiene preguntas activas.'},{status:409});
      return NextResponse.json({...rows[0],rut:r,questions:qs.rows});
    }

    const workerRut=normalizeRut(body.workerRut||body.rut);
    if(!validRut(workerRut)) return NextResponse.json({error:'RUT del trabajador inválido.'},{status:400});

    if(!body.assessmentId){
      const {rows}=await query(`select a.id assessment_id,s.full_name supervisor_name,c.name company_name,a.cycle_name
        from rc360_assessments a
        join rc360_supervisors s on s.id=a.supervisor_id
        join rc360_companies c on c.id=a.company_id
        where a.status='open' and s.active=true and a.team_survey_open=true
        order by c.name,s.full_name,a.created_at desc`);
      if(!rows.length) return NextResponse.json({error:'No hay encuestas de equipo abiertas en este momento.'},{status:404});
      if(rows.length===1){
        const qs=await query(`select id,text,disc,competency,position from rc360_questions
          where mode='team' and active=true and deleted_at is null order by position,id`);
        return NextResponse.json({...rows[0],workerRut,questions:qs.rows});
      }
      return NextResponse.json({workerRut,assessments:rows});
    }

    const {rows}=await query(`select a.id assessment_id,s.full_name supervisor_name,c.name company_name,a.cycle_name
      from rc360_assessments a
      join rc360_supervisors s on s.id=a.supervisor_id
      join rc360_companies c on c.id=a.company_id
      where a.id=$1 and a.status='open' and s.active=true and a.team_survey_open=true limit 1`,[body.assessmentId]);
    if(!rows.length) return NextResponse.json({error:'La encuesta seleccionada no está disponible.'},{status:404});
    const qs=await query(`select id,text,disc,competency,position from rc360_questions
      where mode='team' and active=true and deleted_at is null order by position,id`);
    if(!qs.rows.length)return NextResponse.json({error:'La encuesta no tiene preguntas activas.'},{status:409});
    return NextResponse.json({...rows[0],workerRut,questions:qs.rows});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible iniciar la evaluación.'},{status:500});
  }
}
