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
  const [i,setI]=useState(0),[ans,setAns]=useState(Array(questions.length).fill(null)),[msg,setMsg]=useState('');
  const q=questions[i];

  const choose=v=>{
    const a=[...ans];a[i]=v;setAns(a);setMsg('');
  };
  const finish=async()=>{
    if(ans.some(x=>!x))return setMsg('Responde todas las preguntas.');
    try{
      await api('/api/public/submit',{method:'POST',body:JSON.stringify({
        mode:'self',assessmentId:ctx.assessment_id,rut:ctx.rut,
        answers:questions.map((item,j)=>({item_id:item.id,score:ans[j]}))
      })});
      onDone();
    }catch(e){setMsg(e.message)}
  };
  if(!q)return <main className="shell"><section className="panel centered"><h2>No hay preguntas disponibles.</h2></section></main>;
  return <main className="publicSurvey surveyResponsive">
    <div className="surveyTop"><a className="link" href="/supervisor">← Salir</a><span>{ctx.company_name}</span></div>
    <section className="questionPanel modernQuestion">
      <div className="questionHeader">
        <div><div className="eyebrow">Evaluación del Supervisor</div><h1>Evaluación personal</h1><p>{ctx.cycle_name}</p></div>
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
        {i<questions.length-1?<button className="primary" disabled={!ans[i]} onClick={()=>setI(i+1)}>Siguiente</button>:<button className="primary" disabled={!ans[i]} onClick={finish}>Finalizar</button>}
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
