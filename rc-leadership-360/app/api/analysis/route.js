import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getSession } from '../../../lib/security';

function avgJson(rows,key){
  if(!rows.length)return null;
  const keys=Object.keys(rows[0][key]||{}); const out={};
  for(const k of keys){
    const vals=rows.map(r=>Number(r[key]?.[k])).filter(Number.isFinite);
    out[k]=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  return out;
}
function topEntries(obj,n=2,desc=true){
  return Object.entries(obj||{}).filter(([,v])=>Number.isFinite(Number(v))).sort((a,b)=>desc?Number(b[1])-Number(a[1]):Number(a[1])-Number(b[1])).slice(0,n);
}
function buildSummary(self,team,note){
  if(!self) return note ? 'La entrevista profesional registra: '+note : null;
  const strengths=topEntries(self.competencies,2,true).map(x=>x[0]);
  const dev=topEntries(self.competencies,2,false).map(x=>x[0]);
  let text='La autoevaluación muestra fortalezas relativas en '+strengths.join(' y ')+', mientras que las principales oportunidades de desarrollo se concentran en '+dev.join(' y ')+'.';
  if(team?.respondent_count>=3 && team.competencies){
    const gaps=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])})).filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g));
    const g=gaps[0];
    if(g){
      if(Math.abs(g.g)>=15) text+=' La mayor diferencia entre autopercepción y percepción del equipo se observa en '+g.k+', con una brecha de '+Math.abs(g.g)+' puntos, lo que recomienda profundizar esta dimensión durante la devolución.';
      else text+=' En términos generales existe una percepción relativamente consistente entre la autoevaluación y la mirada agregada del equipo.';
    }
  }
  if(note) text+=' A partir de la entrevista post evaluación, la profesional consigna: '+note;
  return text;
}
export async function GET(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a administración y psicología laboral.'},{status:403});
  try{
    const id=new URL(req.url).searchParams.get('id');
    const {rows}=await query(`select a.id,a.cycle_name,a.company_id,su.full_name,su.position,su.area,c.name company_name
      from rc360_assessments a join rc360_supervisors su on su.id=a.supervisor_id join rc360_companies c on c.id=a.company_id where a.id=$1`,[id]);
    const a=rows[0]; if(!a)return NextResponse.json({error:'Evaluación no encontrada.'},{status:404});
    const self=(await query('select disc,competencies,primary_profile,secondary_profile from rc360_self_results where assessment_id=$1',[id])).rows[0]||null;
    const teamRows=(await query('select disc,competencies from rc360_team_responses where assessment_id=$1',[id])).rows;
    const count=teamRows.length;
    const team=count>=3?{respondent_count:count,disc:avgJson(teamRows,'disc'),competencies:avgJson(teamRows,'competencies')}:{respondent_count:count,disc:null,competencies:null};
    const note=(await query(`select n.note,n.created_at,u.full_name author
      from rc360_psychologist_notes n left join rc360_users u on u.id=n.author_id
      where n.assessment_id=$1 order by n.created_at desc limit 1`,[id])).rows[0]||null;
    const selfOut=self?{disc:self.disc,competencies:self.competencies,primary:self.primary_profile,secondary:self.secondary_profile}:null;
    return NextResponse.json({
      company:{name:a.company_name},
      supervisor:{name:a.full_name,position:a.position,area:a.area},
      assessment:{id:a.id,cycle:a.cycle_name},
      self:selfOut,
      team,
      professional_note:note,
      integrated_summary:buildSummary(selfOut,team,note?.note||'')
    });
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible generar el análisis.'},{status:500});}
}
