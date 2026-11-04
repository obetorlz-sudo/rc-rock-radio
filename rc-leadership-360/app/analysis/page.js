'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { DISC,COMP } from '../../lib/instrument';
import { gapLabel } from '../../lib/scoring';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const api=async(url,opts={})=>{
  let lastError=null;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch(url,{
        ...opts,
        cache:'no-store',
        credentials:'same-origin',
        signal:controller.signal,
        headers:{'Content-Type':'application/json',...(opts.headers||{})}
      });
      clearTimeout(timer);
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'No fue posible completar la operación.');
      return d;
    }catch(e){
      clearTimeout(timer);
      lastError=e;
      const connectionError=e?.name==='TypeError'||e?.name==='AbortError'||String(e?.message||'').toLowerCase().includes('fetch');
      if(!connectionError)throw e;
      if(attempt<2)await sleep(700*(attempt+1));
    }
  }
  throw new Error('No fue posible conectar con el servidor. Revisa la conexión e inténtalo nuevamente; el borrador se conservará en este equipo.');
};
const arrText=a=>(a||[]).join('\n');
const textArr=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);

const renderInline=text=>{
  const parts=String(text||'').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')
    ?<strong key={i}>{part.slice(2,-2)}</strong>
    :<span key={i}>{part}</span>);
};

function FormattedText({text,className=''}) {
  const lines=String(text||'').replace(/\r/g,'').split('\n');
  const blocks=[];
  let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    const bullet=line.match(/^\s*[•*-]\s+(.+)$/);
    const number=line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(bullet){
      const items=[];
      while(i<lines.length){
        const m=lines[i].match(/^\s*[•*-]\s+(.+)$/);
        if(!m)break;
        items.push(m[1]);i++;
      }
      blocks.push(<ul key={'ul-'+i}>{items.map((x,j)=><li key={j}>{renderInline(x)}</li>)}</ul>);
      continue;
    }
    if(number){
      const items=[];
      while(i<lines.length){
        const m=lines[i].match(/^\s*\d+[.)]\s+(.+)$/);
        if(!m)break;
        items.push(m[1]);i++;
      }
      blocks.push(<ol key={'ol-'+i}>{items.map((x,j)=><li key={j}>{renderInline(x)}</li>)}</ol>);
      continue;
    }
    const paragraph=[];
    while(i<lines.length&&lines[i].trim()&&!/^\s*[•*-]\s+/.test(lines[i])&&!/^\s*\d+[.)]\s+/.test(lines[i])){
      paragraph.push(lines[i].trim());i++;
    }
    blocks.push(<p key={'p-'+i}>{paragraph.map((x,j)=><span key={j}>{j>0&&<br/>}{renderInline(x)}</span>)}</p>);
  }
  return <div className={'formattedText '+className}>{blocks.length?blocks:<p>—</p>}</div>;
}

function RichTextEditor({value,onChange,placeholder='',compact=false}){
  const ref=useRef(null);
  const apply=(type)=>{
    const el=ref.current;
    if(!el)return;
    const start=el.selectionStart??0,end=el.selectionEnd??start;
    const current=String(value||'');
    const selected=current.slice(start,end);
    let replacement='',caretStart=start,caretEnd=start;
    if(type==='paragraph'){
      replacement='\n\n';
      caretStart=caretEnd=start+2;
    }else if(type==='bold'){
      if(selected){
        replacement='**'+selected+'**';
        caretStart=start+2;caretEnd=start+2+selected.length;
      }else{
        replacement='****';
        caretStart=caretEnd=start+2;
      }
    }else if(type==='bullet'){
      if(selected){
        replacement=selected.split('\n').map(x=>x.trim()?('• '+x.replace(/^\s*[•*-]\s+/,'').replace(/^\s*\d+[.)]\s+/,'')):x).join('\n');
        caretStart=start;caretEnd=start+replacement.length;
      }else{
        replacement='• ';
        caretStart=caretEnd=start+2;
      }
    }else if(type==='number'){
      if(selected){
        replacement=selected.split('\n').map((x,i)=>x.trim()?((i+1)+'. '+x.replace(/^\s*[•*-]\s+/,'').replace(/^\s*\d+[.)]\s+/,'')):x).join('\n');
        caretStart=start;caretEnd=start+replacement.length;
      }else{
        replacement='1. ';
        caretStart=caretEnd=start+3;
      }
    }
    const next=current.slice(0,start)+replacement+current.slice(end);
    onChange(next);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(caretStart,caretEnd)});
  };
  return <div className={'richTextEditor '+(compact?'compact':'')}>
    <div className="richToolbar" aria-label="Formato de texto">
      <button type="button" title="Negrita" onClick={()=>apply('bold')}><b>B</b></button>
      <button type="button" title="Viñetas" onClick={()=>apply('bullet')}>• Lista</button>
      <button type="button" title="Lista numerada" onClick={()=>apply('number')}>1. Lista</button>
      <button type="button" title="Nuevo párrafo" onClick={()=>apply('paragraph')}>¶ Párrafo</button>
    </div>
    <textarea ref={ref} className="analysisText" value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
  </div>;
}

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
  const field=(key,label,placeholder)=><label className="psychField"><span>{label}</span><RichTextEditor value={value[key]||''} onChange={v=>setValue({...value,[key]:v})} placeholder={placeholder} compact/></label>;
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

