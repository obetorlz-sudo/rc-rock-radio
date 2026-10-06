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
function sorted(obj,desc=true){
  return Object.entries(obj||{}).filter(([,v])=>Number.isFinite(Number(v))).sort((a,b)=>desc?Number(b[1])-Number(a[1]):Number(a[1])-Number(b[1]));
}
function selfBrief(self){
  if(!self)return null;
  const strong=sorted(self.competencies,true).slice(0,3).map(x=>x[0]);
  const dev=sorted(self.competencies,false).slice(0,3).map(x=>x[0]);
  return `El supervisor presenta una tendencia conductual principal ${self.primary} y secundaria ${self.secondary}. En la autoevaluación destacan relativamente ${strong.join(', ')}. Los focos de menor puntuación relativa son ${dev.join(', ')}. Esta lectura constituye un apoyo inicial y debe ser contrastada con el contexto del cargo, la entrevista profesional y la percepción agregada del equipo.`;
}
function chartSummary(self,team){
  if(!self)return null;
  const discHigh=sorted(self.disc,true)[0];
  const discLow=sorted(self.disc,false)[0];
  const compHigh=sorted(self.competencies,true)[0];
  const compLow=sorted(self.competencies,false)[0];
  let largestGap=null;
  if(team?.competencies){
    largestGap=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])}))
      .filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g))[0]||null;
  }
  return {
    dominant:discHigh?{key:discHigh[0],value:discHigh[1]}:null,
    lower:discLow?{key:discLow[0],value:discLow[1]}:null,
    strongest_competency:compHigh?{key:compHigh[0],value:compHigh[1]}:null,
    development_competency:compLow?{key:compLow[0],value:compLow[1]}:null,
    largest_gap:largestGap
  };
}
function psychText(note){
  if(!note)return '';
  return [
    note.context_position&&'Contexto del puesto: '+note.context_position,
    note.interview_observations&&'Entrevista: '+note.interview_observations,
    note.strengths_observed&&'Fortalezas observadas: '+note.strengths_observed,
    note.development_observed&&'Aspectos a desarrollar: '+note.development_observed,
    note.environment_factors&&'Factores del entorno: '+note.environment_factors,
    note.professional_recommendations&&'Recomendaciones profesionales: '+note.professional_recommendations,
    note.note&&note.note!=='Análisis profesional estructurado'&&'Síntesis: '+note.note
  ].filter(Boolean).join(' ');
}
function integratedSummary(self,team,note){
  if(!self)return psychText(note)||null;
  const strengths=sorted(self.competencies,true).slice(0,2).map(x=>x[0]);
  const dev=sorted(self.competencies,false).slice(0,2).map(x=>x[0]);
  let text=`La autoevaluación identifica como fortalezas relativas ${strengths.join(' y ')}, mientras que ${dev.join(' y ')} aparecen como focos de desarrollo.`;
  if(team?.respondent_count>=3&&team.competencies){
    const gaps=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])})).filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g));
    const g=gaps[0];
    if(g) text+=Math.abs(g.g)>=15
      ?` La principal brecha de percepción se encuentra en ${g.k}, con ${Math.abs(g.g)} puntos de diferencia.`
      :' La percepción del supervisor y del equipo resulta relativamente consistente en las competencias evaluadas.';
  }
  const p=psychText(note);
  if(p) text+=' El análisis profesional agrega: '+p;
  return text;
}
function reportSuggestion(self,team,note){
  if(!self)return null;
  const combined={};
  for(const [k,v] of Object.entries(self.competencies||{})){
    const tv=team?.competencies?.[k];
    combined[k]=Number.isFinite(Number(tv))?Math.round((Number(v)+Number(tv))/2):Number(v);
  }
  const strengths=sorted(combined,true).slice(0,3).map(([k,v])=>`${k}: fortaleza relativa (${v}%)`);
  const development=sorted(combined,false).slice(0,3).map(([k,v])=>`${k}: área prioritaria de desarrollo (${v}%)`);
  const opportunities=[];
  if(team?.respondent_count>=3&&team.competencies){
    const gaps=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])})).filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g)).slice(0,3);
    for(const g of gaps) opportunities.push(`${g.k}: trabajar la brecha de percepción de ${Math.abs(g.g)} puntos mediante feedback y conductas observables.`);
  }
  if(note?.context_position) opportunities.push('Alinear el plan de mejora con las exigencias reales del puesto: '+note.context_position);
  if(note?.environment_factors) opportunities.push('Considerar factores del entorno laboral descritos por la Psicóloga: '+note.environment_factors);
  if(!opportunities.length) opportunities.push('Profundizar los focos de desarrollo mediante seguimiento y retroalimentación periódica.');
  const recommendations=[
    note?.professional_recommendations||'Definir conductas observables y metas concretas para los principales focos de desarrollo.',
    'Solicitar retroalimentación estructurada del equipo y revisar avances con la Psicóloga.',
    'Aplicar acciones de mejora en situaciones reales del puesto y evaluar evidencias de cambio.'
  ];
  const action_plan=[
    {horizon:'30 días',action:'Acordar dos conductas prioritarias, indicadores simples y una instancia formal de feedback.'},
    {horizon:'60 días',action:'Revisar evidencias de cambio, ajustar acciones y reforzar prácticas efectivas vinculadas al puesto.'},
    {horizon:'90 días',action:'Evaluar avances con la Psicóloga y definir continuidad del plan de desarrollo.'}
  ];
  return {strengths,development_areas:development,opportunities,recommendations,action_plan,executive_summary:integratedSummary(self,team,note)};
}

