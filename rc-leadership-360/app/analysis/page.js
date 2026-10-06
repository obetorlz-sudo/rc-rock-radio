'use client';
import { useEffect,useMemo,useState } from 'react';
import { DISC,COMP } from '../../lib/instrument';
import { gapLabel } from '../../lib/scoring';

const api=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
};
const arrText=a=>(a||[]).join('\n');
const textArr=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);

const DISC_INFO={
  D:{name:'Dominancia',text:'Refleja iniciativa, rapidez para decidir, desafío, empuje y orientación al logro.'},
  I:{name:'Influencia',text:'Refleja comunicación, persuasión, entusiasmo, interacción y capacidad de movilizar a otros.'},
  S:{name:'Estabilidad',text:'Refleja constancia, cooperación, paciencia, escucha y búsqueda de relaciones laborales estables.'},
  C:{name:'Cumplimiento',text:'Refleja apego a estándares, análisis, precisión, planificación y cuidado por la calidad.'}
};

function RadarChart({labels,self,team,title,labelMap,showExplanation=false}){
  const [active,setActive]=useState(labels[0]);
  const cx=250,cy=225,R=164,n=labels.length;
  const point=(i,pct)=>{
    const a=(-Math.PI/2)+(i*2*Math.PI/n);
    const r=R*Math.max(0,Math.min(100,Number(pct)||0))/100;
    return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];
  };
  const ring=pct=>labels.map((_,i)=>point(i,pct).join(',')).join(' ');
  const poly=obj=>labels.map((k,i)=>point(i,obj?.[k]||0).join(',')).join(' ');
  const sv=self?.[active],tv=team?.[active];
  const gap=sv!=null&&tv!=null?Number(sv)-Number(tv):null;
  const activeName=labelMap?.[active]||DISC_INFO[active]?.name||active;

  return <div className="radarBlock neonCard compactRadar">
    <div className="radarHeader">
      <div><h3>{title}</h3><p className="muted">Selecciona D, I, S o C para ver porcentajes y lectura.</p></div>
      <div className="trendLegend"><span><i className="legendSelf"/>Supervisor</span>{team&&<span><i className="legendTeam"/>Equipo</span>}</div>
    </div>

    <div className="radarMainGrid">
      <div className="radarStage">
        <div className="holoOrb holoOrbOne"/><div className="holoOrb holoOrbTwo"/>
        <svg className="radarSvg" viewBox="0 0 500 455" role="img" aria-label={title}>
          <defs>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glowGold"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {[20,40,60,80,100].map(v=><polygon key={v} points={ring(v)} className="radarRing"/>)}
          {labels.map((k,i)=>{
            const [x,y]=point(i,100);
            return <g key={k}>
              <line x1={cx} y1={cy} x2={x} y2={y} className="radarAxis"/>
              <circle cx={x} cy={y} r="25" className={active===k?'radarLabelHit active':'radarLabelHit'} onClick={()=>setActive(k)}/>
              <text x={x} y={y+5} textAnchor="middle" className="radarLabel" onClick={()=>setActive(k)}>{k.length>14?k.slice(0,11)+'…':k}</text>
            </g>
          })}
          {self&&<polygon points={poly(self)} className="radarSelfArea" filter="url(#glowBlue)"/>}
          {team&&<polygon points={poly(team)} className="radarTeamArea" filter="url(#glowGold)"/>}
          {labels.map((k,i)=>{
            const [sx,sy]=point(i,self?.[k]||0),[tx,ty]=point(i,team?.[k]||0);
            return <g key={'p-'+k}>
              {self&&<circle cx={sx} cy={sy} r={active===k?8:5} className="radarSelfPoint" onClick={()=>setActive(k)}/>}
              {team&&<circle cx={tx} cy={ty} r={active===k?8:5} className="radarTeamPoint" onClick={()=>setActive(k)}/>}
              {active===k&&self&&<g className="radarValueTag">
                <rect x={sx-28} y={sy-38} width="56" height="25" rx="10"/>
                <text x={sx} y={sy-21} textAnchor="middle">{self[k]}%</text>
              </g>}
              {active===k&&team&&<g className="radarValueTag teamTag">
                <rect x={tx-28} y={ty+13} width="56" height="25" rx="10"/>
                <text x={tx} y={ty+30} textAnchor="middle">{team[k]}%</text>
              </g>}
            </g>
          })}
          <circle cx={cx} cy={cy} r="4" className="radarCenter"/>
        </svg>
      </div>

      <aside className="radarSidePanel">
        <div className="selectedDimension">
          <span className="eyebrow">Dimensión seleccionada</span>
          <h3>{activeName}</h3>
          <div className="sideNumbers">
            <div className="radarNumbers"><strong>{sv??'-'}%</strong><span>Supervisor</span></div>
            {team&&<div className="radarNumbers team"><strong>{tv??'-'}%</strong><span>Equipo</span></div>}
            <div className="radarNumbers gap"><strong>{gap==null?'—':(gap>0?'+':'')+gap}</strong><span>Brecha</span></div>
          </div>
        </div>
        {showExplanation&&DISC_INFO[active]&&<div className="chartExplanation sideExplanation">
          <b>¿Qué representa?</b>
          <p>{DISC_INFO[active].text}</p>
          <p><b>Lectura:</b> {gap==null?'Aún no existe una muestra suficiente del equipo para comparar.':Math.abs(gap)<10?'La percepción es bastante consistente entre supervisor y equipo.':gap>0?'El supervisor se percibe con mayor presencia de esta conducta que la observada por el equipo.':'El equipo observa una mayor presencia de esta conducta que la reconocida por el supervisor.'}</p>
        </div>}
      </aside>
    </div>
  </div>;
}