function buildConductConclusion(d){
  const values=Object.entries(d?.self?.competencies||{}).filter(([,v])=>Number.isFinite(Number(v)));
  if(!values.length)return d?.self_analysis||'Sin síntesis disponible.';
  const sorted=[...values].sort((a,b)=>Number(b[1])-Number(a[1]));
  const top=sorted.slice(0,3).map(([k,v])=>k+' ('+Math.round(Number(v))+'%)');
  const low=[...values].sort((a,b)=>Number(a[1])-Number(b[1])).slice(0,3).map(([k,v])=>k+' ('+Math.round(Number(v))+'%)');
  const team=d?.team?.competencies||null;
  const gaps=team?values.map(([k,v])=>({k,self:Number(v),team:Number(team[k]||0),gap:Number(v)-Number(team[k]||0)}))
    .filter(x=>Number.isFinite(x.team)).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap)).slice(0,2):[];
  let text='El perfil conductual muestra fortalezas relativas en '+top.join(', ')+'. Los principales focos de desarrollo se concentran en '+low.join(', ')+'. En términos generales, el patrón observado sugiere mantener las conductas que sostienen el desempeño y trabajar de manera priorizada aquellas competencias que pueden mejorar la coordinación, la adaptación y la efectividad del liderazgo.';
  if(gaps.length){
    text+=' Al comparar la autoevaluación con la percepción del equipo, las diferencias más relevantes se observan en '+gaps.map(x=>x.k+' ('+Math.abs(Math.round(x.gap))+' puntos)').join(' y ')+'. Estas brechas deben revisarse mediante retroalimentación concreta y ejemplos observables del trabajo cotidiano.';
  }
  text+=' Desde una perspectiva de desarrollo, conviene priorizar pocas conductas de alto impacto y trabajarlas de forma progresiva, vinculándolas con situaciones reales del cargo. El objetivo no es modificar el estilo personal del supervisor, sino ampliar su repertorio conductual para responder con mayor flexibilidad a distintos escenarios, fortalecer la confianza del equipo y sostener un desempeño consistente en el tiempo. La revisión periódica de avances permitirá distinguir mejoras reales, ajustar las acciones y consolidar prácticas efectivas de liderazgo.';
  return text;
}

function buildCompetencyReading(d){
  const values=Object.entries(d?.self?.competencies||{}).filter(([,v])=>Number.isFinite(Number(v)));
  if(!values.length)return 'Los resultados permiten identificar fortalezas y focos prioritarios de desarrollo del liderazgo.';
  const high=[...values].sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,3);
  const low=[...values].sort((a,b)=>Number(a[1])-Number(b[1])).slice(0,3);
  return 'La lectura conjunta de las competencias muestra un mejor posicionamiento en '+high.map(([k,v])=>k+' ('+Math.round(Number(v))+'%)').join(', ')+'. Estas dimensiones constituyen recursos que pueden utilizarse para sostener el desempeño y apoyar procesos de mejora.\n\nLos focos que requieren mayor desarrollo son '+low.map(([k,v])=>k+' ('+Math.round(Number(v))+'%)').join(', ')+'. Se recomienda priorizar dos o tres conductas observables asociadas a estas competencias, definiendo acciones concretas y seguimiento periódico para verificar avances.';
}