export async function GET(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a administración y psicología laboral.'},{status:403});
  try{
    const id=new URL(req.url).searchParams.get('id');
    const {rows}=await query(`select a.id,a.cycle_name,a.company_id,a.created_at,su.full_name,su.rut,su.position,su.area,c.name company_name
      from rc360_assessments a join rc360_supervisors su on su.id=a.supervisor_id join rc360_companies c on c.id=a.company_id where a.id=$1`,[id]);
    const a=rows[0];
    if(!a)return NextResponse.json({error:'Evaluación no encontrada.'},{status:404});

    const self=(await query('select disc,competencies,primary_profile,secondary_profile,completed_at from rc360_self_results where assessment_id=$1',[id])).rows[0]||null;
    const teamRows=(await query('select disc,competencies from rc360_team_responses where assessment_id=$1',[id])).rows;
    const count=teamRows.length;
    const team=count>=3?{respondent_count:count,disc:avgJson(teamRows,'disc'),competencies:avgJson(teamRows,'competencies')}:{respondent_count:count,disc:null,competencies:null};
    const note=(await query(`select n.note,n.context_position,n.interview_observations,n.strengths_observed,n.development_observed,n.environment_factors,n.professional_recommendations,n.created_at,u.full_name author
      from rc360_psychologist_notes n left join rc360_users u on u.id=n.author_id
      where n.assessment_id=$1 order by n.created_at desc limit 1`,[id])).rows[0]||null;
    const finalReport=(await query('select strengths,development_areas,opportunities,recommendations,action_plan,executive_summary,status,finalized_at,updated_at from rc360_final_reports where assessment_id=$1',[id])).rows[0]||null;
    const selfOut=self?{disc:self.disc,competencies:self.competencies,primary:self.primary_profile,secondary:self.secondary_profile,completed_at:self.completed_at}:null;

    return NextResponse.json({
      session:{role:s.role,name:s.name},
      company:{name:a.company_name},
      supervisor:{name:a.full_name,rut:a.rut,position:a.position,area:a.area},
      assessment:{id:a.id,cycle:a.cycle_name,created_at:a.created_at},
      self:selfOut,
      self_analysis:selfBrief(selfOut),
      chart_summary:chartSummary(selfOut,team),
      team,
      professional_note:note,
      integrated_summary:integratedSummary(selfOut,team,note),
      report_suggestion:reportSuggestion(selfOut,team,note),
      final_report:finalReport
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible generar el análisis.'},{status:500});
  }
}
