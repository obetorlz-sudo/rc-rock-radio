import { NextResponse } from 'next/server';
import { query, tx } from '../../../../lib/db';
import { normalizeRut, validRut } from '../../../../lib/rut';
import { hashRut } from '../../../../lib/security';
import { validateAndScore } from '../../../../lib/server-score';
export async function POST(req){
  try{
    const body=await req.json(); const mode=body.mode;
    if(!['self','team'].includes(mode)) return NextResponse.json({error:'Modo inválido.'},{status:400});
    const {result,ordered,items}=validateAndScore(mode,body.answers);
    const aid=body.assessmentId;
    const {rows}=await query(`select a.id,a.status,a.team_survey_open,a.self_completed_at,s.rut supervisor_rut
      from rc360_assessments a join rc360_supervisors s on s.id=a.supervisor_id where a.id=$1`,[aid]);
    const a=rows[0]; if(!a||a.status!=='open') return NextResponse.json({error:'Evaluación no disponible.'},{status:404});
    if(mode==='self'){
      const r=normalizeRut(body.rut); if(!validRut(r)||r!==a.supervisor_rut) return NextResponse.json({error:'RUT no corresponde a esta evaluación.'},{status:403});
      if(a.self_completed_at) return NextResponse.json({error:'La autoevaluación ya fue completada.'},{status:409});
      await tx(async c=>{
        await c.query(`insert into rc360_self_results(assessment_id,disc,competencies,primary_profile,secondary_profile)
          values($1,$2,$3,$4,$5) on conflict(assessment_id) do update set disc=excluded.disc,competencies=excluded.competencies,primary_profile=excluded.primary_profile,secondary_profile=excluded.secondary_profile,completed_at=now()`,[aid,result.disc,result.competencies,result.primary,result.secondary]);
        await c.query('delete from rc360_self_answers where assessment_id=$1',[aid]);
        for(let i=0;i<items.length;i++) await c.query('insert into rc360_self_answers(assessment_id,item_id,score) values($1,$2,$3)',[aid,items[i].id,ordered[i]]);
        await c.query('update rc360_assessments set self_completed_at=now() where id=$1',[aid]);
      });
      return NextResponse.json(result);
    }
    if(!a.team_survey_open) return NextResponse.json({error:'Encuesta 360° cerrada.'},{status:409});
    const wr=normalizeRut(body.workerRut); if(!validRut(wr)) return NextResponse.json({error:'RUT del trabajador inválido.'},{status:400});
    const wh=hashRut(wr);
    try{
      await tx(async c=>{
        const ins=await c.query(`insert into rc360_team_responses(assessment_id,worker_hash,disc,competencies,comment) values($1,$2,$3,$4,$5) returning id`,[aid,wh,result.disc,result.competencies,(body.comment||'').slice(0,1500)||null]);
        for(let i=0;i<items.length;i++) await c.query('insert into rc360_team_answers(response_id,item_id,score) values($1,$2,$3)',[ins.rows[0].id,items[i].id,ordered[i]]);
      });
    }catch(e){ if(e.code==='23505') return NextResponse.json({error:'Ya existe una respuesta registrada para este trabajador en este ciclo.'},{status:409}); throw e; }
    return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({error:e.message||'No fue posible guardar la evaluación.'},{status:500});}
}
