'use client';
import { useEffect, useState } from 'react';
import { SELF, TEAM, DISC, LABELS, COMP } from '../lib/instrument';
import { gapLabel, level } from '../lib/scoring';

const demoSelf={assessment_id:'demo-self',company_name:'Empresa Demo',supervisor_name:'Supervisor Demo',cycle_name:'Diagnóstico Demo',rut:'12.345.678-5'};
const jfetch=async(url,opts={})=>{const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.message||'Error');return d;};

function Home(){
  const [view,setView]=useState('landing'),[info,setInfo]=useState(null),[session,setSession]=useState(null);
  const start=async(mode,rut)=>{if(rut.trim().toLowerCase()==='demo'){setInfo({mode,...demoSelf});setView('preview');return}const d=await jfetch('/api/public/start',{method:'POST',body:JSON.stringify(;mode,rut})});setInfo({mode,...d});setView('preview')};
  const login=async(rut,password)=>{const d=await jfetch('/api/auth/login',{method:'POST',body:JSON.stringify({rut,password})});setSession(d);setView('dashboard')};
  const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});setSession(null);setView('landing')};
  if(view==='preview') return <Preview info={info} onBack={()=>setView('landing')} onStart={()=>setView('assessment')}/>;
  if(view==='assessment') return <Assessment info={info} onDone={()=>setView('done')}/>;
  if(view==='done') return <Done onHome={()=>{setInfo(null);setView('landing')}}/>;
  if(view==='login') return <Login onLogin={login} onBack={()=>setView('landing')}/>;
  if(view==='dashboard') return <Dashboard session={session} onLogout={logout}/>;
  return <Landing onStart={start} onLogin={()=>setView('login')}/>;
}

/* the rest of the original page is included below */

function Landing({onStart,onLogin}){ const [rut,setRut]=useState(''),[rut2,setRut2]=useState('');return <main className="landing"><nav><div className="brand">RC <span>Leadership 360</span></div><buttn className="ghost" onClick={onLogin}>Acceso empresa / psicóloga</button></nav><section className="hero"><div><div className="eyebrow">Evaluación y desarrollo de liderazgo</div><h1>Conoce tu estilo. <em>Comprende tu impacto.</em> Mejora tu liderazgo.</h1><p>Plataforma formativa para supervisores que combina autoevaluación con percepción del equipo, competencias de liderazgo y acompañamiento profesional.</p></div><div className="heroCard"><div className="miniGrid"><div><b>48</b><span>Autoevaluación</span></div><div><b>24</b><span>Encuesta 360°</span></div><div><b>10</b><span>Competencias</span></div><div><b>3</b><span>Rínimo para análisis</span></div></div></div></section><section className="choices"><div className="choice"><div className="icon">SUP</div><h2>Soy supervisor</h2><p>Responde tu autoevaluación confidencial de 48 ítems.</p><input value={rut} onChange={e=>setRut(e.target.value)} placeholder="Ingresa tu RUT"/><button className="primary" onClick={()=>onStart('self',rut)}>Iniciar autoevaluación</button></div><div className="choice"><div className="icon">360</div><h2>Evalúo a mi supervisor</h2><p>Encuesta de conductas de liderazgo observables. Las respuestas se presentan en forma agregada.</p><input value={rut2} onChange={e=>setRut2(e.target.value)} placeholder="RUT del supervisor"/><button className="secondary" onClick={()=>onStart('team',rut2)}>Responder encuesta</button></div></section><div className="floatingNotice"><b>Confidencialidad:</b> los resultados del equipo se muestran solo cuando hay al menos 3 respuestas. El instrumento es formativo y no constituye diagnóstico psicológico clínico.</div><footer>RC Leadership 360 · Desarrollo organizacional</footer></main>;}

export default Home;
