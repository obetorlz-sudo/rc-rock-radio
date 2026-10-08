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
  const [i,setI]=useState(0),[ans,setAns]=useState(Array(questions.length).fill(null)),[comment,setComment]=useState(''),[msg,setMsg]=useState('');
  const q=questions[i];

  const choose=v=>{const a=[...ans];a[i]=v;setAns(a);setMsg('')};
  const finish=async()=>{
    if(ans.some(x=>!x))return setMsg('Responde todas las preguntas.');
    try{
      await api('/api/public/submit',{method:'POST',body:JSON.stringify({
        mode:'team',assessmentId:ctx.assessment_id,workerRut:ctx.workerRut,comment,
        answers:questions.map((item,j)=>({item_id:item.id,score:ans[j]}))
      })});
      onDone();
    }catch(e){setMsg(e.message)}
  };
  if(!q)return <main className="shell"><section className="panel centered"><h2>No hay preguntas disponibles.</h2></section></main>;
  return <main className="publicSurvey surveyResponsive">
    <div className="surveyTop"><a className="link" href="/trabajador">← Salir</a><span>Encuesta confidencial</span></div>
    <section className="questionPanel modernQuestion">
      <div className="questionHeader">
        <div><div className="eyebrow">Encuesta de Equipo</div><h1>Experiencia de trabajo</h1><p>{ctx.company_name}</p></div>
        <div className="questionCounter"><b>{i+1}</b><span>de {questions.length}</span></div>
      </div>
      <div className="privacy compactPrivacy">Tus respuestas son confidenciales y solo se muestran de manera agregada con una muestra mínima.</div>
      <div className="progress"><div style={{width:`${Math.round(ans.filter(Boolean).length/questions.length*100)}%`}}/></div>
      <div className="questionBody"><span className="questionLabel">Pregunta {i+1}</span><h2 className="question">{q.text}</h2></div>
      <div className="scale responsiveScale">{[1,2,3,4,5].map(v=><button key={v} className={ans[i]===v?'selected':''} onClick={()=>choose(v)}><b>{v}</b><span>{LABELS[v-1]}</span></button>)}</div>
      {i===questions.length-1&&<div className="formblock finishFields"><label>Comentario opcional<textarea value={comment} onChange={e=>setComment(e.target.value)}/></label></div>}
      {msg&&<div className="notice">{msg}</div>}
      <div className="actions surveyActions">
        <button className="ghost" disabled={i===0} onClick={()=>setI(i-1)}>Anterior</button>
        {i<questions.length-1?<button className="primary" disabled={!ans[i]} onClick={()=>setI(i+1)}>Siguiente</button>:<button className="primary" disabled={!ans[i]} onClick={finish}>Finalizar</button>}
      </div>
    </section>
  </main>;
}

export default function TrabajadorPage(){
  const [rut,setRut]=useState(''),[ctx,setCtx]=useState(null),[options,setOptions]=useState([]),[done,setDone]=useState(false),[msg,setMsg]=useState('');
  const discover=async()=>{
    setMsg('');
    try{
      const d=await api('/api/public/start',{method:'POST',body:JSON.stringify({mode:'team',workerRut:rut})});
      if(d.assessment_id){setCtx({...d,workerRut:rut});setOptions([]);return;}
      setOptions(d.assessments||[]);
    }catch(e){setMsg(e.message)}
  };
  const chooseAssessment=async(assessmentId)=>{
    setMsg('');
    try{
      const d=await api('/api/public/start',{method:'POST',body:JSON.stringify({mode:'team',workerRut:rut,assessmentId})});
      setCtx({...d,workerRut:rut});
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
      <p>Ingresa tu RUT. No necesitas estar registrado previamente para participar.</p>
      <input value={rut} onChange={e=>setRut(e.target.value)} placeholder="Tu RUT" onKeyDown={e=>e.key==='Enter'&&discover()}/>
      {msg&&<div className="notice">{msg}</div>}
      {!options.length?<button className="primary" onClick={discover}>Continuar</button>:<>
        <div className="workerSurveyPicker">
          <h3>Selecciona la evaluación que debes responder</h3>
          <p className="muted">Elige al supervisor o jefatura correspondiente.</p>
          {options.map(x=><button key={x.assessment_id} className="surveyPick" onClick={()=>chooseAssessment(x.assessment_id)}>
            <b>{x.supervisor_name}</b><span>{x.company_name} · {x.cycle_name}</span>
          </button>)}
        </div>
        <button className="ghost" onClick={()=>setOptions([])}>Cambiar RUT</button>
      </>}
    </section>
  </main>;
}
