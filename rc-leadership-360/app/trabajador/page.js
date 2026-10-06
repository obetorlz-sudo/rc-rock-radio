'use client';
import {useState} from 'react';
import {TEAM,LABELS} from '../../lib/instrument';

const api=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
};

function Questionnaire({ctx,onDone}){
  const [i,setI]=useState(0),[ans,setAns]=useState(Array(TEAM.length).fill(null)),[workerRut,setWorkerRut]=useState(''),[comment,setComment]=useState(''),[msg,setMsg]=useState('');
  const q=TEAM[i];
  const finish=async()=>{
    if(ans.some(x=>!x))return setMsg('Responde todas las preguntas.');
    if(!workerRut.trim())return setMsg('Ingresa tu RUT para evitar respuestas duplicadas.');
    try{
      await api('/api/public/submit',{method:'POST',body:JSON.stringify({
        mode:'team',assessmentId:ctx.assessment_id,rut:ctx.rut,workerRut,comment,
        answers:TEAM.map((item,j)=>({item_id:item.id,score:ans[j]}))
      })});
      onDone();
    }catch(e){setMsg(e.message)}
  };
  return <main className="shell publicSurvey">
    <a className="link" href="/trabajador">← Salir</a>
    <section className="panel questionPanel">
      <div className="eyebrow">Encuesta de Equipo</div>
      <h1>Experiencia de trabajo</h1>
      <div className="privacy">Tus respuestas individuales son confidenciales. Los resultados se muestran únicamente de forma agregada cuando existen al menos 3 respuestas.</div>
      <div className="progress"><div style={{width:`${Math.round(ans.filter(Boolean).length/TEAM.length*100)}%`}}/></div>
      <div className="qcount">Pregunta {i+1} de {TEAM.length}</div>
      <h2 className="question">{q.text}</h2>
      <div className="scale">{[1,2,3,4,5].map(v=><button key={v} className={ans[i]===v?'selected':''} onClick={()=>{const a=[...ans];a[i]=v;setAns(a)}}><b>{v}</b><span>{LABELS[v-1]}</span></button>)}</div>
      {i===TEAM.length-1&&<div className="formblock"><label>Tu RUT<input value={workerRut} onChange={e=>setWorkerRut(e.target.value)} placeholder="RUT del trabajador"/></label><label>Comentario opcional<textarea value={comment} onChange={e=>setComment(e.target.value)}/></label></div>}
      {msg&&<div className="notice">{msg}</div>}
      <div className="actions">
        <button className="ghost" disabled={i===0} onClick={()=>setI(i-1)}>Anterior</button>
        {i<TEAM.length-1?<button className="primary" disabled={!ans[i]} onClick={()=>setI(i+1)}>Siguiente</button>:<button className="primary" disabled={!ans[i]} onClick={finish}>Finalizar</button>}
      </div>
    </section>
  </main>;
}

export default function TrabajadorPage(){
  const [rut,setRut]=useState(''),[ctx,setCtx]=useState(null),[done,setDone]=useState(false),[msg,setMsg]=useState('');
  const start=async()=>{
    setMsg('');
    try{
      const d=await api('/api/public/start',{method:'POST',body:JSON.stringify({mode:'team',rut})});
      setCtx({...d,rut});
    }catch(e){setMsg(e.message)}
  };
  if(done)return <main className="shell"><section className="panel centered"><div className="success">✓</div><h1>Respuesta registrada</h1><p>Gracias por participar. Tu respuesta se incorpora de manera confidencial al análisis agregado del equipo.</p><a className="primary actionLink" href="/">Volver al inicio</a></section></main>;
  if(ctx)return <Questionnaire ctx={ctx} onDone={()=>setDone(true)}/>;
  return <main className="publicAccessPage workerAccess">
    <div className="publicAccessBackdrop" aria-hidden="true"/>
    <a className="publicBack" href="/">← Inicio</a>
    <section className="publicAccessCard">
      <div className="eyebrow">Acceso Trabajador</div>
      <h1>Encuesta de equipo</h1>
      <p>Ingresa el RUT o código de acceso del supervisor informado por tu empresa.</p>
      <input value={rut} onChange={e=>setRut(e.target.value)} placeholder="RUT o código de acceso" onKeyDown={e=>e.key==='Enter'&&start()}/>
      {msg&&<div className="notice">{msg}</div>}
      <button className="primary" onClick={start}>Comenzar encuesta</button>
    </section>
  </main>;
}
