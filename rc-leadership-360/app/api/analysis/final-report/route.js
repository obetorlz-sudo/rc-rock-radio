import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';

export async function POST(req){
  const s=await getSession();
  if(!s||s.role!=='psychologist') return NextResponse.json({error:'Solo la Psicóloga puede guardar o finalizar el informe profesional.'},{status:403});
  try{
    const b=await req.json();
    if(!b.assessmentId) return NextResponse.json({error:'Evaluación inválida.'},{status:400});
    const status=b.status==='finalized'?'finalized':'draft';
    const arr=x=>Array.isArray(x)?x.map(v=>String(v).trim()).filter(Boolean).slice(0,20):[];
    const action=Array.isArray(b.action_plan)?b.action_plan.slice(0,10):[];
    const {rows}=await query(`insert into rc360_final_reports(
      assessment_id,author_id,strengths,development_areas,opportunities,recommendations,action_plan,executive_summary,status,finalized_at,updated_at
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,case when $9='finalized' then now() else null end,now())
    on conflict(assessment_id) do update set
      author_id=excluded.author_id,
      strengths=excluded.strengths,
      development_areas=excluded.development_areas,
      opportunities=excluded.opportunities,
      recommendations=excluded.recommendations,
      action_plan=excluded.action_plan,
      executive_summary=excluded.executive_summary,
      status=excluded.status,
      finalized_at=case when excluded.status='finalized' then coalesce(rc360_final_reports.finalized_at,now()) else null end,
      updated_at=now()
    returning status,finalized_at,updated_at`,[
      b.assessmentId,s.id,JSON.stringify(arr(b.strengths)),JSON.stringify(arr(b.development_areas)),
      JSON.stringify(arr(b.opportunities)),JSON.stringify(arr(b.recommendations)),JSON.stringify(action),
      String(b.executive_summary||'').slice(0,8000),status
    ]);
    return NextResponse.json(rows[0]);
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible guardar el informe final.'},{status:500});
  }
}