function DiscBars({self,team}){
  if(!self)return <div className="privacy">Aún no hay resultados conductuales del supervisor.</div>;
  return <div className="discBarGrid">
    {['D','I','S','C'].map(k=>{
      const s=Number(self[k]||0),t=team?Number(team[k]||0):null;
      return <div className="discBarCard" key={k}>
        <div className="discBarHead"><div><b>{k}</b><span>{DISC_INFO[k].name}</span></div><strong>{s}%</strong></div>
        <div className="discBarLine"><span>Supervisor</span><div className="discTrack"><i className="discFill self" style={{width:s+'%'}}/></div><b>{s}%</b></div>
        {team&&<div className="discBarLine"><span>Equipo</span><div className="discTrack"><i className="discFill team" style={{width:t+'%'}}/></div><b>{t}%</b></div>}
      </div>
    })}
  </div>;
}

function ComparativeBars({self,team}){
  if(!self)return <div className="privacy">Aún no hay resultados del supervisor.</div>;
  return <div className="compBars">
    {COMP.map(k=>{
      const s=Number(self[k]||0),t=team?Number(team[k]||0):null;
      return <div className="compRow" key={k}>
        <div className="compName">{k}</div>
        <div className="compTracks">
          <div className="compTrack"><div className="compFill self" style={{width:s+'%'}}/><span>{s}%</span></div>
          {team&&<div className="compTrack"><div className="compFill team" style={{width:t+'%'}}/><span>{t}%</span></div>}
        </div>
      </div>
    })}
  </div>;
}

function ChartSummary({summary,enough}){
  if(!summary)return null;
  return <div className="visualSummary">
    <div><span>Conducta predominante</span><b>{summary.dominant?.key} · {DISC_INFO[summary.dominant?.key]?.name||''}</b><strong>{summary.dominant?.value}%</strong></div>
    <div><span>Fortaleza competencial</span><b>{summary.strongest_competency?.key}</b><strong>{summary.strongest_competency?.value}%</strong></div>
    <div><span>Foco de desarrollo</span><b>{summary.development_competency?.key}</b><strong>{summary.development_competency?.value}%</strong></div>
    <div><span>Mayor brecha</span><b>{enough&&summary.largest_gap?summary.largest_gap.k:'Equipo aún sin muestra'}</b><strong>{enough&&summary.largest_gap?Math.abs(summary.largest_gap.g)+' pts':'—'}</strong></div>
  </div>;
}

