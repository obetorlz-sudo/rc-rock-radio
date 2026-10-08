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
function gapRows(self,team){
  if(!self?.competencies||!team?.competencies)return [];
  return Object.keys(self.competencies).map(k=>{
    const a=Number(self.competencies[k]),b=Number(team.competencies[k]),g=a-b;
    let reading='Percepción consistente';
    if(a>=75&&b>=75&&Math.abs(g)<=10)reading='Fortaleza confirmada';
    else if(g>=15)reading='Brecha de autopercepción';
    else if(g<=-15)reading='Fortaleza poco reconocida';
    else if(a<60&&b<60)reading='Prioridad de desarrollo';
    return {competency:k,self:a,team:b,gap:g,reading};
  }).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap));
}
function selfBrief(self){
  if(!self)return null;
  const strong=sorted(self.competencies,true).slice(0,3).map(x=>x[0]);
  const dev=sorted(self.competencies,false).slice(0,3).map(x=>x[0]);
  return `El supervisor presenta una tendencia conductual principal ${self.primary} y secundaria ${self.secondary}. En la autoevaluación destacan relativamente ${strong.join(', ')}. Los focos de menor puntuación relativa son ${dev.join(', ')}. Esta lectura constituye un apoyo inicial y debe ser contrastada con el contexto del cargo, la entrevista profesional y la percepción agregada del equipo.`;
}
function chartSummary(self,team){
  if(!self)return null;
  const discHigh=sorted(self.disc,true)[0],discLow=sorted(self.disc,false)[0];
  const compHigh=sorted(self.competencies,true)[0],compLow=sorted(self.competencies,false)[0];
  const gaps=gapRows(self,team);
  return {
    dominant:discHigh?{key:discHigh[0],value:discHigh[1]}:null,
    lower:discLow?{key:discLow[0],value:discLow[1]}:null,
    strongest_competency:compHigh?{key:compHigh[0],value:compHigh[1]}:null,
    development_competency:compLow?{key:compLow[0],value:compLow[1]}:null,
    largest_gap:gaps[0]?{k:gaps[0].competency,g:gaps[0].gap}:null
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
  const gaps=gapRows(self,team);
  if(gaps.length){
    const g=gaps[0];
    text+=Math.abs(g.gap)>=15
      ?` La principal brecha de percepción se encuentra en ${g.competency}, con ${Math.abs(g.gap)} puntos de diferencia.`
      :' La percepción del supervisor y del equipo resulta relativamente consistente en las competencias evaluadas.';
  }
  const p=psychText(note);
  if(p) text+=' El análisis profesional agrega: '+p;
  return text;
}
function evidenceMatrix(self,team,note){
  if(!self)return [];
  const rows=[];
  for(const [k,v] of sorted(self.competencies,true).slice(0,3)){
    rows.push({type:'Fortaleza',focus:k,evidence:`Autoevaluación ${v}%${team?.competencies?.[k]!=null?', equipo '+team.competencies[k]+'%':''}`,impact:'Puede utilizarse como recurso para sostener el desempeño y apoyar al equipo.'});
  }
  for(const [k,v] of sorted(self.competencies,false).slice(0,3)){
    rows.push({type:'Área de desarrollo',focus:k,evidence:`Autoevaluación ${v}%${team?.competencies?.[k]!=null?', equipo '+team.competencies[k]+'%':''}`,impact:'Requiere seguimiento mediante conductas observables y acciones vinculadas al puesto.'});
  }
  if(note?.strengths_observed)rows.push({type:'Entrevista',focus:'Fortalezas observadas',evidence:note.strengths_observed,impact:'Antecedente profesional incorporado a la interpretación.'});
  if(note?.development_observed)rows.push({type:'Entrevista',focus:'Aspectos a desarrollar',evidence:note.development_observed,impact:'Antecedente profesional para priorizar el plan de mejora.'});
  return rows;
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
  const opportunities=gapRows(self,team).slice(0,3).map(g=>`${g.competency}: trabajar una diferencia de percepción de ${Math.abs(g.gap)} puntos mediante feedback y acuerdos observables.`);
  if(note?.context_position)opportunities.push('Alinear las acciones con las exigencias reales del puesto: '+note.context_position);
  if(note?.environment_factors)opportunities.push('Considerar factores del entorno laboral: '+note.environment_factors);
  if(!opportunities.length)opportunities.push('Profundizar los focos de desarrollo mediante seguimiento y retroalimentación periódica.');
  const recommendations=[
    note?.professional_recommendations||'Definir conductas observables y metas concretas para los focos prioritarios.',
    'Solicitar retroalimentación estructurada del equipo y revisar avances con la Psicóloga.',
    'Aplicar las acciones de mejora en situaciones reales del puesto y revisar evidencias de cambio.'
  ];
  const focus1=development[0]?.split(':')[0]||'Comunicación';
  const focus2=development[1]?.split(':')[0]||'Delegación';
  const action_plan=[
    {focus:focus1,objective:'Mejorar una conducta observable asociada al foco prioritario.',action:'Acordar la conducta esperada y aplicarla de forma planificada en situaciones reales de trabajo.',responsible:'Supervisor',deadline:'30 días',indicator:'Conducta definida, aplicada y revisada en una instancia de feedback.'},
    {focus:focus2,objective:'Fortalecer la consistencia entre la intención del supervisor y la experiencia del equipo.',action:'Solicitar retroalimentación estructurada y ajustar la forma de coordinación o comunicación.',responsible:'Supervisor / Psicóloga',deadline:'60 días',indicator:'Registro de feedback y evidencia de ajustes implementados.'},
    {focus:'Seguimiento',objective:'Consolidar avances y definir continuidad del desarrollo.',action:'Revisar resultados, evidencias y percepción del equipo para acordar nuevos compromisos.',responsible:'Supervisor / Psicóloga',deadline:'90 días',indicator:'Revisión de cierre realizada y continuidad definida.'}
  ];
  const indicators=[
    {indicator:'Acciones de mejora ejecutadas',target:'≥ 80% de las acciones comprometidas',frequency:'Mensual'},
    {indicator:'Instancias de feedback realizadas',target:'Al menos 1 por mes',frequency:'Mensual'},
    {indicator:'Evidencias de conducta observada',target:'Registro de ejemplos concretos de avance',frequency:'30/60/90 días'}
  ];
  const objective_scope='Integrar la autoevaluación del supervisor, la percepción agregada del equipo y la entrevista profesional para identificar fortalezas, brechas y prioridades de desarrollo vinculadas al puesto de trabajo. Este informe es de carácter formativo y de desarrollo organizacional; no corresponde a un diagnóstico clínico ni a un instrumento de selección.';
  const conclusion=`Se recomienda concentrar el proceso de desarrollo en un número acotado de conductas prioritarias, vinculadas a las exigencias reales del puesto y revisadas mediante evidencia observable y retroalimentación periódica. El seguimiento 30/60/90 días permitirá verificar avances, ajustar las acciones y consolidar prácticas efectivas.`;
  return {
    strengths,development_areas:development,opportunities,recommendations,action_plan,indicators,
    evidence_matrix:evidenceMatrix(self,team,note),
    objective_scope,
    executive_summary:integratedSummary(self,team,note),
    conclusion
  };
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

    await query(`create table if not exists rc360_self_open_answers(
      assessment_id uuid primary key references rc360_assessments(id) on delete cascade,
      leadership text not null,
      conflict_management text not null,
      people_development text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    const self=(await query('select disc,competencies,primary_profile,secondary_profile,completed_at from rc360_self_results where assessment_id=$1',[id])).rows[0]||null;
    const openAnswers=(await query('select leadership,conflict_management,people_development,updated_at from rc360_self_open_answers where assessment_id=$1',[id])).rows[0]||null;
    const teamRows=(await query('select disc,competencies from rc360_team_responses where assessment_id=$1',[id])).rows;
    const count=teamRows.length;
    const team=count>=3?{respondent_count:count,disc:avgJson(teamRows,'disc'),competencies:avgJson(teamRows,'competencies')}:{respondent_count:count,disc:null,competencies:null};
    const note=(await query(`select n.note,n.context_position,n.interview_observations,n.strengths_observed,n.development_observed,n.environment_factors,n.professional_recommendations,n.created_at,u.full_name author
      from rc360_psychologist_notes n left join rc360_users u on u.id=n.author_id
      where n.assessment_id=$1 order by n.created_at desc limit 1`,[id])).rows[0]||null;
    const finalReport=(await query(`select strengths,development_areas,opportunities,recommendations,action_plan,executive_summary,
      objective_scope,indicators,conclusion,evidence_matrix,status,finalized_at,updated_at
      from rc360_final_reports where assessment_id=$1`,[id])).rows[0]||null;
    const selfOut=self?{disc:self.disc,competencies:self.competencies,primary:self.primary_profile,secondary:self.secondary_profile,completed_at:self.completed_at}:null;

    return NextResponse.json({
      session:{role:s.role,name:s.name},
      company:{name:a.company_name},
      supervisor:{name:a.full_name,rut:a.rut,position:a.position,area:a.area},
      assessment:{id:a.id,cycle:a.cycle_name,created_at:a.created_at},
      self:selfOut,
      supervisor_open_answers:openAnswers,
      self_analysis:selfBrief(selfOut),
      chart_summary:chartSummary(selfOut,team),
      gap_rows:gapRows(selfOut,team),
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