function buildProfessionalAnalysis(d,psych){
  const parts=[];
  const note=String(psych?.note||'').trim();
  const context=String(psych?.context_position||'').trim();
  const interview=String(psych?.interview_observations||'').trim();
  const strengths=String(psych?.strengths_observed||'').trim();
  const development=String(psych?.development_observed||'').trim();
  const environment=String(psych?.environment_factors||'').trim();
  const recommendations=String(psych?.professional_recommendations||'').trim();

  if(note)parts.push(note);
  if(context||environment){
    parts.push('**Contexto laboral y exigencias del cargo.** '+[context,environment].filter(Boolean).join(' '));
  }
  if(strengths){
    parts.push('**Fortalezas observadas.** '+strengths+' Estas fortalezas constituyen recursos relevantes para sostener el desempeño, favorecer la coordinación del equipo y apoyar la aplicación de acciones de mejora en situaciones reales de trabajo.');
  }
  if(development){
    parts.push('**Aspectos a desarrollar.** '+development+' El foco de desarrollo debe traducirse en conductas observables y progresivas, evitando cambios generales difíciles de medir y priorizando aquellos comportamientos que generen mayor impacto en la gestión cotidiana.');
  }
  if(interview){
    parts.push('**Lectura de la entrevista.** '+interview+' La información recogida en entrevista permite complementar los resultados cuantitativos y comprender mejor cómo se manifiestan las conductas de liderazgo en el contexto real del puesto.');
  }
  if(d?.integrated_summary){
    parts.push('**Integración con los resultados de la evaluación.** '+d.integrated_summary+' Esta integración permite contrastar la autoevaluación, la percepción agregada del equipo y los antecedentes profesionales, entregando una lectura más completa del desempeño y de las brechas prioritarias.');
  }
  if(recommendations){
    parts.push('**Orientación profesional.** '+recommendations+' Se recomienda realizar seguimiento con evidencias concretas de cambio, revisión periódica de avances y retroalimentación de la jefatura y del equipo para consolidar las mejoras.');
  }else{
    parts.push('**Orientación profesional.** Se recomienda focalizar el desarrollo en un número acotado de conductas prioritarias, definir metas observables y revisar los avances en hitos 30/60/90 días, utilizando retroalimentación y evidencias concretas del desempeño.');
  }
  return parts.length?parts.join('\n\n'):'Sin antecedente profesional registrado.';
}

function buildProfessionalConclusion(base,d){
  const original=String(base||'').trim();
  const focus=(d?.gap_rows||[]).slice(0,3).map(x=>x.competency).filter(Boolean);
  const paragraphs=[
    original,
    'En términos de desarrollo, se recomienda mantener un seguimiento sistemático de las conductas priorizadas, utilizando evidencias observables del desempeño y retroalimentación periódica de la jefatura y del equipo.',
    focus.length
      ? 'Los principales focos que requieren seguimiento son '+focus.join(', ')+', procurando traducir cada uno en acciones concretas, metas verificables y situaciones reales de aplicación en el puesto de trabajo.'
      : 'Las oportunidades de mejora identificadas deben traducirse en acciones concretas, metas verificables y situaciones reales de aplicación en el puesto de trabajo.',
    'El propósito del proceso no es modificar el estilo personal del supervisor, sino ampliar su repertorio de liderazgo, fortalecer su capacidad de adaptación y consolidar prácticas que favorezcan la coordinación, la confianza y el desempeño sostenible del equipo.',
    'Se sugiere revisar los avances en hitos 30/60/90 días, ajustar las acciones cuando sea necesario y registrar ejemplos concretos que permitan evidenciar cambios progresivos y sostenibles.'
  ];
  return paragraphs.filter(Boolean).join('\n\n');
}

