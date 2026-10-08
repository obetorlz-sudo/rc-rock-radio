import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut, validRut } from '../../../../lib/rut';
import { hashRut } from '../../../../lib/security';

async function ensureTable(){
  await query(`create table if not exists rc360_public_drafts(
    assessment_id uuid not null references rc360_assessments(id) on delete cascade,
    mode text not null check(mode in ('self','team')),
    respondent_key text not null,
    answers jsonb not null default '[]'::jsonb,
    current_index int not null default 0,
    extra jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    primary key(assessment_id,mode,respondent_key)
  )`);
}

export async function POST(req){
  try{
    const b=await req.json();
    const mode=b.mode;
    if(!['self','team'].includes(mode)) return NextResponse.json({error:'Modo inválido.'},{status:400});
    const aid=b.assessmentId;
    if(!aid) return NextResponse.json({error:'Evaluación inválida.'},{status:400});

    const raw=mode==='self'?b.rut:b.workerRut;
    const rut=normalizeRut(raw);
    if(!validRut(rut)) return NextResponse.json({error:'RUT inválido.'},{status:400});
    const key=mode==='self'?rut:hashRut(rut);

    const {rows}=await query(`select a.id,a.status,a.self_completed_at,a.team_survey_open,s.rut supervisor_rut
      from rc360_assessments a join rc360_supervisors s on s.id=a.supervisor_id where a.id=$1`,[aid]);
    const a=rows[0];
    if(!a||a.status!=='open') return NextResponse.json({error:'Evaluación no disponible.'},{status:404});
    if(mode==='self'&&rut!==a.supervisor_rut) return NextResponse.json({error:'RUT no corresponde a esta evaluación.'},{status:403});
    if(mode==='self'&&a.self_completed_at) return NextResponse.json({draft:null,completed:true});
    if(mode==='team'&&!a.team_survey_open) return NextResponse.json({error:'Encuesta cerrada.'},{status:409});

    await ensureTable();

    if(b.action==='load'){
      const d=await query('select answers,current_index,extra,updated_at from rc360_public_drafts where assessment_id=$1 and mode=$2 and respondent_key=$3',[aid,mode,key]);
      return NextResponse.json({draft:d.rows[0]||null});
    }

    const answers=Array.isArray(b.answers)?b.answers:[];
    const idx=Math.max(0,Number(b.currentIndex)||0);
    const extra=b.extra&&typeof b.extra==='object'?b.extra:{};
    await query(`insert into rc360_public_drafts(assessment_id,mode,respondent_key,answers,current_index,extra,updated_at)
      values($1,$2,$3,$4,$5,$6,now())
      on conflict(assessment_id,mode,respondent_key)
      do update set answers=excluded.answers,current_index=excluded.current_index,extra=excluded.extra,updated_at=now()`,
      [aid,mode,key,JSON.stringify(answers),idx,JSON.stringify(extra)]);
    return NextResponse.json({ok:true,updated_at:new Date().toISOString()});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible guardar el borrador.'},{status:500});
  }
}
