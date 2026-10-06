import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';

export async function POST(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a Administración y Psicología Laboral.'},{status:403});
  try{
    const b=await req.json();
    if(!b.assessmentId) return NextResponse.json({error:'Evaluación inválida.'},{status:400});
    const status=b.status==='finalized'?'finalized':'draft';
    if(status==='finalized'&&s.role!=='psychologist') return NextResponse.json({error:'Solo la Psicóloga puede finalizar el informe profesional.'},{status:403});
    const arr=x=>Array.isArray(x)?x.slice(0,30):[];
    const clean=v=>String(v||'').trim().slice(0,12000);
    const action=arr(b.action_plan);
    const indicators=arr(b.indicators);
    const evidence=arr(b.evidence_matrix);

    if(status==='finalized'){
      if(!clean(b.executive_summary)||!clean(b.conclusion)) return NextResponse.json({error:'Para finalizar debes completar el resumen ejecutivo y la conclusión profesional.'},{status:400});
      if(!action.length) return NextResponse.json({error:'Para finalizar debes definir al menos una acción de mejora.'},{status:400});
    }

    const {rows}=await query(`insert into rc360_final_reports(
      assessment_id,author_id,strengths,development_areas,opportunities,recommendations,action_plan,
      executive_summary,objective_scope,indicators,conclusion,evidence_matrix,status,finalized_at,updated_at
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,case when $13='finalized' then now() else null end,now())
    on conflict(assessment_id) do update set
      author_id=excluded.author_id,
      strengths=excluded.strengths,
      development_areas=excluded.development_areas,
      opportunities=excluded.opportunities,
      recommendations=excluded.recommendations,
      action_plan=excluded.action_plan,
      executive_summary=excluded.executive_summary,
      objective_scope=excluded.objective_scope,
      indicators=excluded.indicators,
      conclusion=excluded.conclusion,
      evidence_matrix=excluded.evidence_matrix,
      status=excluded.status,
      finalized_at=case when excluded.status='finalized' then coalesce(rc360_final_reports.finalized_at,now()) else null end,
      updated_at=now()
    returning status,finalized_at,updated_at`,[
      b.assessmentId,s.id,JSON.stringify(arr(b.strengths)),JSON.stringify(arr(b.development_areas)),
      JSON.stringify(arr(b.opportunities)),JSON.stringify(arr(b.recommendations)),JSON.stringify(action),
      clean(b.executive_summary),clean(b.objective_scope),JSON.stringify(indicators),clean(b.conclusion),
      JSON.stringify(evidence),status
    ]);
    return NextResponse.json(rows[0]);
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible guardar el informe final.'},{status:500});
  }
}