function ReportDocument({d,report,enough}){
  if(!report)return null;
  const issueDate=report.finalized_at||report.updated_at||new Date().toISOString();
  const dateText=new Date(issueDate).toLocaleDateString('es-CL');
  const psych=d.professional_note||{};
  const professionalAnalysis=buildProfessionalAnalysis(d,psych);
  const professionalConclusion=buildProfessionalConclusion(report.conclusion,d);
  const conductConclusion=buildConductConclusion(d);
  const competencyReading=buildCompetencyReading(d);
  const strengths=(report.strengths||[]).slice(0,3);
  const development=(report.development_areas||[]).slice(0,3);
  const gaps=(d.gap_rows||[]).slice(0,3);
  const actionPlan=(report.action_plan||[]).slice(0,3);
  const indicators=(report.indicators||[]).slice(0,4);
  const radarKeys=['Comunicación','Liderazgo','Toma de decisiones','Trabajo bajo presión','Adaptabilidad','Delegación'].filter(k=>COMP.includes(k));
  const compBrief={
    'Comunicación':'Se comunica de forma clara, con oportunidades de mejorar la escucha activa.',
    'Liderazgo':'Moviliza al equipo y orienta el logro de objetivos.',
    'Toma de decisiones':'Decisiones oportunas y efectivas en contextos operativos.',
    'Trabajo bajo presión':'Mantiene desempeño y foco ante exigencias.',
    'Adaptabilidad':'Se adapta a cambios, con margen de mejora.',
    'Delegación':'Puede fortalecer la delegación y confianza en el equipo.',
    'Orientación a resultados':'Foco constante en el cumplimiento de metas.',
    'Gestión de personas':'Buenas relaciones, con oportunidades en desarrollo del talento.'
  };
  const level=v=>Number(v)>=75?['Alto','high']:Number(v)>=55?['Medio','mid']:['A desarrollar','low'];
  const discColor={D:'#ff4747',I:'#ffc428',S:'#39c965',C:'#168fe8'};
  const Header=()=> <div className="pdfRefHeader">
    <div className="pdfRefBrand"><img src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/></div>
    <div className="pdfRefTitle"><h1>Informe Final de Evaluación de Liderazgo</h1><p>Retroalimentación y Propuesta de Mejora</p></div>
    <div className="pdfRefMeta">
      <span><b>Fecha:</b> {dateText}</span><span><b>Evaluado:</b> {d.supervisor.name}</span>
      <span><b>Cargo:</b> {d.supervisor.position||'—'}</span><span><b>Empresa:</b> {d.company.name}</span>
    </div>
  </div>;
  const Footer=({page})=><div className="pdfRefFooter"><div><b>INNOVA RC CAPACITA</b><span>Desarrollo de personas para organizaciones con más posibilidades</span></div><strong>Pág. {page} de 5</strong></div>;
  const Title=({n,children,icon='●'})=><div className="pdfRefSectionTitle"><span>{icon}</span><h2>{n}. {children}</h2></div>;

  return <article className="reportDocument finalFourPageReport refReport">
    <section className="pdfRefPage pageOne">
      <Header/>
      <div className="pdfRefHero">
        <div className="heroCorporatePanel">
          <img className="heroWhiteLogo" src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/>
          <span className="heroKicker">RC LEADERSHIP 360</span>
          <div className="heroTitleRow"><i/><h2>Desarrollando líderes para mejores equipos</h2></div>
          <p>Informe profesional de evaluación, retroalimentación y desarrollo del liderazgo</p>
        </div>
        <div className="heroMiningPanel">
          <img className="pdfHeroMiningImage" src="/leadership-team-hero.webp" alt="Operación minera y liderazgo"/>
          <div className="heroImageOverlay"/>
        </div>
      </div>
      <div className="pageOneGrid">
        <div className="pageOneLeft">
          <section className="pdfRefBlock"><Title n="1" icon="◎">Objetivo y alcance</Title><FormattedText text={report.objective_scope}/></section>
          <section className="pdfRefBlock"><Title n="3" icon="▣">Síntesis ejecutiva</Title><FormattedText text={report.executive_summary}/></section>
        </div>
        <div className="pageOneRight">
          <section className="pdfRefBlock antecedentCard"><Title n="2" icon="●">Antecedentes generales</Title>
            <table><tbody>
              <tr><th>Nombre:</th><td>{d.supervisor.name}</td></tr><tr><th>RUT:</th><td>{d.supervisor.rut}</td></tr>
              <tr><th>Cargo:</th><td>{d.supervisor.position||'—'}</td></tr><tr><th>Área:</th><td>{d.supervisor.area||'—'}</td></tr>
              <tr><th>Empresa:</th><td>{d.company.name}</td></tr><tr><th>Fecha evaluación:</th><td>{dateText}</td></tr>
              <tr><th>Instrumento:</th><td>Evaluación 360° Liderazgo</td></tr>
            </tbody></table>
          </section>
          <div className="refSummaryCard success"><h3><span>★</span> Principales fortalezas</h3><ul>{strengths.map((x,i)=><li key={i}><span>✓</span>{typeof x==='string'?x:x.text}</li>)}</ul></div>
          <div className="refSummaryCard warning"><h3><span>▲</span> Principales áreas de desarrollo</h3><ul>{development.map((x,i)=><li key={i}><span>✓</span>{typeof x==='string'?x:x.text}</li>)}</ul></div>
        </div>
      </div>
      <Footer page="1"/>
    </section>

    <section className="pdfRefPage pageTwo">
      <Header/>
      <section className="pdfRefBlock profileSummaryPage"><Title n="4" icon="▥">Resumen del perfil</Title><FormattedText text={d.self_analysis||d.integrated_summary||'Sin síntesis disponible.'}/></section>
      <div className="pageTwoGrid">
        <section className="pdfRefBlock discProfileBlock">
          <Title n="5" icon="▥">Perfil DISC</Title>
          <div className="discColumns">
            {['D','I','S','C'].map(k=>{const v=Number(d.self?.disc?.[k]||0);return <div className={'discCol disc-'+k} key={k}><strong>{v}%</strong><div className="discColTrack"><i style={{height:v+'%','--disc-color':discColor[k]}}/></div><b>{k}</b><span>{DISC_INFO[k].name}</span></div>})}
          </div>
          <div className="refReading"><h3>Interpretación del perfil DISC</h3><FormattedText text={d.self_analysis||'Sin análisis disponible.'}/></div>
        </section>
        <section className="pdfRefBlock perceptionBlock">
          <Title n="6" icon="▥">Comparación de percepciones (Radar)</Title>
          <div className="refRadarWrap"><RadarChart title="Comparación de percepciones" labels={radarKeys} self={d.self?.competencies} team={enough?d.team?.competencies:null}/></div>
        </section>
      </div>
      <Footer page="2"/>
    </section>

    <section className="pdfRefPage pageThree">
      <Header/>
      <div className="refReading conclusion conductConclusionPage"><h3>💡 &nbsp; Conclusión del perfil conductual</h3><FormattedText text={conductConclusion}/></div>
      <section className="pdfRefBlock competencySection">
        <Title n="7" icon="⚙">Resultados de competencias clave</Title>
        <div className="pageThreeGrid">
          <div className="refCompetencyTable">
            <div className="refCompHead"><span>Competencia</span><span>Resultado</span><span>Nivel</span><span>Interpretación breve</span></div>
            {COMP.map((k,i)=>{const v=Number(d.self?.competencies?.[k]||0);const [lab,cl]=level(v);return <div className="refCompRow" key={k}>
              <b>{k}</b><div className="refResult"><div><i style={{width:v+'%',background:['#1596dd','#13ae68','#ff7b1a','#945bea','#f0bd17','#ff4e55','#11a8a7','#198bd5'][i%8]}}/></div><strong>{v}%</strong></div>
              <span className={'refLevel '+cl}>{lab}</span><p>{compBrief[k]||'Competencia evaluada dentro del perfil de liderazgo.'}</p>
            </div>})}
          </div>
          <aside className="pageThreeSide">
            <div className="refReading"><h3>▤ &nbsp; Lectura de competencias</h3><FormattedText text={competencyReading}/></div>
            <div className="refGapBox"><h3>▲ &nbsp; Brechas prioritarias</h3><ol>{gaps.length?gaps.map((g,i)=><li key={i}>{g.competency}</li>):development.map((x,i)=><li key={i}>{typeof x==='string'?x:x.text}</li>)}</ol></div>
          </aside>
        </div>
      </section>
      <Footer page="3"/>
    </section>

    <section className="pdfRefPage pageFour">
      <Header/>
      <section className="pdfRefBlock psychMain psychFullPage"><Title n="8" icon="●">Análisis de la Psicóloga Laboral</Title><FormattedText text={professionalAnalysis}/></section>
      <div className="psychIdentity psychIdentityBottom"><div className="personIcon">♟</div><div><b>Psicóloga Laboral</b><span>{psych.author||'Profesional responsable'}</span><small>INNOVA RC CAPACITA SPA</small></div></div>
      <Footer page="4"/>
    </section>

    <section className="pdfRefPage pageFive">
      <Header/>
      <section className="pdfRefBlock proposalFive"><Title n="9" icon="◎">Propuesta de mejora</Title><ul className="refCheckList">{(report.recommendations||[]).slice(0,5).map((x,i)=><li key={i}>✓ {typeof x==='string'?x:x.text}</li>)}</ul></section>
      <div className="pageFiveTopGrid">
        <section className="pdfRefBlock planFive"><Title n="10" icon="▣">Plan de desarrollo 30/60/90 días</Title><table className="refPlanTable"><thead><tr><th>Plazo</th><th>Acciones clave</th></tr></thead><tbody>{actionPlan.map((p,i)=><tr key={i}><td>{p.deadline||['30 días','60 días','90 días'][i]}</td><td>{p.action||p.objective||'—'}</td></tr>)}</tbody></table></section>
        <section className="pdfRefBlock indicatorsFive"><Title n="11" icon="▥">Indicadores de seguimiento</Title><table className="refPlanTable"><thead><tr><th>Indicador</th><th>Meta</th></tr></thead><tbody>{indicators.map((x,i)=><tr key={i}><td>{x.indicator||'—'}</td><td>{x.target||'—'}</td></tr>)}</tbody></table></section>
      </div>
      <section className="pdfRefBlock conclusionFive"><Title n="12" icon="▣">Conclusión profesional</Title><FormattedText text={professionalConclusion}/></section>
      <div className="pdfRefSignatures"><div><span>Psicóloga Laboral</span><small>{psych.author||'Innova RC Capacita'}</small></div><div><span>Supervisor / Jefatura</span><small>Constancia de recepción</small></div></div>
      <Footer page="5"/>
    </section>

  </article>;
}

