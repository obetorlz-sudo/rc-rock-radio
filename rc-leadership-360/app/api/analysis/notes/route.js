import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';

export async function POST(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a Administración y Psicología Laboral.'},{status:403});
  try{
    const b=await req.json();
    if(!b.assessmentId) return NextResponse.json({error:'Evaluación inválida.'},{status:400});
    const clean=v=>String(v||'').trim().slice(0,6000);
    const fields={
      note:clean(b.note),
      context_position:clean(b.context_position),
      interview_observations:clean(b.interview_observations),
      strengths_observed:clean(b.strengths_observed),
      development_observed:clean(b.development_observed),
      environment_factors:clean(b.environment_factors),
      professional_recommendations:clean(b.professional_recommendations)
    };
    const hasContent=Object.values(fields).some(v=>v.length>=5);
    if(!hasContent) return NextResponse.json({error:'Ingresa antecedentes del puesto o de la entrevista antes de guardar.'},{status:400});
    let authorId=s.id;
    if(s.role==='admin'){
      const previous=(await query(
        'select author_id from rc360_psychologist_notes where assessment_id=$1 order by created_at desc limit 1',
        [b.assessmentId]
      )).rows[0];
      if(previous?.author_id)authorId=previous.author_id;
    }
    await query(`insert into rc360_psychologist_notes(
      assessment_id,author_id,note,context_position,interview_observations,strengths_observed,development_observed,environment_factors,professional_recommendations
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[
      b.assessmentId,authorId,fields.note||'Análisis profesional estructurado',
      fields.context_position,fields.interview_observations,fields.strengths_observed,
      fields.development_observed,fields.environment_factors,fields.professional_recommendations
    ]);
    return NextResponse.json({ok:true});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible guardar el análisis profesional.'},{status:500});
  }
}
