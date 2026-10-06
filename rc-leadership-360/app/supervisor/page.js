'use client';
import {useState} from 'react';
import {SELF,LABELS} from '../../lib/instrument';

const api=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
};

function Questionnaire({ctx,onDone}){
  const [i,setI]=useState(0),[ans,setAns]=useState(Array(SELF.length).fill(null)),[msg,setMsg]=useState('');
  const q=SELF[i];
  const finish=async()=>{
    if(ans.some(x=>!x))return setMsg('Responde todas las preguntas.');
    try{
      await api('/api/public/submit',{method:'POST',body:JSON.stringify({
        mode:'self',assessmentId:ctx.assessment_id,rut:ctx.rut,
        answers:SELF.map((item,j)=>({item_id:item.id,score:ans[j]}))
      })});
      onDone();
    }catch(e){setMsg(e.message)}
  };
  return <main className="shell publicSurvey">
    <a className="link" href="/supervisor">← Salir</a>
    <section className="panel questionPanel">
      <div className="eyebrow">Evaluación del Supervisor</div>
      <h1>Evaluación personal</h1>
      <p className="muted">{ctx.company_name} · {ctx.cycle_name}</p>
      <div className="progress"><div style={{width:`${Math.round(ans.filter(Boolean).length/SELF.length*100)}%`}}/></div>
      <div className="qcount">Pregunta {i+1} de {SELF.length}</div>
      <h2 className="question">{q.text}</h2>
      <div className="scale">{[1,2,3,4,5].map(v=><button key={v} className={ans[i]===v?'selected':''} onClick={()=>{const a=[...ans];a[i]=v;setAns(a)}}><b>{v}</b><span>{LABELS[v-1]}</span></button>)}</div>
      {msg&&<div className="notice">{msg}</div>}
      <div className="actions">
        <button className="ghost" disabled={i===0} onClick={()=>setI(i-1)}>Anterior</button>
        {i<SELF.length-1?<button className="primary" disabled={!ans[i]} onClick={()=>setI(i+1)}>Siguiente</button>:<button className="primary" disabled={!ans[i]} onClick={finish}>Finalizar</button>}
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