export default function AnalysisPage(){
  const [d,setD]=useState(null),[msg,setMsg]=useState(''),[psych,setPsych]=useState({});
  const [report,setReport]=useState(null);
  const id=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('id'):null;

  const load=()=>id&&api('/api/analysis?id='+id).then(x=>{
    setD(x);
    const serverPsych={
      note:x.professional_note?.note==='Análisis profesional estructurado'?'':x.professional_note?.note||'',
      context_position:x.professional_note?.context_position||'',
      interview_observations:x.professional_note?.interview_observations||'',
      strengths_observed:x.professional_note?.strengths_observed||'',
      development_observed:x.professional_note?.development_observed||'',
      environment_factors:x.professional_note?.environment_factors||'',
      professional_recommendations:x.professional_note?.professional_recommendations||''
    };
    let recoveredPsych=null;
    if(typeof window!=='undefined'&&!x.professional_note){
      try{recoveredPsych=JSON.parse(localStorage.getItem('rc360_psych_draft_'+id)||'null')}catch{}
    }
    setPsych(recoveredPsych||serverPsych);
    const r=x.final_report||x.report_suggestion;
    if(r){
      const serverReport={
        strengths:r.strengths||[],development_areas:r.development_areas||[],opportunities:r.opportunities||[],
        recommendations:r.recommendations||[],action_plan:r.action_plan||[],executive_summary:r.executive_summary||'',
        objective_scope:r.objective_scope||'',indicators:r.indicators||[],conclusion:r.conclusion||'',
        evidence_matrix:r.evidence_matrix||[],status:x.final_report?.status||'draft',finalized_at:x.final_report?.finalized_at||null
      };
      let recoveredReport=null;
      if(typeof window!=='undefined'&&!x.final_report){
        try{recoveredReport=JSON.parse(localStorage.getItem('rc360_report_draft_'+id)||'null')}catch{}
      }
      setReport(recoveredReport?{...serverReport,...recoveredReport,status:'draft'}:serverReport);
      if(recoveredPsych||recoveredReport)setMsg('Se recuperó un borrador guardado localmente en este equipo.');
    }
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
    const localKey='rc360_psych_draft_'+id;
    try{
      if(typeof window!=='undefined')localStorage.setItem(localKey,JSON.stringify(psych));
      await api('/api/analysis/notes',{method:'POST',body:JSON.stringify({assessmentId:id,...psych})});
      if(typeof window!=='undefined')localStorage.removeItem(localKey);
      setMsg('Análisis profesional guardado.');
      await load();
    }catch(e){
      if(typeof window!=='undefined')localStorage.setItem(localKey,JSON.stringify(psych));
      setMsg(e.message);
    }
  };
  const saveReport=async(status)=>{
    const localKey='rc360_report_draft_'+id;
    try{
      if(typeof window!=='undefined')localStorage.setItem(localKey,JSON.stringify(report));
      await api('/api/analysis/final-report',{method:'POST',body:JSON.stringify({...report,assessmentId:id,status})});
      if(typeof window!=='undefined')localStorage.removeItem(localKey);
      setMsg(status==='finalized'?'Informe finalizado correctamente.':finalized?'Informe reabierto como borrador.':'Borrador guardado correctamente.');
      await load();
    }catch(e){
      if(typeof window!=='undefined')localStorage.setItem(localKey,JSON.stringify(report));
      setMsg(e.message);
    }
  };

  return <main className="shell wide">
    <div className="appBrandBar screenOnly"><img className="appWhiteLogo" src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/></div>
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

      <section className="panel supervisorOpenAnswers">
        <div className="eyebrow">Respuestas cualitativas obligatorias</div>
        <h2>Experiencias relatadas por el supervisor</h2>
        {d.supervisor_open_answers?<div className="openAnswerReviewGrid">
          <div><b>Liderazgo</b><p>{d.supervisor_open_answers.leadership}</p></div>
          <div><b>Manejo de conflictos</b><p>{d.supervisor_open_answers.conflict_management}</p></div>
          <div><b>Desarrollo de personas</b><p>{d.supervisor_open_answers.people_development}</p></div>
        </div>:<div className="privacy">Esta evaluación no contiene respuestas abiertas registradas.</div>}
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
          <div><b>Contexto del puesto</b><FormattedText text={d.professional_note?.context_position||'Pendiente'}/></div>
          <div><b>Observaciones de entrevista</b><FormattedText text={d.professional_note?.interview_observations||'Pendiente'}/></div>
          <div><b>Fortalezas observadas</b><FormattedText text={d.professional_note?.strengths_observed||'Pendiente'}/></div>
          <div><b>Aspectos a desarrollar</b><FormattedText text={d.professional_note?.development_observed||'Pendiente'}/></div>
          <div><b>Factores del entorno</b><FormattedText text={d.professional_note?.environment_factors||'Pendiente'}/></div>
          <div><b>Recomendaciones</b><FormattedText text={d.professional_note?.professional_recommendations||'Pendiente'}/></div>
        </div>}
      </section>

      {d.integrated_summary&&<section className="panel integratedPanel"><div className="eyebrow">Síntesis integrada</div><h2>Síntesis general del trabajador</h2><FormattedText text={d.integrated_summary} className="summaryParagraph"/></section>}

      <section className="panel finalReport">
        <div className="sectionTitle"><div><div className="eyebrow">Informe profesional</div><h2>Informe Final · Propuesta de Mejoras</h2></div><span className={'pill '+(finalized?'good':'warn')}>{finalized?'Finalizado':'Borrador editable'}</span></div>
        <p className="muted">Administración y Psicología Laboral pueden revisar y corregir el borrador. Solo la Psicóloga puede finalizar el informe.</p>
        {report&&<>
          <h3>Objetivo y alcance</h3>
          {canEditDraft?<RichTextEditor compact value={report.objective_scope||''} onChange={v=>setReport({...report,objective_scope:v})}/>:<FormattedText text={report.objective_scope} className="summaryParagraph"/>}
          <h3>Resumen ejecutivo</h3>
          {canEditDraft?<RichTextEditor compact value={report.executive_summary||''} onChange={v=>setReport({...report,executive_summary:v})}/>:<FormattedText text={report.executive_summary} className="summaryParagraph"/>}

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
          {canEditDraft?<RichTextEditor value={report.conclusion||''} onChange={v=>setReport({...report,conclusion:v})}/>:<FormattedText text={report.conclusion} className="summaryParagraph"/>}

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
