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

function RadarChart({labels,self,team,title,labelMap}){
  const [active,setActive]=useState(labels[0]);
  const cx=250,cy=225,R=165,n=labels.length;
  const point=(i,pct)=>{
    const a=(-Math.PI/2)+(i*2*Math.PI/n);
    const r=R*Math.max(0,Math.min(100,Number(pct)||0))/100;
    return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];
  };
  const ring=pct=>labels.map((_,i)=>point(i,pct).join(',')).join(' ');
  const poly=obj=>labels.map((k,i)=>point(i,obj?.[k]||0).join(',')).join(' ');
  return <div className="radarBlock">
    <div className="radarHeader">
      <div><h3>{title}</h3><p className="muted">Haz clic en una dimensión para revisar su valor.</p></div>
      <div className="trendLegend"><span><i className="legendSelf"/>Autopercepción</span>{team&&<span><i className="legendTeam"/>Equipo</span>}</div>
    </div>
    <svg className="radarSvg" viewBox="0 0 500 470" role="img" aria-label={title}>
      {[20,40,60,80,100].map(v=><polygon key={v} points={ring(v)} className="radarRing"/>)}
      {labels.map((k,i)=>{
        const [x,y]=point(i,100);
        return <g key={k}>
          <line x1={cx} y1={cy} x2={x} y2={y} className="radarAxis"/>
          <circle cx={x} cy={y} r="22" className={active===k?'radarLabelHit active':'radarLabelHit'} onClick={()=>setActive(k)}/>
          <text x={x} y={y+5} textAnchor="middle" className="radarLabel" onClick={()=>setActive(k)}>{k.length>14?k.slice(0,12)+'…':k}</text>
        </g>
      })}
      {self&&<polygon points={poly(self)} className="radarSelfArea"/>}
      {team&&<polygon points={poly(team)} className="radarTeamArea"/>}
      {labels.map((k,i)=>{
        const [sx,sy]=point(i,self?.[k]||0),[tx,ty]=point(i,team?.[k]||0);
        return <g key={'p-'+k}>
          {self&&<circle cx={sx} cy={sy} r={active===k?7:5} className="radarSelfPoint" onClick={()=>setActive(k)}/>}
          {team&&<circle cx={tx} cy={ty} r={active===k?7:5} className="radarTeamPoint" onClick={()=>setActive(k)}/>}
        </g>
      })}
      <circle cx={cx} cy={cy} r="3" className="radarCenter"/>
    </svg>
    <div className="radarDetail">
      <b>{labelMap?.[active]||active}</b>
      <span>Autopercepción: {self?.[active]??'-'}%</span>
      <span>Equipo: {team?.[active]??'Muestra insuficiente'}{team?.[active]!=null?'%':''}</span>
    </div>
  </div>;
}

