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
  const cx=250,cy=225,R=165,n=labels.length;
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

  return <div className="radarBlock neonCard">
    <div className="radarHeader">
      <div><h3>{title}</h3><p className="muted">Selecciona una dimensión para ver su porcentaje y lectura.</p></div>
      <div className="trendLegend"><span><i className="legendSelf"/>Supervisor</span>{team&&<span><i className="legendTeam"/>Equipo</span>}</div>
    </div>
    <div className="radarStage">
      <div className="holoOrb holoOrbOne"/><div className="holoOrb holoOrbTwo"/>
      <svg className="radarSvg" viewBox="0 0 500 470" role="img" aria-label={title}>
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
          </g>
        })}
        <circle cx={cx} cy={cy} r="4" className="radarCenter"/>
      </svg>
    </div>
    <div className="radarInsight">
      <div><span className="eyebrow">Dimensión seleccionada</span><h3>{activeName}</h3></div>
      <div className="radarNumbers"><strong>{sv??'-'}%</strong><span>Supervisor</span></div>
      {team&&<div className="radarNumbers team"><strong>{tv??'-'}%</strong><span>Equipo</span></div>}
      {gap!=null&&<div className="radarNumbers gap"><strong>{gap>0?'+':''}{gap}</strong><span>Brecha</span></div>}
    </div>
    {showExplanation&&DISC_INFO[active]&&<div className="chartExplanation"><b>¿Qué representa?</b><p>{DISC_INFO[active].text}</p>{gap!=null&&<p><b>Lectura:</b> {Math.abs(gap)<10?'La percepción es bastante consistente entre supervisor y equipo.':gap>0?'El supervisor se percibe con mayor presencia de esta conducta que la observada por el equipo.':'El equipo observa una mayor presencia de esta conducta que la reconocida por el supervisor.'}</p>}</div>}
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
  return <article className="reportDocument">
    <section className="reportCover">
      <img src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/>
      <div><span>RC LEADERSHIP 360</span><h1>Informe Final de Retroalimentación y Propuesta de Mejora</h1><p>Evaluación conductual y de competencias para desarrollo organizacional</p></div>
      <div className="coverPerson"><b>{d.supervisor.name}</b><span>RUT {d.supervisor.rut}</span><span>{d.supervisor.position||'Cargo no informado'} · {d.company.name}</span></div>
    </section>

    <section className="reportSection">
      <h2>1. Antecedentes</h2>
      <table className="reportTable"><tbody>
        <tr><th>Nombre</th><td>{d.supervisor.name}</td><th>RUT</th><td>{d.supervisor.rut}</td></tr>
        <tr><th>Empresa</th><td>{d.company.name}</td><th>Cargo</th><td>{d.supervisor.position||'—'}</td></tr>
        <tr><th>Área</th><td>{d.supervisor.area||'—'}</td><th>Ciclo</th><td>{d.assessment.cycle}</td></tr>
      </tbody></table>
    </section>

    <section className="reportSection">
      <h2>2. Síntesis conductual</h2>
      <RadarChart title="Perfil conductual D · I · S · C" labels={['D','I','S','C']} labelMap={{D:'Dominancia',I:'Influencia',S:'Estabilidad',C:'Cumplimiento'}} self={d.self?.disc} team={enough?d.team.disc:null}/>
      <p className="reportText">{d.self_analysis}</p>
    </section>

    <section className="reportSection">
      <h2>3. Competencias y brechas</h2>
      <ComparativeBars self={d.self?.competencies} team={enough?d.team.competencies:null}/>
    </section>

    <section className="reportSection">
      <h2>4. Análisis profesional del puesto y entrevista</h2>
      <table className="reportTable vertical"><tbody>
        <tr><th>Contexto del puesto</th><td>{d.professional_note?.context_position||'Sin antecedente registrado.'}</td></tr>
        <tr><th>Observaciones de entrevista</th><td>{d.professional_note?.interview_observations||'Sin antecedente registrado.'}</td></tr>
        <tr><th>Fortalezas observadas</th><td>{d.professional_note?.strengths_observed||'Sin antecedente registrado.'}</td></tr>
        <tr><th>Aspectos a desarrollar</th><td>{d.professional_note?.development_observed||'Sin antecedente registrado.'}</td></tr>
        <tr><th>Factores del entorno</th><td>{d.professional_note?.environment_factors||'Sin antecedente registrado.'}</td></tr>
        <tr><th>Recomendaciones profesionales</th><td>{d.professional_note?.professional_recommendations||'Sin antecedente registrado.'}</td></tr>
      </tbody></table>
    </section>

    <section className="reportSection">
      <h2>5. Síntesis integrada</h2>
      <p className="reportText">{report.executive_summary}</p>
      <div className="reportQuad">
        <div><h3>Fortalezas</h3><ul>{report.strengths?.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
        <div><h3>Áreas de desarrollo</h3><ul>{report.development_areas?.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
        <div><h3>Oportunidades</h3><ul>{report.opportunities?.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
        <div><h3>Recomendaciones</h3><ul>{report.recommendations?.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
      </div>
    </section>

    <section className="reportSection">
      <h2>6. Plan de mejora 30 / 60 / 90 días</h2>
      <table className="reportTable"><thead><tr><th>Horizonte</th><th>Acción propuesta</th><th>Indicador sugerido</th></tr></thead><tbody>
        {(report.action_plan||[]).map((p,i)=><tr key={i}><td><b>{p.horizon}</b></td><td>{p.action}</td><td>{['Conductas acordadas y feedback realizado','Evidencias de avance y ajustes registrados','Revisión final y continuidad definida'][i]||'Evidencia de avance'}</td></tr>)}
      </tbody></table>
    </section>

    <footer className="reportFooter">INNOVA RC CAPACITA · RC Leadership 360 · Informe confidencial de desarrollo</footer>
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
      status:x.final_report?.status||'draft',finalized_at:x.final_report?.finalized_at||null
    });
  }).catch(e=>setMsg(e.message));

  useEffect(load,[id]);

  const gaps=useMemo(()=>d?.self&&d?.team?.competencies
    ?COMP.map(k=>[k,+d.self.competencies[k],+d.team.competencies[k]]).map(x=>[...x,x[1]-x[2]])
    :[],[d]);

  if(!d)return <main className="shell"><a className="link" href="/admin">← Supervisores</a><div className="panel">{msg||'Cargando análisis…'}</div></main>;

  const enough=(d.team?.respondent_count||0)>=3;
  const isPsych=d.session?.role==='psychologist';
  const finalized=report?.status==='finalized';
  const setLines=(key,text)=>setReport({...report,[key]:textArr(text)});
  const setPlan=(i,val)=>{const next=[...(report?.action_plan||[])];next[i]={...(next[i]||{}),action:val};setReport({...report,action_plan:next})};

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
      setMsg(status==='finalized'?'Informe finalizado correctamente.':'Borrador guardado.');
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

      <section className="panel"><h2>Comparación de competencias</h2>
        <p className="muted">Las barras permiten comparar de forma directa la autoevaluación del supervisor con la percepción agregada del equipo.</p>
        <ComparativeBars self={d.self?.competencies} team={enough?d.team.competencies:null}/>
      </section>

      {enough&&d.self&&<section className="panel"><h2>Tabla de brechas</h2><div className="tablewrap"><table>
        <thead><tr><th>Competencia</th><th>Supervisor</th><th>Equipo</th><th>Brecha</th><th>Lectura</th></tr></thead>
        <tbody>{gaps.map(([k,a,b,g])=>{const [lab,cl]=gapLabel(a,b);return <tr key={k}><td>{k}</td><td>{a}%</td><td>{b}%</td><td>{g>0?'+':''}{g}</td><td><span className={'pill '+cl}>{lab}</span></td></tr>})}</tbody>
      </table></div></section>}

      <section className="panel">
        <div className="eyebrow">Entrevista profesional</div><h2>Análisis estructurado de la Psicóloga</h2>
        <p className="muted">Esta información se integra al informe final y permite considerar las características reales del puesto de trabajo y su contexto.</p>
        {isPsych&&!finalized?<PsychForm value={psych} setValue={setPsych} onSave={savePsych}/>:<div className="psychRead">
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
        <div className="sectionTitle"><div><div className="eyebrow">Informe profesional</div><h2>Propuesta de Mejoras</h2></div><span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Pendiente'}</span></div>
        <p className="muted">El informe es un documento independiente. Al generar PDF se imprimirá únicamente el informe diseñado, no la pantalla de trabajo.</p>
        {report&&<>
          <h3>Resumen ejecutivo</h3>
          {isPsych&&!finalized?<textarea className="analysisText compact" value={report.executive_summary||''} onChange={e=>setReport({...report,executive_summary:e.target.value})}/>:<p className="summaryParagraph">{report.executive_summary}</p>}
          <div className="reportGrid">
            <div><h3>Fortalezas</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.strengths)} onChange={e=>setLines('strengths',e.target.value)}/>:<ul>{report.strengths?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Áreas de desarrollo</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.development_areas)} onChange={e=>setLines('development_areas',e.target.value)}/>:<ul>{report.development_areas?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Oportunidades</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.opportunities)} onChange={e=>setLines('opportunities',e.target.value)}/>:<ul>{report.opportunities?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
            <div><h3>Recomendaciones</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.recommendations)} onChange={e=>setLines('recommendations',e.target.value)}/>:<ul>{report.recommendations?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
          </div>
          <h3>Plan 30 / 60 / 90 días</h3><div className="planGrid">{(report.action_plan||[]).map((p,i)=><div className="planCard" key={i}><b>{p.horizon}</b>{isPsych&&!finalized?<textarea value={p.action||''} onChange={e=>setPlan(i,e.target.value)}/>:<p>{p.action}</p>}</div>)}</div>
          {isPsych&&!finalized&&<div className="reportActions"><button className="ghost" onClick={()=>saveReport('draft')}>Guardar borrador</button><button className="primary" disabled={!d.professional_note} onClick={()=>saveReport('finalized')}>Finalizar informe</button></div>}
        </>}
        {msg&&<div className="notice">{msg}</div>}
      </section>
    </div>

    <ReportDocument d={d} report={report} enough={enough}/>
  </main>;
}
