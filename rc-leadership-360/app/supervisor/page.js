'use client';
import {useState} from 'react';
import {LABELS} from '../../lib/instrument';

const api=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
};

function Questionnaire({ctx,onDone}){
  const questions=ctx.questions||[];
  const openQuestions=[
    {key:'leadership',area:'Liderazgo',text:'Cuénteme cómo logró alinear y motivar a una cuadrilla con bajo rendimiento o agotada.'},
    {key:'conflict_management',area:'Manejo de conflictos',text:'Describa un conflicto entre miembros de su equipo durante el turno y qué acciones tomó para resolverlo.'},
    {key:'people_development',area:'Desarrollo de personas',text:'Describa una ocasión en que detectó un bajo desempeño en un trabajador. ¿Qué hizo para ayudarlo a mejorar?'}
  ];
  const [i,setI]=useState(0),[ans,setAns]=useState(Array(questions.length).fill(null)),[openStage,setOpenStage]=useState(false),[openAnswers,setOpenAnswers]=useState({leadership:'',conflict_management:'',people_development:''}),[msg,setMsg]=useState('');
  const q=questions[i];

  const choose=v=>{const a=[...ans];a[i]=v;setAns(a);setMsg('')};
  const finish=async()=>{
    if(ans.some(x=>!x))return setMsg('Responde las 48 preguntas de escala.');
    if(openQuestions.some(x=>!String(openAnswers[x.key]||'').trim()))return setMsg('Las 3 preguntas abiertas son obligatorias.');
    try{
      await api('/api/public/submit',{method:'POST',body:JSON.stringify({
        mode:'self',assessmentId:ctx.assessment_id,rut:ctx.rut,
        answers:questions.map((item,j)=>({item_id:item.id,score:ans[j]})),
        openResponses:openAnswers
      })});
      onDone();
    }catch(e){setMsg(e.message)}
  };

  if(openStage)return <main className="publicSurvey surveyResponsive">
    <div className="surveyTop"><a className="link" href="/supervisor">← Salir</a><span>{ctx.company_name}</span></div>
    <section className="questionPanel modernQuestion openQuestionPanel">
      <div className="questionHeader">
        <div><div className="eyebrow">Evaluación del Supervisor</div><h1>Preguntas abiertas obligatorias</h1><p>48 preguntas de escala completadas · ahora responde 3 preguntas abiertas</p></div>
        <div className="questionCounter"><b>3</b><span>abiertas</span></div>
      </div>
      <div className="progress"><div style={{width:'100%'}}/></div>
      <div className="openQuestionsGrid">
        {openQuestions.map((item,idx)=><label className="openQuestionCard" key={item.key}>
          <span className="openArea">{idx+1}. {item.area}</span>
          <strong>{item.text}</strong>
          <textarea value={openAnswers[item.key]} onChange={e=>{setOpenAnswers({...openAnswers,[item.key]:e.target.value});setMsg('')}} placeholder="Escriba una respuesta concreta, describiendo la situación y las acciones realizadas." rows={6}/>
        </label>)}
      </div>
      {msg&&<div className="notice">{msg}</div>}
      <div className="actions surveyActions">
        <button className="ghost" onClick={()=>{setOpenStage(false);setI(questions.length-1);setMsg('')}}>← Volver a la pregunta 48</button>
        <button className="primary" onClick={finish}>Finalizar evaluación</button>
      </div>
    </section>
  </main>;

  if(!q)return <main className="shell"><section className="panel centered"><h2>No hay preguntas disponibles.</h2></section></main>;
  return <main className="publicSurvey surveyResponsive">
    <div className="surveyTop"><a className="link" href="/supervisor">← Salir</a><span>{ctx.company_name}</span></div>
    <section className="questionPanel modernQuestion">
      <div className="questionHeader">
        <div><div className="eyebrow">Evaluación del Supervisor</div><h1>Evaluación personal</h1><p>{ctx.cycle_name} · 48 preguntas de escala + 3 abiertas obligatorias</p></div>
        <div className="questionCounter"><b>{i+1}</b><span>de {questions.length}</span></div>
      </div>
      <div className="progress"><div style={{width:`${Math.round(ans.filter(Boolean).length/questions.length*100)}%`}}/></div>
      <div className="questionBody">
        <span className="questionLabel">Pregunta {i+1}</span>
        <h2 className="question">{q.text}</h2>
      </div>
      <div className="scale responsiveScale">
        {[1,2,3,4,5].map(v=><button key={v} className={ans[i]===v?'selected':''} onClick={()=>choose(v)}>
          <b>{v}</b><span>{LABELS[v-1]}</span>
        </button>)}
      </div>
      {msg&&<div className="notice">{msg}</div>}
      <div className="actions surveyActions">
        <button className="ghost" disabled={i===0} onClick={()=>setI(i-1)}>Anterior</button>
        {i<questions.length-1
          ?<button className="primary" disabled={!ans[i]} onClick={()=>setI(i+1)}>Siguiente</button>
          :<button className="primary" disabled={!ans[i]} onClick={()=>{setOpenStage(true);setMsg('')}}>Continuar a preguntas abiertas</button>}
      </div>
    </section>
  </main>;
}

export default function SupervisorPage(){
  const [rut,setRut]=useState(''),[ctx,setCtx]=useState(null),[done,setDone]=useState(false),[msg,setMsg]=useState('');
  const start=async()=>{
    setMsg('');
    try{
      const d=await api('/api/public/start',{method:'POST',body:JSON.stringify({mode:'self',rut})});
      setCtx({...d,rut});
    }catch(e){setMsg(e.message)}
  };
  if(done)return <main className="shell"><section className="panel centered"><div className="success">✓</div><h1>Evaluación registrada</h1><p>Gracias por completar tu evaluación.</p><a className="primary actionLink" href="/">Volver al inicio</a></section></main>;
  if(ctx)return <Questionnaire ctx={ctx} onDone={()=>setDone(true)}/>;
  return <main className="publicAccessPage supervisorAccess">
    <div className="publicAccessBackdrop" aria-hidden="true"/>
    <a className="publicBack" href="/">← Inicio</a>
    <section className="publicAccessCard">
      <div className="eyebrow">Acceso Supervisor</div>
      <h1>Evaluación personal</h1>
      <p>Ingresa el RUT o código de acceso informado por tu empresa.</p>
      <input value={rut} onChange={e=>setRut(e.target.value)} placeholder="RUT o código de acceso" onKeyDown={e=>e.key==='Enter'&&start()}/>
      {msg&&<div className="notice">{msg}</div>}
      <button className="primary" onClick={start}>Comenzar evaluación</button>
    </section>
  </main>;
}