function PsychForm({value,setValue,onSave}){
  const field=(key,label,placeholder)=><label className="psychField"><span>{label}</span><textarea value={value[key]||''} onChange={e=>setValue({...value,[key]:e.target.value})} placeholder={placeholder}/></label>;
  return <div className="psychForm">
    {field('context_position','Contexto del puesto de trabajo','Funciones principales, responsabilidades, exigencias, nivel de autonomía, relación con equipo y jefaturas…')}
    {field('interview_observations','Observaciones de entrevista','Aspectos relevantes observados o declarados durante la entrevista…')}
    {field('strengths_observed','Fortalezas observadas','Fortalezas profesionales y conductuales identificadas por la Psicóloga…')}
    {field('development_observed','Aspectos a desarrollar','Conductas, competencias o situaciones que requieren desarrollo…')}
    {field('environment_factors','Factores del entorno laboral','Carga, coordinación, clima, turnos, recursos, características del equipo u otros factores que influyen…')}
    {field('professional_recommendations','Recomendaciones profesionales','Recomendaciones de intervención, acompañamiento, seguimiento o acciones concretas…')}
    {field('note','Síntesis profesional','Conclusión o síntesis general de la entrevista…')}
    <button className="primary" onClick={onSave}>Guardar análisis profesional</button>
  </div>;
}

