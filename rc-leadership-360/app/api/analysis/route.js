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
  if(!self) return null;
  const strong=sorted(self.competencies,true).slice(0,3);
  const dev=sorted(self.competencies,false).slice(0,3);
  return `El perfil conductual del supervisor presenta una tendencia principal ${self.primary} y secundaria ${self.secondary}. En su autoevaluación, las competencias con mayor puntuación relativa son ${strong.map(x=>x[0]).join(', ')}, mientras que las áreas con menor puntuación relativa son ${dev.map(x=>x[0]).join(', ')}. Esta lectura es orientativa y debe complementarse con la entrevista profesional, el contexto del cargo y la percepción agregada del equipo.`;
}
function integratedSummary(self,team,note){
  if(!self) return note ? 'La entrevista profesional registra: '+note : null;
  const strengths=sorted(self.competencies,true).slice(0,2).map(x=>x[0]);
  const dev=sorted(self.competencies,false).slice(0,2).map(x=>x[0]);
  let text='La autoevaluación muestra fortalezas relativas en '+strengths.join(' y ')+', mientras que las principales oportunidades de desarrollo se concentran en '+dev.join(' y ')+'.';
  if(team?.respondent_count>=3&&team.competencies){
    const gaps=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])})).filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g));
    const g=gaps[0];
    if(g){
      text+=Math.abs(g.g)>=15
        ?' La mayor diferencia entre autopercepción y percepción del equipo se observa en '+g.k+', con una brecha de '+Math.abs(g.g)+' puntos.'
        :' Existe una percepción relativamente consistente entre la autoevaluación y la mirada agregada del equipo.';
    }
  }
  if(note) text+=' La Psicóloga incorpora además el siguiente antecedente de entrevista: '+note;
  return text;
}
function reportSuggestion(self,team,note){
  if(!self)return null;
  const combined={};
  for(const [k,v] of Object.entries(self.competencies||{})){
    const tv=team?.competencies?.[k];
    combined[k]=Number.isFinite(Number(tv))?Math.round((Number(v)+Number(tv))/2):Number(v);
  }
  const strengths=sorted(combined,true).slice(0,3).map(([k,v])=>`${k}: nivel relativo ${v}%`);
  const development=sorted(combined,false).slice(0,3).map(([k,v])=>`${k}: foco prioritario de desarrollo (${v}%)`);
  const opportunities=[];
  if(team?.respondent_count>=3&&team.competencies){
    const gaps=Object.keys(self.competencies||{}).map(k=>({k,g:Number(self.competencies[k])-Number(team.competencies[k])})).filter(x=>Number.isFinite(x.g)).sort((a,b)=>Math.abs(b.g)-Math.abs(a.g)).slice(0,3);
    for(const g of gaps) opportunities.push(`${g.k}: revisar la brecha de percepción de ${Math.abs(g.g)} puntos mediante feedback y acuerdos observables.`);
  }
  if(!opportunities.length) opportunities.push('Profundizar los focos de desarrollo mediante entrevista, seguimiento y retroalimentación periódica.');
  const recommendations=development.map((x,i)=>[
    'Definir una conducta observable y una meta concreta asociada al foco prioritario.',
    'Solicitar retroalimentación estructurada del equipo y revisar avances con la Psicóloga.',
    'Aplicar una acción de mejora en el trabajo cotidiano y medir su impacto.'
  ][i]+' '+x.split(':')[0]+'.');
  const action_plan=[
    {horizon:'30 días',action:'Acordar 2 conductas prioritarias, indicadores simples y una instancia de feedback.'},
    {horizon:'60 días',action:'Revisar evidencias de cambio, ajustar acciones y reforzar prácticas efectivas.'},
    {horizon:'90 días',action:'Evaluar avances con la jefatura/Psicóloga y definir continuidad del plan de desarrollo.'}
  ];
  return {strengths,development_areas:development,opportunities,recommendations,action_plan,executive_summary:integratedSummary(self,team,note)};
}

export async function GET(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a administración y psicología laboral.'},{status:403});
  try{
    const id=new URL(req.url).searchParams.get('id');
    const {rows}=await query(`select a.id,a.cycle_name,a.company_id,su.full_name,su.rut,su.position,su.area,c.name company_name
      from rc360_assessments a join rc360_supervisors su on su.id=a.supervisor_id join rc360_companies c on c.id=a.company_id where a.id=$1`,[id]);
    const a=rows[0];
    if(!a)return NextResponse.json({error:'Evaluación no encontrada.'},{status:404});

    const self=(await query('select disc,competencies,primary_profile,secondary_profile from rc360_self_results where assessment_id=$1',[id])).rows[0]||null;
    const teamRows=(await query('select disc,competencies from rc360_team_responses where assessment_id=$1',[id])).rows;
    const count=teamRows.length;
    const team=count>=3?{respondent_count:count,disc:avgJson(teamRows,'disc'),competencies:avgJson(teamRows,'competencies')}:{respondent_count:count,disc:null,competencies:null};
    const note=(await query(`select n.note,n.created_at,u.full_name author
      from rc360_psychologist_notes n left join rc360_users u on u.id=n.author_id
      where n.assessment_id=$1 order by n.created_at desc limit 1`,[id])).rows[0]||null;
    const finalReport=(await query('select strengths,development_areas,opportunities,recommendations,action_plan,executive_summary,status,finalized_at,updated_at from rc360_final_reports where assessment_id=$1',[id])).rows[0]||null;
    const selfOut=self?{disc:self.disc,competencies:self.competencies,primary:self.primary_profile,secondary:self.secondary_profile}:null;
    const suggestion=reportSuggestion(selfOut,team,note?.note||'');

    return NextResponse.json({
      session:{role:s.role,name:s.name},
      company:{name:a.company_name},
      supervisor:{name:a.full_name,rut:a.rut,position:a.position,area:a.area},
      assessment:{id:a.id,cycle:a.cycle_name},
      self:selfOut,
      self_analysis:selfBrief(selfOut),
      team,
      professional_note:note,
      integrated_summary:integratedSummary(selfOut,team,note?.note||''),
      report_suggestion:suggestion,
      final_report:finalReport
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible generar el análisis.'},{status:500});
  }
}
