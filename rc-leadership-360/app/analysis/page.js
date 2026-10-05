'use client';
import { useEffect,useMemo,useState } from 'react';
import { DISC,COMP } from '../../lib/instrument';
import { gapLabel } from '../../lib/scoring';

const api=async(url,opts={})=>{const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Error');return d};

function TrendChart({self,team}){
  const dims=['D','I','S','C']; const [active,setActive]=useState('D');
  const x=[70,190,310,430], y=v=>210-(Math.max(0,Math.min(100,Number(v)||0))*1.6);
  const line=obj=>dims.map((k,i)=>x[i]+','+y(obj?.[k])).join(' ');
  return <div className="trendWrap">
    <svg className="trendChart" viewBox="0 0 500 250" role="img" aria-label="Tendencias conductuales D I S C">
      {[0,25,50,75,100].map(v=><g key={v}><line x1="50" x2="455" y1={y(v)} y2={y(v)} className="gridLine"/><text x="15" y={y(v)+5} className="axisText">{v}</text></g>)}
      {dims.map((k,i)=><text key={k} x={x[i]-7} y="235" className="axisLabel">{k}</text>)}
      {self&&<polyline points={line(self)} className="selfLine"/>}
      {team&&<polyline points={line(team)} className="teamLine"/>}
      {dims.map((k,i)=><g key={k}>
        {self&&<circle cx={x[i]} cy={y(self[k])} r={active===k?8:6} className="selfPoint" onClick={()=>setActive(k)}/>}
        {team&&<circle cx={x[i]} cy={y(team[k])} r={active===k?8:6} className="teamPoint" onClick={()=>setActive(k)}/>}
      </g>)}
    </svg>
    <div className="trendLegend"><span><i className="legendSelf"/>Autopercepción</span>{team&&<span><i className="legendTeam"/>Equipo</span>}</div>
    <div className="trendDetail">
      <b>{active} · {DISC[active]}</b>
      <span>Autopercepción: {self?.[active]??'-'}%</span>
      <span>Equipo: {team?.[active]??'Muestra insuficiente'}{team?.[active]!=null?'%':''}</span>
    </div>
  </div>
}

export default function AnalysisPage(){
  const [d,setD]=useState(null),[msg,setMsg]=useState(''),[note,setNote]=useState('');
  const id=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('id'):null;
  const load=()=>id&&api('/api/analysis?id='+id).then(x=>{setD(x);setNote(x.professional_note?.note||'')}).catch(e=>setMsg(e.message));
  useEffect(load,[id]);
  const gaps=useMemo(()=>d?.self&&d?.team?.competencies?COMP.map(k=>[k,+d.self.competencies[k],+d.team.competencies[k]]).map(x=>[...x,x[1]-x[2]]):[],[d]);
  if(!d)return <main className="shell"><a className="link" href="/admin">← Administración</a><div className="panel">{msg||'Cargando análisis…'}</div></main>;
  const enough=(d.team?.respondent_count||0)>=3;
  return <main className="shell wide">
    <div className="topline"><a className="link" href="/admin">← Administración</a><button className="primary" onClick={()=>window.print()}>Imprimir / PDF</button></div>
    <section className="panel"><div className="eyebrow">Análisis profesional confidencial</div><h1>{d.supervisor.name}</h1><p>{d.company.name} · {d.assessment.cycle}</p></section>

    <section className="panel"><h2>Tendencias de conducta</h2><p className="muted">Selecciona cada dimensión del gráfico para revisar sus valores.</p>
      <TrendChart self={d.self?.disc} team={enough?d.team.disc:null}/>
      {!enough&&<div className="privacy">La tendencia del equipo se habilita con 3 o más respuestas. Actualmente hay {d.team?.respondent_count||0}.</div>}
    </section>

    {enough&&d.self&&<section className="panel"><h2>Brechas de percepción</h2><div className="tablewrap"><table><thead><tr><th>Competencia</th><th>Autopercepción</th><th>Equipo</th><th>Brecha</th><th>Lectura</th></tr></thead><tbody>
      {gaps.map(([k,a,b,g])=>{const [lab,cl]=gapLabel(a,b);return <tr key={k}><td>{k}</td><td>{a}%</td><td>{b}%</td><td>{g>0?'+':''}{g}</td><td><span className={'pill '+cl}>{lab}</span></td></tr>})}
    </tbody></table></div></section>}

    <section className="panel">
      <h2>Análisis post entrevista</h2>
      <p className="muted">Registro profesional de la Psicóloga posterior a la entrevista con el supervisor.</p>
      <textarea className="analysisText" value={note} onChange={e=>setNote(e.target.value)} placeholder="Escribe aquí el análisis profesional, observaciones, contexto y focos de desarrollo…"/>
      <button className="primary" onClick={async()=>{try{await api('/api/analysis/notes',{method:'POST',body:JSON.stringify({assessmentId:id,note})});setMsg('Análisis profesional guardado.');await load()}catch(e){setMsg(e.message)}}}>Guardar análisis profesional</button>
      {msg&&<div className="notice">{msg}</div>}
    </section>

    {d.integrated_summary&&<section className="panel"><div className="eyebrow">Síntesis integrada</div><h2>Lectura profesional</h2><p className="summaryParagraph">{d.integrated_summary}</p></section>}
  </main>;
}