function ReportDocument({d,report,enough}){
  if(!report)return null;
  const issueDate=report.finalized_at||report.updated_at||new Date().toISOString();
  const dateText=new Date(issueDate).toLocaleDateString('es-CL');
  const strengths=(report.strengths||[]).slice(0,4);
  const development=(report.development_areas||[]).slice(0,4);
  const opportunities=(report.opportunities||[]).slice(0,4);
  const gaps=(d.gap_rows||[]).slice(0,4);
  const psych=d.professional_note||{};
  const actionPlan=(report.action_plan||[]).slice(0,4);
  const indicators=(report.indicators||[]).slice(0,4);
  const Header=()=> <div className="finalReportHeader">
    <div className="finalBrand">
      <img src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/>
      <div className="brandDivider"/>
      <div className="brandClaim">PERSONAS<br/>EQUIPOS<br/>ORGANIZACIONES<br/>CON MÁS POSIBILIDADES</div>
    </div>
    <div className="hexAccent"><span/><span/><span/></div>
    <h1>Informe Final de Retroalimentación y Propuesta de Mejora</h1>
    <p>Evaluación conductual y de competencias para desarrollo organizacional</p>
  </div>;
  const Footer=({page})=><div className="finalReportFooter">
    <div><b>Innova RC Capacita</b><span>Desarrollo de personas para organizaciones con más posibilidades</span></div>
    <div>{dateText} <b>|</b> Pág. {page} de 3</div>
  </div>;
  const SectionTitle=({n,children})=><div className="finalSectionTitle"><span>{n}</span><h2>{children}</h2><i/></div>;

  return <article className="reportDocument finalThreePageReport">
    <section className="reportPage reportPageOne">
      <Header/>
      <div className="personSummary">
        <div><b>Nombre:</b><span>{d.supervisor.name}</span></div>
        <div><b>Cargo:</b><span>{d.supervisor.position||'—'}</span></div>
        <div><b>RUT:</b><span>{d.supervisor.rut}</span></div>
        <div><b>Fecha:</b><span>{dateText}</span></div>
        <div><b>Empresa:</b><span>{d.company.name}</span></div>
        <div><b>Estado:</b><span className="reportStatus">{report.status==='finalized'?'Informe final':'Borrador'}</span></div>
      </div>

      <div className="finalSection compactSection">
        <SectionTitle n="1">Antecedentes Generales</SectionTitle>
        <p>El presente informe integra los resultados de la evaluación conductual y de competencias, la percepción agregada del equipo y los antecedentes profesionales disponibles para apoyar el desarrollo del supervisor en su contexto laboral.</p>
      </div>

      <div className="finalSection compactSection">
        <SectionTitle n="2">Objetivo y Alcance</SectionTitle>
        <div className="twoColText">
          <p>{report.objective_scope}</p>
          <div className="softInfoCard"><b>Alcance</b><p>La lectura considera autoevaluación, resultados conductuales, competencias, percepción del equipo cuando existe muestra suficiente y análisis de Psicología Laboral.</p></div>
        </div>
      </div>

      <div className="finalSection compactSection">
        <SectionTitle n="3">Síntesis Ejecutiva</SectionTitle>
        <p>{report.executive_summary}</p>
      </div>

      <div className="finalSection compactSection">
        <SectionTitle n="4">Resumen del Perfil</SectionTitle>
        <div className="profileSummaryGrid">
          <div><span>Conducta predominante</span><b>{d.chart_summary?.dominant?.key||'—'} · {DISC_INFO[d.chart_summary?.dominant?.key]?.name||''}</b><strong>{d.chart_summary?.dominant?.value??'—'}%</strong></div>
          <div><span>Fortaleza principal</span><b>{d.chart_summary?.strongest_competency?.key||'—'}</b><strong>{d.chart_summary?.strongest_competency?.value??'—'}%</strong></div>
          <div><span>Foco de desarrollo</span><b>{d.chart_summary?.development_competency?.key||'—'}</b><strong>{d.chart_summary?.development_competency?.value??'—'}%</strong></div>
          <div><span>Respuestas equipo</span><b>{enough?'Muestra habilitada':'Muestra pendiente'}</b><strong>{d.team?.respondent_count||0}</strong></div>
        </div>
      </div>

      <div className="finalSection compactSection">
        <SectionTitle n="5">Fortalezas / Áreas de Desarrollo / Oportunidades</SectionTitle>
        <div className="triSummary">
          <div className="strengthBox"><h3>Fortalezas</h3><ul>{strengths.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ul></div>
          <div className="developmentBox"><h3>Áreas de Desarrollo</h3><ul>{development.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ul></div>
          <div className="opportunityBox"><h3>Oportunidades</h3><ul>{opportunities.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ul></div>
        </div>
      </div>
      <Footer page="1"/>
    </section>

    <section className="reportPage reportPageTwo">
      <Header/>

      <div className="finalSection">
        <SectionTitle n="5">Perfil Conductual D-I-S-C</SectionTitle>
        <div className="discPrintGrid">
          <div className="printRadarWrap">
            <RadarChart title="Perfil comparativo D-I-S-C" labels={['D','I','S','C']} labelMap={{D:'Dominancia',I:'Influencia',S:'Estabilidad',C:'Cumplimiento'}} self={d.self?.disc} team={enough?d.team.disc:null}/>
          </div>
          <div className="discPrintSide">
            <h3>Resultados por factor conductual</h3>
            <DiscBars self={d.self?.disc} team={enough?d.team.disc:null}/>
            <div className="softInfoCard interpretationCard"><b>Interpretación del perfil</b><p>{d.self_analysis||'Sin análisis disponible.'}</p></div>
          </div>
        </div>
      </div>

      <div className="finalSection">
        <SectionTitle n="6">Competencias Clave</SectionTitle>
        <div className="competencyPrintGrid">
          <div><h3>Resultados de competencias</h3><ComparativeBars self={d.self?.competencies} team={enough?d.team.competencies:null}/></div>
          <div className="softInfoCard"><b>Lectura de competencias</b><p>{d.integrated_summary||d.self_analysis||'Sin síntesis disponible.'}</p></div>
        </div>
      </div>

      <div className="finalSection">
        <SectionTitle n="7">Brechas Prioritarias</SectionTitle>
        <div className="triSummary">
          <div className="strengthBox"><h3>Fortaleza observada</h3><ul>{strengths.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ul></div>
          <div className="developmentBox"><h3>Área de desarrollo</h3><ul>{development.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ul></div>
          <div className="opportunityBox"><h3>Brecha / Oportunidad</h3><ul>{gaps.length?gaps.map((g,i)=><li key={i}>{g.competency}: {g.gap>0?'+':''}{g.gap} pts · {g.reading}</li>):<li>Sin muestra suficiente del equipo.</li>}</ul></div>
        </div>
      </div>
      <Footer page="2"/>
    </section>

    <section className="reportPage reportPageThree">
      <Header/>
      <div className="personSummary compactPersonSummary">
        <div><b>Nombre:</b><span>{d.supervisor.name}</span></div>
        <div><b>Cargo:</b><span>{d.supervisor.position||'—'}</span></div>
        <div><b>Empresa:</b><span>{d.company.name}</span></div>
        <div><b>Estado:</b><span className="reportStatus">{report.status==='finalized'?'Informe final':'Borrador'}</span></div>
      </div>

      <div className="finalSection">
        <SectionTitle n="8">Análisis de la Psicóloga Laboral</SectionTitle>
        <div className="psychReportGrid">
          <div><h3>Contexto del cargo</h3><p>{psych.context_position||'Sin antecedente registrado.'}</p></div>
          <div><h3>Observaciones de entrevista</h3><p>{psych.interview_observations||'Sin antecedente registrado.'}</p></div>
          <div><h3>Fortalezas observadas</h3><p>{psych.strengths_observed||'Sin antecedente registrado.'}</p></div>
          <div><h3>Aspectos a desarrollar</h3><p>{psych.development_observed||'Sin antecedente registrado.'}</p></div>
          <div><h3>Factores del entorno</h3><p>{psych.environment_factors||'Sin antecedente registrado.'}</p></div>
          <div><h3>Síntesis profesional</h3><p>{psych.note&&psych.note!=='Análisis profesional estructurado'?psych.note:(psych.professional_recommendations||'Sin síntesis adicional.')}</p></div>
        </div>
      </div>

      <div className="finalSection">
        <SectionTitle n="9">Propuesta de Mejora</SectionTitle>
        <table className="finalPlanTable"><thead><tr><th>Foco</th><th>Acción</th><th>Responsable</th><th>Plazo</th><th>Indicador</th></tr></thead><tbody>
          {actionPlan.map((p,i)=><tr key={i}><td>{p.focus||'—'}</td><td>{p.action||p.objective||'—'}</td><td>{p.responsible||'—'}</td><td>{p.deadline||p.horizon||'—'}</td><td>{p.indicator||'—'}</td></tr>)}
        </tbody></table>
      </div>

      <div className="finalSection">
        <SectionTitle n="10">Plan 30 / 60 / 90 días</SectionTitle>
        <div className="timelinePrint">{actionPlan.slice(0,3).map((p,i)=><div key={i}><b>{p.deadline||['30 días','60 días','90 días'][i]}</b><h3>{p.focus||'Seguimiento'}</h3><p>{p.action||p.objective}</p></div>)}</div>
      </div>

      <div className="finalSection">
        <SectionTitle n="11">Indicadores de Seguimiento</SectionTitle>
        <table className="finalIndicatorsTable"><thead><tr><th>Indicador</th><th>Meta</th><th>Frecuencia</th></tr></thead><tbody>
          {indicators.map((x,i)=><tr key={i}><td>{x.indicator||'—'}</td><td>{x.target||'—'}</td><td>{x.frequency||'—'}</td></tr>)}
        </tbody></table>
      </div>

      <div className="finalSection closingSection">
        <SectionTitle n="12">Conclusión Profesional y Cierre</SectionTitle>
        <div className="closingPrintGrid">
          <p>{report.conclusion}</p>
          <div className="signatureArea"><div><span>Psicóloga Laboral</span><small>{psych.author||'Innova RC Capacita'}</small></div><div><span>Supervisor / Jefatura</span><small>Constancia de recepción</small></div></div>
        </div>
      </div>
      <Footer page="3"/>
    </section>
  </article>;
}

export default function AnalysisPage(){
  const [d,setD]=useState(null),[msg,setMsg]=useState(''),[psych,setPsych]=useState({});
  const [report,setReport]=useState(null);
  const id=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('id'):null;

  const load=()=>id&&api('/api/analysis?id='+id).then(x=>{
    setD(x);
    setPsych({
      note:x.professional_note?.note==='Análisis profesional estructurado'?'':x.professional_note?.note||'',
      context_position:x.professional_note?.context_position||'',
      interview_observations:x.professional_note?.interview_observations||'',
      strengths_observed:x.professional_note?.strengths_observed||'',
      development_observed:x.professional_note?.development_observed||'',
      environment_factors:x.professional_note?.environment_factors||'',
      professional_recommendations:x.professional_note?.professional_recommendations||''
    });
    const r=x.final_report||x.report_suggestion;
    if(r)setReport({
      strengths:r.strengths||[],development_areas:r.development_areas||[],opportunities:r.opportunities||[],
      recommendations:r.recommendations||[],action_plan:r.action_plan||[],executive_summary:r.executive_summary||'',
      objective_scope:r.objective_scope||'',indicators:r.indicators||[],conclusion:r.conclusion||'',
      evidence_matrix:r.evidence_matrix||[],status:x.final_report?.status||'draft',finalized_at:x.final_report?.finalized_at||null
    });
  }).catch(e=>setMsg(e.message));

  useEffect(load,[id]);
  useEffect(()=>{
    if(!d||typeof window==='undefined'||window.location.hash!=='#percepcion')return;
    const t=setTimeout(()=>document.getElementById('percepcion')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    return()=>clearTimeout(t);
  },[d]);

  const gaps=useMemo(()=>d?.self&&d?.team?.competencies
    ?COMP.map(k=>[k,+d.self.competencies[k],+d.team.competencies[k]]).map(x=>[...x,x[1]-x[2]])
    :[],[d]);

  if(!d)return <main className="shell"><a className="link" href="/admin">← Supervisores</a><div className="panel">{msg||'Cargando análisis…'}</div></main>;

  const enough=(d.team?.respondent_count||0)>=3;
  const isPsych=d.session?.role==='psychologist';
  const canEditReport=['admin','psychologist'].includes(d.session?.role);
  const finalized=report?.status==='finalized';
  const canEditDraft=canEditReport&&!finalized;
  const setLines=(key,text)=>setReport({...report,[key]:textArr(text)});
  const setPlanField=(i,key,val)=>{const next=[...(report?.action_plan||[])];next[i]={...(next[i]||{}),[key]:val};setReport({...report,action_plan:next})};
  const setIndicatorField=(i,key,val)=>{const next=[...(report?.indicators||[])];next[i]={...(next[i]||{}),[key]:val};setReport({...report,indicators:next})};

  const savePsych=async()=>{
    try{
      await api('/api/analysis/notes',{method:'POST',body:JSON.stringify({assessmentId:id,...psych})});
      setMsg('Análisis profesional guardado.');
      await load();
    }catch(e){setMsg(e.message)}
  };
  const saveReport=async(status)=>{
    try{
      await api('/api/analysis/final-report',{method:'POST',body:JSON.stringify({...report,assessmentId:id,status})});
      setMsg(status==='finalized'?'Informe finalizado correctamente.':finalized?'Informe reabierto como borrador.':'Borrador guardado correctamente.');
      await load();
    }catch(e){setMsg(e.message)}
  };

  return <main className="shell wide">
    <div className="topline screenOnly">
      <a className="link" href="/admin">← Listado de supervisores</a>
      <button className="primary" onClick={()=>window.print()}>Generar informe PDF</button>
    </div>

    <div className="screenOnly">
      <section className="panel supervisorHero">
        <div><div className="eyebrow">Ficha del supervisor</div><h1>{d.supervisor.name}</h1></div>
        <div className="supervisorMeta">
          <span><b>RUT:</b> {d.supervisor.rut}</span><span><b>Empresa:</b> {d.company.name}</span>
          <span><b>Cargo:</b> {d.supervisor.position||'—'}</span><span><b>Área:</b> {d.supervisor.area||'—'}</span>
          <span><b>Informe:</b> <span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Pendiente'}</span></span>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">Resultado automático</div><h2>Análisis de respuestas del supervisor</h2>
        {d.self_analysis?<p className="summaryParagraph">{d.self_analysis}</p>:<div className="privacy">El supervisor aún no completa su evaluación.</div>}
        <ChartSummary summary={d.chart_summary} enough={enough}/>
      </section>

      <section className="panel"><h2>Radar conductual D · I · S · C</h2>
        <p className="muted">El radar permite observar la intensidad relativa de las cuatro tendencias. Mientras más cerca del borde, mayor presencia relativa de la conducta.</p>
        <RadarChart title="Tendencias conductuales" labels={['D','I','S','C']} labelMap={{D:'Dominancia',I:'Influencia',S:'Estabilidad',C:'Cumplimiento'}} self={d.self?.disc} team={enough?d.team.disc:null} showExplanation/>
        {!enough&&<div className="privacy">La percepción del equipo se habilita con 3 o más respuestas. Actualmente hay {d.team?.respondent_count||0}.</div>}
      </section>

      <section className="panel conductPanel">
        <div className="sectionTitle"><div><div className="eyebrow">Lectura complementaria</div><h2>Gráfico de conductas D · I · S · C</h2></div></div>
        <p className="muted">Comparación directa de los porcentajes conductuales del supervisor y del equipo.</p>
        <DiscBars self={d.self?.disc} team={enough?d.team.disc:null}/>
      </section>

      <section className="panel"><h2>Comparación de competencias</h2>
        <p className="muted">Las barras permiten comparar de forma directa la autoevaluación del supervisor con la percepción agregada del equipo.</p>
        <ComparativeBars self={d.self?.competencies} team={enough?d.team.competencies:null}/>
      </section>

      {enough&&d.self&&<section className="panel"><h2>Tabla de brechas</h2><div className="tablewrap"><table>
        <thead><tr><th>Competencia</th><th>Supervisor</th><th>Equipo</th><th>Brecha</th><th>Lectura</th></tr></thead>
        <tbody>{gaps.map(([k,a,b,g])=>{const [lab,cl]=gapLabel(a,b);return <tr key={k}><td>{k}</td><td>{a}%</td><td>{b}%</td><td>{g>0?'+':''}{g}</td><td><span className={'pill '+cl}>{lab}</span></td></tr>})}</tbody>
      </table></div></section>}

      <section className="panel" id="percepcion">
        <div className="eyebrow">Entrevista profesional</div><h2>Análisis estructurado de la Psicóloga</h2>
        <p className="muted">Esta información se integra al informe final y permite considerar las características reales del puesto de trabajo y su contexto.</p>
        {canEditDraft?<PsychForm value={psych} setValue={setPsych} onSave={savePsych}/>:<div className="psychRead">
          <div><b>Contexto del puesto</b><p>{d.professional_note?.context_position||'Pendiente'}</p></div>
          <div><b>Observaciones de entrevista</b><p>{d.professional_note?.interview_observations||'Pendiente'}</p></div>
          <div><b>Fortalezas observadas</b><p>{d.professional_note?.strengths_observed||'Pendiente'}</p></div>
          <div><b>Aspectos a desarrollar</b><p>{d.professional_note?.development_observed||'Pendiente'}</p></div>
          <div><b>Factores del entorno</b><p>{d.professional_note?.environment_factors||'Pendiente'}</p></div>
          <div><b>Recomendaciones</b><p>{d.professional_note?.professional_recommendations||'Pendiente'}</p></div>
        </div>}
      </section>

      {d.integrated_summary&&<section className="panel integratedPanel"><div className="eyebrow">Síntesis integrada</div><h2>Lectura para la Psicóloga</h2><p className="summaryParagraph">{d.integrated_summary}</p></section>}

      <section className="panel finalReport">
        <div className="sectionTitle"><div><div className="eyebrow">Informe profesional</div><h2>Informe Final · Propuesta de Mejoras</h2></div><span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Borrador editable'}</span></div>
        <p className="muted">Administración y Psicología Laboral pueden revisar y corregir el borrador. Solo la Psicóloga puede finalizar el informe.</p>
        {report&&<>
          <h3>Objetivo y alcance</h3>
          {canEditDraft?<textarea className="analysisText compact" value={report.objective_scope||''} onChange={e=>setReport({...report,objective_scope:e.target.value})}/>:<p className="summaryParagraph">{report.objective_scope}</p>}
          <h3>Resumen ejecutivo</h3>
          {canEditDraft?<textarea className="analysisText compact" value={report.executive_summary||''} onChange={e=>setReport({...report,executive_summary:e.target.value})}/>:<p className="summaryParagraph">{report.executive_summary}</p>}

          <div className="reportGrid">
            <div><h3>Fortalezas</h3>{canEditDraft?<textarea className="analysisText compact" value={arrText(report.strengths)} onChange={e=>setLines('strengths',e.target.value)}/>:<ul>{report.strengths?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Áreas de desarrollo</h3>{canEditDraft?<textarea className="analysisText compact" value={arrText(report.development_areas)} onChange={e=>setLines('development_areas',e.target.value)}/>:<ul>{report.development_areas?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Oportunidades</h3>{canEditDraft?<textarea className="analysisText compact" value={arrText(report.opportunities)} onChange={e=>setLines('opportunities',e.target.value)}/>:<ul>{report.opportunities?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Recomendaciones</h3>{canEditDraft?<textarea className="analysisText compact" value={arrText(report.recommendations)} onChange={e=>setLines('recommendations',e.target.value)}/>:<ul>{report.recommendations?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
          </div>

          <h3>Propuesta de mejora</h3>
          <div className="tablewrap"><table className="editPlanTable"><thead><tr><th>Foco</th><th>Objetivo</th><th>Acción</th><th>Responsable</th><th>Plazo</th><th>Indicador</th></tr></thead><tbody>
            {(report.action_plan||[]).map((p,i)=><tr key={i}>
              {['focus','objective','action','responsible','deadline','indicator'].map(k=><td key={k}>{canEditDraft?<textarea value={p[k]||''} onChange={e=>setPlanField(i,k,e.target.value)}/>:p[k]||'—'}</td>)}
            </tr>)}
          </tbody></table></div>

          <h3>Indicadores de seguimiento</h3>
          <div className="tablewrap"><table className="editPlanTable compactTable"><thead><tr><th>Indicador</th><th>Meta</th><th>Frecuencia</th></tr></thead><tbody>
            {(report.indicators||[]).map((p,i)=><tr key={i}>
              {['indicator','target','frequency'].map(k=><td key={k}>{canEditDraft?<textarea value={p[k]||''} onChange={e=>setIndicatorField(i,k,e.target.value)}/>:p[k]||'—'}</td>)}
            </tr>)}
          </tbody></table></div>

          <h3>Conclusión profesional</h3>
          {canEditDraft?<textarea className="analysisText" value={report.conclusion||''} onChange={e=>setReport({...report,conclusion:e.target.value})}/>:<p className="summaryParagraph">{report.conclusion}</p>}

          {canEditDraft&&<div className="reportActions">
            <button className="ghost" onClick={()=>saveReport('draft')}>Guardar cambios del borrador</button>
            {isPsych&&<button className="primary" disabled={!d.professional_note} onClick={()=>saveReport('finalized')}>Finalizar informe</button>}
          </div>}
          {finalized&&canEditReport&&<div className="reportActions">
            <button className="ghost" onClick={()=>saveReport('draft')}>Reabrir como borrador</button>
          </div>}
          {canEditDraft&&isPsych&&!d.professional_note&&<div className="privacy">Antes de finalizar, guarda el análisis profesional de la entrevista y el puesto de trabajo.</div>}
        </>}
        {msg&&<div className="notice">{msg}</div>}
      </section>
    </div>

    <ReportDocument d={d} report={report} enough={enough}/>
  </main>;
}
