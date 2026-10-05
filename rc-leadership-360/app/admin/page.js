'use client';
import { useEffect, useMemo, useState } from 'react';

const jfetch=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Error de conexión');
  return d;
};

export default function AdminPage(){
  const [session,setSession]=useState(null);
  const [data,setData]=useState(null);
  const [msg,setMsg]=useState('');
  const [login,setLogin]=useState({rut:'',password:''});
  const [company,setCompany]=useState({name:'',rut:'',email:'',password:''});
  const [sup,setSup]=useState({companyId:'',fullName:'',rut:'',position:'',area:'',email:''});
  const [cycle,setCycle]=useState({supervisorId:'',cycleName:'Diagnóstico de liderazgo'});
  const load=async()=>{try{setData(await jfetch('/api/dashboard'))}catch(e){setMsg(e.message)}};
  useEffect(()=>{if(session) load()},[session]);
  const supervisors=useMemo(()=>data?.supervisors?.filter(x=>!sup.companyId||String(x.company_id)===String(sup.companyId))||[],[data,sup.companyId]);
  const doLogin=async e=>{e.preventDefault();setMsg('');try{const d=await jfetch('/api/auth/login',{method:'POST',body:JSON.stringify(login)});setSession(d)}catch(e){setMsg(e.message)}};
  const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});setSession(null);setData(null)};
  const send=async(url,body)=>{setMsg('');try{await jfetch(url,{method:'POST',body:JSON.stringify(body)});setMsg('Guardado correctamente.');await load()}catch(e){setMsg(e.message)}};

  if(!session) return <main className="shell">
    <a className="link" href="/">← Volver al inicio</a>
    <section className="panel login">
      <div className="eyebrow">Administración</div>
      <h1>RC Leadership 360</h1>
      <p className="muted">Ingresa con las credenciales de administración o empresa.</p>
      <form onSubmit={doLogin}>
        <label>Usuario / RUT<input value={login.rut} onChange={e=>setLogin({...login,rut:e.target.value})} required/></label>
        <label>Contraseña<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label>
        {msg&&<div className="notice">{msg}</div>}
        <button className="primary">Ingresar</button>
      </form>
    </section>
  </main>;

  if(!data) return <main className="shell"><p>{msg||'Cargando administración…'}</p></main>;

  const a=data.assessments||[];
  return <main className="shell wide">
    <div className="topline">
      <div><div className="eyebrow">Panel de administración</div><h1>RC Leadership 360</h1><p className="muted">{session.full_name||session.name||'Administrador'} · {session.role}</p></div>
      <button className="ghost" onClick={logout}>Cerrar sesión</button>
    </div>

    <div className="kpis">
      <div><b>{a.length}</b><span>Evaluaciones</span></div>
      <div><b>{a.filter(x=>x.self_done).length}</b><span>Autoevaluaciones</span></div>
      <div><b>{a.reduce((n,x)=>n+Number(x.team_count||0),0)}</b><span>Respuestas 360°</span></div>
      <div><b>{a.filter(x=>Number(x.team_count)>=3).length}</b><span>Análisis habilitados</span></div>
    </div>

    {msg&&<div className="notice">{msg}</div>}

    <section className="panel">
      <div className="eyebrow">Configuración</div>
      <h2>Crear y habilitar evaluaciones</h2>
      <div className="management">
        {session.role==='admin'&&<article>
          <h3>1. Crear empresa</h3>
          <input placeholder="Nombre o razón social" value={company.name} onChange={e=>setCompany({...company,name:e.target.value})}/>
          <input placeholder="RUT empresa" value={company.rut} onChange={e=>setCompany({...company,rut:e.target.value})}/>
          <input placeholder="Correo" value={company.email} onChange={e=>setCompany({...company,email:e.target.value})}/>
          <input type="password" placeholder="Contraseña inicial" value={company.password} onChange={e=>setCompany({...company,password:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/company',company)}>Crear empresa</button>
        </article>}

        <article>
          <h3>{session.role==='admin'?'2':'1'}. Crear supervisor</h3>
          {session.role!=='company'&&<select value={sup.companyId} onChange={e=>setSup({...sup,companyId:e.target.value})}>
            <option value="">Selecciona empresa</option>
            {(data.companies||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>}
          <input placeholder="Nombre completo" value={sup.fullName} onChange={e=>setSup({...sup,fullName:e.target.value})}/>
          <input placeholder="RUT supervisor" value={sup.rut} onChange={e=>setSup({...sup,rut:e.target.value})}/>
          <input placeholder="Cargo" value={sup.position} onChange={e=>setSup({...sup,position:e.target.value})}/>
          <input placeholder="Área" value={sup.area} onChange={e=>setSup({...sup,area:e.target.value})}/>
          <input placeholder="Correo opcional" value={sup.email} onChange={e=>setSup({...sup,email:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/supervisor',sup)}>Crear supervisor</button>
        </article>

        <article>
          <h3>{session.role==='admin'?'3':'2'}. Abrir ciclo 360°</h3>
          <select value={cycle.supervisorId} onChange={e=>setCycle({...cycle,supervisorId:e.target.value})}>
            <option value="">Selecciona supervisor</option>
            {supervisors.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
          </select>
          <input value={cycle.cycleName} onChange={e=>setCycle({...cycle,cycleName:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/assessment',cycle)}>Abrir evaluación</button>
          <p className="muted small">Una vez abierto el ciclo, supervisor y trabajadores ingresan desde la portada con el RUT del supervisor.</p>
        </article>
      </div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><h2>Evaluaciones activas</h2><button className="ghost" onClick={load}>Actualizar</button></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Empresa</th><th>Supervisor</th><th>Ciclo</th><th>Auto</th><th>Equipo</th><th>Análisis</th></tr></thead>
        <tbody>{a.map(x=><tr key={x.id}>
          <td>{x.company_name}</td>
          <td><b>{x.full_name}</b><br/><span className="muted">{x.position||''} {x.area?'· '+x.area:''}</span></td>
          <td>{x.cycle_name}</td>
          <td>{x.self_done?'Completada':'Pendiente'}</td>
          <td>{x.team_count} respuestas</td>
          <td><a className="link" href={'/?analysis='+x.id}>Ver</a></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}
