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

function RadarChart({labels,self,team,title,labelMap}){
  const [active,setActive]=useState(labels[0]);
  const cx=250,cy=225,R=165;
  const n=labels.length;
  const point=(i,pct)=>{
    const a=(-Math.PI/2)+(i*2*Math.PI/n);
    const r=R*Math.max(0,Math.min(100,Number(pct)||0))/100;
    return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];
  };
  const ring=(pct)=>labels.map((_,i)=>point(i,pct).join(',')).join(' ');
  const poly=(obj)=>labels.map((k,i)=>point(i,obj?.[k]||0).join(',')).join(' ');
  const activeName=labelMap?.[active]||active;
  const selfVal=self?.[active];
  const teamVal=team?.[active];

  return <div className="radarBlock">
    <div className="radarHeader">
      <div><h3>{title}</h3><p className="muted">Haz clic en una dimensión para revisar su valor.</p></div>
      <div className="trendLegend">
        <span><i className="legendSelf"/>Autopercepción</span>
        {team&&<span><i className="legendTeam"/>Equipo</span>}
      </div>
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
        const [sx,sy]=point(i,self?.[k]||0);
        const [tx,ty]=point(i,team?.[k]||0);
        return <g key={'p-'+k}>
          {self&&<circle cx={sx} cy={sy} r={active===k?7:5} className="radarSelfPoint" onClick={()=>setActive(k)}/>}
          {team&&<circle cx={tx} cy={ty} r={active===k?7:5} className="radarTeamPoint" onClick={()=>setActive(k)}/>}
        </g>
      })}
      <circle cx={cx} cy={cy} r="3" className="radarCenter"/>
    </svg>

    <div className="radarDetail">
      <b>{activeName}</b>
      <span>Autopercepción: {selfVal??'-'}%</span>
      <span>Equipo: {teamVal??'Muestra insuficiente'}{teamVal!=null?'%':''}</span>
    </div>
  </div>;
}

export default function AnalysisPage(){
  const [d,setD]=useState(null),[msg,setMsg]=useState(''),[note,setNote]=useState('');
  const id=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('id'):null;
  const load=()=>id&&api('/api/analysis?id='+id).then(x=>{setD(x);setNote(x.professional_note?.note||'')}).catch(e=>setMsg(e.message));
  useEffect(load,[id]);

  const gaps=useMemo(
    ()=>d?.self&&d?.team?.competencies
      ?COMP.map(k=>[k,+d.self.competencies[k],+d.team.competencies[k]]).map(x=>[...x,x[1]-x[2]])
      :[],
    [d]
  );

  if(!d)return <main className="shell">
    <a className="link" href="/admin">← Administración</a>
    <div className="panel">{msg||'Cargando análisis…'}</div>
  </main>;

  const enough=(d.team?.respondent_count||0)>=3;
  const discLabels={D:'Dominancia',I:'Influencia',S:'Estabilidad',C:'Cumplimiento'};

  return <main className="shell wide">
    <div className="topline">
      <a className="link" href="/admin">← Administración</a>
      <button className="primary" onClick={()=>window.print()}>Imprimir / PDF</button>
    </div>

    <section className="panel">
      <div className="eyebrow">Análisis profesional confidencial</div>
      <h1>{d.supervisor.name}</h1>
      <p>{d.company.name} · {d.assessment.cycle}</p>
    </section>

    <section className="panel">
      <h2>Tendencias conductuales</h2>
      <RadarChart
        title="Radar conductual D · I · S · C"
        labels={['D','I','S','C']}
        labelMap={discLabels}
        self={d.self?.disc}
        team={enough?d.team.disc:null}
      />
      {!enough&&<div className="privacy">La percepción del equipo se incorpora al radar cuando existen 3 o más respuestas. Actualmente hay {d.team?.respondent_count||0}.</div>}
    </section>

    <section className="panel">
      <h2>Radar de competencias</h2>
      <RadarChart
        title="Comparación de 10 competencias"
        labels={COMP}
        self={d.self?.competencies}
        team={enough?d.team.competencies:null}
      />
      {!d.self&&<div className="privacy">La autoevaluación del supervisor aún está pendiente.</div>}
    </section>

    {enough&&d.self&&<section className="panel">
      <h2>Brechas de percepción</h2>
      <div className="tablewrap"><table>
        <thead><tr><th>Competencia</th><th>Autopercepción</th><th>Equipo</th><th>Brecha</th><th>Lectura</th></tr></thead>
        <tbody>
          {gaps.map(([k,a,b,g])=>{
            const [lab,cl]=gapLabel(a,b);
            return <tr key={k}>
              <td>{k}</td><td>{a}%</td><td>{b}%</td><td>{g>0?'+':''}{g}</td>
              <td><span className={'pill '+cl}>{lab}</span></td>
            </tr>
          })}
        </tbody>
      </table></div>
    </section>}

    <section className="panel">
      <h2>Análisis post entrevista</h2>
      <p className="muted">Registro profesional de la Psicóloga posterior a la entrevista con el supervisor.</p>
      <textarea className="analysisText" value={note} onChange={e=>setNote(e.target.value)} placeholder="Escribe aquí el análisis profesional, observaciones, contexto y focos de desarrollo…"/>
      <button className="primary" onClick={async()=>{
        try{
          await api('/api/analysis/notes',{method:'POST',body:JSON.stringify({assessmentId:id,note})});
          setMsg('Análisis profesional guardado.');
          await load();
        }catch(e){setMsg(e.message)}
      }}>Guardar análisis profesional</button>
      {msg&&<div className="notice">{msg}</div>}
    </section>

    {d.integrated_summary&&<section className="panel">
      <div className="eyebrow">Síntesis integrada</div>
      <h2>Lectura profesional</h2>
      <p className="summaryParagraph">{d.integrated_summary}</p>
    </section>}
  </main>;
}
