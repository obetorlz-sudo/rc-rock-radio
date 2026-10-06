'use client';
import { useEffect,useMemo,useState } from 'react';

const jfetch=async(url,opts={})=>{
  const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Error de conexión');
  return d;
};

const statusPill=(ok,yes='Completado',no='Pendiente')=><span className={'pill '+(ok?'good':'warn')}>{ok?yes:no}</span>;

export default function AdminPage(){
  const [session,setSession]=useState(null);
  const [data,setData]=useState(null);
  const [msg,setMsg]=useState('');
  const [login,setLogin]=useState({rut:'',password:''});
  const [company,setCompany]=useState({name:'',rut:'',email:'',password:''});
  const [sup,setSup]=useState({companyId:'',fullName:'',rut:'',position:'',area:'',email:''});
  const [cycle,setCycle]=useState({supervisorId:'',cycleName:'Diagnóstico de liderazgo'});
  const [professional,setProfessional]=useState({fullName:'',username:'',password:''});

  const load=async()=>{
    try{
      const d=await jfetch('/api/dashboard');
      setData(d);
      if(!session&&d.session)setSession({role:d.session.role,full_name:d.session.name||'Usuario',company_id:d.session.companyId||null});
    }catch(e){setMsg(e.message)}
  };
  useEffect(()=>{load()},[]);
  const availableSup=useMemo(()=>data?.supervisors?.filter(x=>!sup.companyId||String(x.company_id)===String(sup.companyId))||[],[data,sup.companyId]);

  const doLogin=async e=>{
    e.preventDefault();setMsg('');
    try{const d=await jfetch('/api/auth/login',{method:'POST',body:JSON.stringify(login)});setSession(d)}
    catch(e){setMsg(e.message)}
  };
  const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});setSession(null);setData(null)};
  const send=async(url,body)=>{
    setMsg('');
    try{await jfetch(url,{method:'POST',body:JSON.stringify(body)});setMsg('Guardado correctamente.');await load()}
    catch(e){setMsg(e.message)}
  };

  if(!session&&data===null&&msg==='')return <main className="shell"><div className="panel">Cargando acceso profesional…</div></main>;
  if(!session)return <main className="shell">
    <a className="link" href="/">← Volver al inicio</a>
    <section className="panel login">
      <div className="eyebrow">Acceso profesional</div>
      <h1>RC Leadership 360</h1>
      <p className="muted">Acceso para Administración y Psicología Laboral.</p>
      <form onSubmit={doLogin}>
        <label>Usuario<input value={login.rut} onChange={e=>setLogin({...login,rut:e.target.value})} required/></label>
        <label>Contraseña<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label>
        {msg&&<div className="notice">{msg}</div>}
        <button className="primary">Ingresar</button>
      </form>
    </section>
  </main>;

  if(!data)return <main className="shell"><p>{msg||'Cargando panel…'}</p></main>;

  const supervisors=data.supervisors||[];
  const assessments=data.assessments||[];
  const finalized=supervisors.filter(x=>x.final_report_status==='finalized').length;

  return <main className="shell wide">
    <div className="topline">
      <div>
        <div className="eyebrow">{session.role==='psychologist'?'Panel Psicología Laboral':'Panel de Administración'}</div>
        <h1>Supervisores</h1>
        <p className="muted">{session.full_name} · {session.role==='psychologist'?'Psicóloga':'Administrador'}</p>
      </div>
      <button className="ghost" onClick={logout}>Cerrar sesión</button>
    </div>

    <div className="kpis">
      <div><b>{supervisors.length}</b><span>Supervisores registrados</span></div>
      <div><b>{supervisors.filter(x=>x.self_done).length}</b><span>DISC completados</span></div>
      <div><b>{supervisors.filter(x=>x.has_psychologist_note).length}</b><span>Entrevistas analizadas</span></div>
      <div><b>{finalized}</b><span>Informes finalizados</span></div>
    </div>

    {msg&&<div className="notice">{msg}</div>}
    {session.role==='psychologist'&&<div className="privacy">
      Tienes acceso profesional al listado completo de supervisores, resultados DISC, percepción agregada del equipo, brechas e informes. En cada supervisor puedes ingresar tu percepción profesional y preparar el informe final.
    </div>}

    <section className="panel">
      <div className="sectionTitle">
        <div><div className="eyebrow">Seguimiento</div><h2>Estado de supervisores</h2></div>
        <button className="ghost" onClick={load}>Actualizar</button>
      </div>
      <div className="tablewrap"><table>
        <thead><tr>
          <th>Empresa</th><th>Supervisor</th><th>RUT</th><th>DISC</th><th>Equipo</th><th>Entrevista Psicóloga</th><th>Informe final</th><th>Acción</th>
        </tr></thead>
        <tbody>
          {supervisors.length===0&&<tr><td colSpan="8" className="muted">No hay supervisores registrados.</td></tr>}
          {supervisors.map(x=><tr key={x.id}>
            <td>{x.company_name}</td>
            <td><b>{x.full_name}</b><br/><span className="muted">{x.position||''}{x.area?' · '+x.area:''}</span></td>
            <td>{x.rut}</td>
            <td>{statusPill(x.self_done)}</td>
            <td><b>{x.team_count||0}</b> respuesta(s){Number(x.team_count)>=3?<><br/><span className="goodText">Muestra habilitada</span></>:null}</td>
            <td>{statusPill(x.has_psychologist_note,'Ingresado','Pendiente')}</td>
            <td>{statusPill(x.final_report_status==='finalized','Finalizado','Pendiente')}</td>
            <td>{x.assessment_id
              ?<a className="link" href={'/analysis?id='+x.assessment_id}>{session.role==='psychologist'?'Ingresar percepción / Ver ficha completa':'Ver ficha completa'}</a>
              :<span className="muted">Sin ciclo abierto</span>}</td>
          </tr>)}
        </tbody>
      </table></div>
    </section>

    {session.role==='admin'&&<section className="panel">
      <div className="eyebrow">Configuración</div>
      <h2>Administrar empresas, usuarios y evaluaciones</h2>
      <div className="management">
        <article>
          <h3>1. Crear empresa</h3>
          <input placeholder="Nombre o razón social" value={company.name} onChange={e=>setCompany({...company,name:e.target.value})}/>
          <input placeholder="RUT empresa" value={company.rut} onChange={e=>setCompany({...company,rut:e.target.value})}/>
          <input placeholder="Correo" value={company.email} onChange={e=>setCompany({...company,email:e.target.value})}/>
          <input type="password" placeholder="Contraseña inicial" value={company.password} onChange={e=>setCompany({...company,password:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/company',company)}>Crear empresa</button>
        </article>

        <article>
          <h3>2. Crear usuario Psicóloga</h3>
          <input placeholder="Nombre completo" value={professional.fullName} onChange={e=>setProfessional({...professional,fullName:e.target.value})}/>
          <input placeholder="Usuario (ej. PSICOLOGA)" value={professional.username} onChange={e=>setProfessional({...professional,username:e.target.value})}/>
          <input type="password" placeholder="Contraseña inicial" value={professional.password} onChange={e=>setProfessional({...professional,password:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/professional',professional)}>Crear / actualizar Psicóloga</button>
        </article>

        <article>
          <h3>3. Crear supervisor</h3>
          <select value={sup.companyId} onChange={e=>setSup({...sup,companyId:e.target.value})}>
            <option value="">Selecciona empresa</option>
            {(data.companies||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Nombre completo" value={sup.fullName} onChange={e=>setSup({...sup,fullName:e.target.value})}/>
          <input placeholder="RUT supervisor" value={sup.rut} onChange={e=>setSup({...sup,rut:e.target.value})}/>
          <input placeholder="Cargo" value={sup.position} onChange={e=>setSup({...sup,position:e.target.value})}/>
          <input placeholder="Área" value={sup.area} onChange={e=>setSup({...sup,area:e.target.value})}/>
          <input placeholder="Correo opcional" value={sup.email} onChange={e=>setSup({...sup,email:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/supervisor',sup)}>Crear supervisor</button>
        </article>

        <article>
          <h3>4. Abrir ciclo de evaluación</h3>
          <select value={cycle.supervisorId} onChange={e=>setCycle({...cycle,supervisorId:e.target.value})}>
            <option value="">Selecciona supervisor</option>
            {availableSup.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.company_name}</option>)}
          </select>
          <input value={cycle.cycleName} onChange={e=>setCycle({...cycle,cycleName:e.target.value})}/>
          <button className="primary" onClick={()=>send('/api/manage/assessment',cycle)}>Abrir evaluación</button>
        </article>
      </div>
    </section>}

    {['admin','psychologist'].includes(session.role)&&<section className="panel">
      <h2>Historial de evaluaciones</h2>
      <p className="muted">Consulta todos los ciclos y accede a la ficha completa de cada supervisor.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>Empresa</th><th>Supervisor</th><th>Ciclo</th><th>DISC</th><th>Equipo</th><th>Entrevista</th><th>Informe</th><th>Acción</th></tr></thead>
        <tbody>{assessments.map(x=><tr key={x.id}>
          <td>{x.company_name}</td><td>{x.full_name}</td><td>{x.cycle_name}</td>
          <td>{x.self_done?'Completado':'Pendiente'}</td><td>{x.team_count}</td>
          <td>{x.has_psychologist_note?'Ingresada':'Pendiente'}</td>
          <td>{x.final_report_status==='finalized'?'Finalizado':'Pendiente'}</td>
          <td><a className="link" href={'/analysis?id='+x.id}>{session.role==='psychologist'?'Ingresar percepción':'Ver análisis'}</a></td>
        </tr>)}</tbody>
      </table></div>
    </section>}
  </main>;
}