export default function AnalysisPage(){
  const [d,setD]=useState(null),[msg,setMsg]=useState(''),[note,setNote]=useState('');
  const [report,setReport]=useState(null);
  const id=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('id'):null;

  const load=()=>id&&api('/api/analysis?id='+id).then(x=>{
    setD(x);
    setNote(x.professional_note?.note||'');
    const r=x.final_report||x.report_suggestion;
    if(r)setReport({
      strengths:r.strengths||[],
      development_areas:r.development_areas||[],
      opportunities:r.opportunities||[],
      recommendations:r.recommendations||[],
      action_plan:r.action_plan||[],
      executive_summary:r.executive_summary||'',
      status:x.final_report?.status||'draft',
      finalized_at:x.final_report?.finalized_at||null
    });
  }).catch(e=>setMsg(e.message));

  useEffect(load,[id]);

  const gaps=useMemo(()=>d?.self&&d?.team?.competencies
    ?COMP.map(k=>[k,+d.self.competencies[k],+d.team.competencies[k]]).map(x=>[...x,x[1]-x[2]])
    :[],[d]);

  if(!d)return <main className="shell">
    <a className="link" href="/admin">← Supervisores</a>
    <div className="panel">{msg||'Cargando análisis…'}</div>
  </main>;

  const enough=(d.team?.respondent_count||0)>=3;
  const isPsych=d.session?.role==='psychologist';
  const finalized=report?.status==='finalized';
  const setLines=(key,text)=>setReport({...report,[key]:textArr(text)});
  const setPlan=(i,val)=>{
    const next=[...(report?.action_plan||[])];
    next[i]={...(next[i]||{}),action:val};
    setReport({...report,action_plan:next});
  };
  const saveReport=async(status)=>{
    try{
      if(!report)return;
      await api('/api/analysis/final-report',{method:'POST',body:JSON.stringify({...report,assessmentId:id,status})});
      setMsg(status==='finalized'?'Informe finalizado correctamente.':'Borrador guardado.');
      await load();
    }catch(e){setMsg(e.message)}
  };

  return <main className="shell wide">
    <div className="topline">
      <a className="link" href="/admin">← Listado de supervisores</a>
      <button className="primary" onClick={()=>window.print()}>Imprimir / PDF</button>
    </div>

    <section className="panel">
      <div className="eyebrow">Ficha del supervisor</div>
      <h1>{d.supervisor.name}</h1>
      <div className="supervisorMeta">
        <span><b>RUT:</b> {d.supervisor.rut}</span>
        <span><b>Empresa:</b> {d.company.name}</span>
        <span><b>Cargo:</b> {d.supervisor.position||'—'}</span>
        <span><b>Área:</b> {d.supervisor.area||'—'}</span>
        <span><b>Ciclo:</b> {d.assessment.cycle}</span>
        <span><b>Informe:</b> <span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Pendiente'}</span></span>
      </div>
    </section>

    <section className="panel">
      <div className="eyebrow">1. Resultado automático</div>
      <h2>Análisis de respuestas del supervisor</h2>
      {d.self_analysis?<p className="summaryParagraph">{d.self_analysis}</p>:<div className="privacy">El supervisor aún no completa su evaluación.</div>}
      {d.self&&<div className="profileTags"><span>Perfil principal: <b>{d.self.primary} · {DISC[d.self.primary]}</b></span><span>Secundario: <b>{d.self.secondary} · {DISC[d.self.secondary]}</b></span></div>}
    </section>

    <section className="panel">
      <h2>Radar conductual D · I · S · C</h2>
      <RadarChart title="Tendencias conductuales" labels={['D','I','S','C']} labelMap={{D:'Dominancia',I:'Influencia',S:'Estabilidad',C:'Cumplimiento'}} self={d.self?.disc} team={enough?d.team.disc:null}/>
      {!enough&&<div className="privacy">La percepción del equipo se habilita con 3 o más respuestas. Actualmente hay {d.team?.respondent_count||0}.</div>}
    </section>

    <section className="panel">
      <h2>Radar de competencias</h2>
      <RadarChart title="Comparación de 10 competencias" labels={COMP} self={d.self?.competencies} team={enough?d.team.competencies:null}/>
    </section>

    {enough&&d.self&&<section className="panel">
      <h2>Brechas de percepción</h2>
      <div className="tablewrap"><table>
        <thead><tr><th>Competencia</th><th>Supervisor</th><th>Equipo</th><th>Brecha</th><th>Lectura</th></tr></thead>
        <tbody>{gaps.map(([k,a,b,g])=>{const [lab,cl]=gapLabel(a,b);return <tr key={k}><td>{k}</td><td>{a}%</td><td>{b}%</td><td>{g>0?'+':''}{g}</td><td><span className={'pill '+cl}>{lab}</span></td></tr>})}</tbody>
      </table></div>
    </section>}

    <section className="panel">
      <div className="eyebrow">2. Entrevista profesional</div>
      <h2>Análisis de la Psicóloga</h2>
      {isPsych&&!finalized
        ?<><textarea className="analysisText" value={note} onChange={e=>setNote(e.target.value)} placeholder="Registra aquí el análisis post entrevista, contexto, observaciones y focos de desarrollo…"/>
          <button className="primary" onClick={async()=>{try{await api('/api/analysis/notes',{method:'POST',body:JSON.stringify({assessmentId:id,note})});setMsg('Análisis de entrevista guardado.');await load()}catch(e){setMsg(e.message)}}}>Guardar análisis de entrevista</button></>
        :<p className="summaryParagraph">{d.professional_note?.note||'Análisis de entrevista pendiente.'}</p>}
    </section>

    {d.integrated_summary&&<section className="panel">
      <div className="eyebrow">Síntesis de apoyo</div>
      <h2>Lectura integrada para la Psicóloga</h2>
      <p className="summaryParagraph">{d.integrated_summary}</p>
    </section>}

    <section className="panel finalReport">
      <div className="sectionTitle">
        <div><div className="eyebrow">3. Documento independiente</div><h2>Informe Final · Propuesta de Mejoras</h2></div>
        <span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Pendiente'}</span>
      </div>
      <p className="muted">Este informe integra la evaluación del supervisor, la percepción agregada del equipo y el análisis profesional de la Psicóloga. Puede editarse antes de finalizar.</p>

      {!report&&<div className="privacy">La propuesta se genera cuando existe una evaluación del supervisor.</div>}

      {report&&<>
        <div className="reportIdentity"><b>{d.supervisor.name}</b><span>RUT {d.supervisor.rut}</span><span>{d.supervisor.position||'Sin cargo informado'}</span><span>{d.company.name}</span></div>

        <h3>Resumen ejecutivo</h3>
        {isPsych&&!finalized
          ?<textarea className="analysisText compact" value={report.executive_summary||''} onChange={e=>setReport({...report,executive_summary:e.target.value})}/>
          :<p className="summaryParagraph">{report.executive_summary}</p>}

        <div className="reportGrid">
          <div><h3>Fortalezas</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.strengths)} onChange={e=>setLines('strengths',e.target.value)}/>:<ul>{report.strengths?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
          <div><h3>Debilidades / áreas de desarrollo</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.development_areas)} onChange={e=>setLines('development_areas',e.target.value)}/>:<ul>{report.development_areas?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
          <div><h3>Oportunidades de desarrollo</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.opportunities)} onChange={e=>setLines('opportunities',e.target.value)}/>:<ul>{report.opportunities?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
          <div><h3>Recomendaciones</h3>{isPsych&&!finalized?<textarea className="analysisText compact" value={arrText(report.recommendations)} onChange={e=>setLines('recommendations',e.target.value)}/>:<ul>{report.recommendations?.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>
        </div>

        <h3>Plan de mejora 30 / 60 / 90 días</h3>
        <div className="planGrid">{(report.action_plan||[]).map((p,i)=><div className="planCard" key={i}>
          <b>{p.horizon||['30 días','60 días','90 días'][i]||'Etapa'}</b>
          {isPsych&&!finalized?<textarea value={p.action||''} onChange={e=>setPlan(i,e.target.value)}/>:<p>{p.action}</p>}
        </div>)}</div>

        {isPsych&&!finalized&&<div className="reportActions">
          <button className="ghost" onClick={()=>saveReport('draft')}>Guardar borrador</button>
          <button className="primary" disabled={!d.self||!d.professional_note?.note} onClick={()=>saveReport('finalized')}>Finalizar informe</button>
        </div>}
        {isPsych&&!finalized&&!d.professional_note?.note&&<div className="privacy">Para finalizar el informe primero debes guardar el análisis post entrevista.</div>}
      </>}
      {msg&&<div className="notice">{msg}</div>}
    </section>
  </main>;
}
