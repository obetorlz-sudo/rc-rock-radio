'use client';
import { useEffect,useMemo,useState } from 'react';
import { OPEN_SELF } from '../../lib/instrument';

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
  const [company,setCompany]=useState({name:'',rut:'',email:'',password:'Recamespa.2026'});
  const [sup,setSup]=useState({companyId:'',fullName:'',rut:'',position:'',area:'',email:''});
  const [cycle,setCycle]=useState({supervisorId:'',cycleName:'Diagnóstico de liderazgo'});
  const [professional,setProfessional]=useState({fullName:'',username:'',password:''});
  const [questionMode,setQuestionMode]=useState('self');
  const [activeTab,setActiveTab]=useState('seguimiento');
  const [newQuestion,setNewQuestion]=useState({text:'',disc:'D',competency:'Comunicación'});
  const [companyLogo,setCompanyLogo]=useState('');

  const applyDashboard=d=>{
    setData(d);
    if(d?.session)setSession({role:d.session.role,full_name:d.session.name||'Usuario',company_id:d.session.companyId||null});
  };
  const load=async({silent=false}={})=>{
    try{
      const d=await jfetch('/api/dashboard');
      applyDashboard(d);
      if(!silent)setMsg('');
      return d;
    }catch(e){
      if(!silent)setMsg(e.message);
      return null;
    }
  };
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const r=await fetch('/api/dashboard',{cache:'no-store'});
        if(!active||!r.ok)return;
        const d=await r.json();
        if(active)applyDashboard(d);
      }catch{}
    })();
    return()=>{active=false};
  },[]);
  const availableSup=useMemo(()=>data?.supervisors?.filter(x=>!sup.companyId||String(x.company_id)===String(sup.companyId))||[],[data,sup.companyId]);

  const doLogin=async e=>{
    e.preventDefault();
    setMsg('');
    try{
      const s=await jfetch('/api/auth/login',{method:'POST',body:JSON.stringify(login)});
      setSession(s);
      const d=await jfetch('/api/dashboard');
      applyDashboard(d);
    }catch(e){
      setSession(null);
      setData(null);
      setMsg(e.message);
    }
  };
  const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});setSession(null);setData(null);setMsg('')};
  const send=async(url,body)=>{
    setMsg('');
    try{await jfetch(url,{method:'POST',body:JSON.stringify(body)});setMsg('Guardado correctamente.');await load()}
    catch(e){setMsg(e.message)}
  };

  const manage=async(url,body,success='Cambio guardado.')=>{
    setMsg('');
    try{
      await jfetch(url,{method:'POST',body:JSON.stringify(body)});
      setMsg(success);
      await load();
    }catch(e){setMsg(e.message)}
  };

  const editCompany=x=>{
    const name=window.prompt('Nombre o razón social',x.name); if(name===null)return;
    const rut=window.prompt('RUT empresa',x.rut); if(rut===null)return;
    const email=window.prompt('Correo',x.email||''); if(email===null)return;
    manage('/api/manage/company',{action:'update',id:x.id,name,rut,email},'Empresa actualizada.');
  };
  const resetCompanyPassword=x=>{
    if(!window.confirm('¿Restablecer la clave de '+x.name+' a Recamespa.2026?'))return;
    manage('/api/manage/company',{action:'reset_password',id:x.id,password:'Recamespa.2026'},'Contraseña de empresa restablecida a Recamespa.2026.');
  };

  const readLogo=file=>new Promise((resolve,reject)=>{
    if(!file)return resolve('');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return reject(new Error('Formato no permitido. Usa PNG, JPG o WEBP.'));
    if(file.size>600*1024)return reject(new Error('El logo debe pesar máximo 600 KB.'));
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('No fue posible leer la imagen.'));
    reader.readAsDataURL(file);
  });

  const changeCompanyLogo=async(x,file)=>{
    try{
      const logoData=await readLogo(file);
      await manage('/api/manage/company-logo',{id:x.id,logoData},'Logo de empresa actualizado.');
    }catch(e){setMsg(e.message)}
  };

  const removeCompanyLogo=x=>{
    if(!window.confirm('¿Quitar el logo de '+x.name+'?'))return;
    manage('/api/manage/company-logo',{id:x.id,logoData:''},'Logo eliminado.');
  };

  const createCompany=async()=>{
    setMsg('');
    try{
      const created=await jfetch('/api/manage/company',{method:'POST',body:JSON.stringify(company)});
      if(companyLogo&&created?.id){
        await jfetch('/api/manage/company-logo',{method:'POST',body:JSON.stringify({id:created.id,logoData:companyLogo})});
      }
      setCompany({name:'',rut:'',email:'',password:'Recamespa.2026'});
      setCompanyLogo('');
      setMsg('Empresa creada correctamente.');
      await load();
    }catch(e){setMsg(e.message)}
  };
  const editSupervisor=x=>{
    const fullName=window.prompt('Nombre completo',x.full_name); if(fullName===null)return;
    const rut=window.prompt('RUT supervisor',x.rut); if(rut===null)return;
    const position=window.prompt('Cargo',x.position||''); if(position===null)return;
    const area=window.prompt('Área',x.area||''); if(area===null)return;
    const email=window.prompt('Correo',x.email||''); if(email===null)return;
    const companyId=window.prompt('ID empresa (déjalo igual si no cambia)',x.company_id); if(companyId===null)return;
    manage('/api/manage/supervisor',{action:'update',id:x.id,companyId,fullName,rut,position,area,email},'Supervisor actualizado.');
  };
  const editProfessional=x=>{
    const fullName=window.prompt('Nombre completo',x.full_name); if(fullName===null)return;
    const username=window.prompt('Usuario o RUT',x.rut); if(username===null)return;
    manage('/api/manage/professional',{action:'update',id:x.id,fullName,username},'Profesional actualizado.');
  };
  const resetProfessionalPassword=x=>{
    const password=window.prompt('Nueva contraseña para '+x.full_name);
    if(!password)return;
    manage('/api/manage/professional',{action:'reset_password',id:x.id,password},'Contraseña de profesional restablecida.');
  };

  const saveNewQuestion=async()=>{
    if(!newQuestion.text.trim())return setMsg('Escribe la nueva pregunta.');
    await manage('/api/manage/questions',{action:'create',mode:questionMode,...newQuestion},'Pregunta agregada.');
    setNewQuestion({text:'',disc:'D',competency:'Comunicación'});
  };
  const editQuestion=q=>{
    const text=window.prompt('Editar pregunta',q.text); if(text===null)return;
    const disc=window.prompt('Dimensión D, I, S o C',q.disc); if(disc===null)return;
    const competency=window.prompt('Competencia',q.competency); if(competency===null)return;
    manage('/api/manage/questions',{action:'update',id:q.id,text,disc,competency},'Pregunta actualizada.');
  };
  const deleteQuestion=q=>{
    if(!window.confirm('¿Eliminar esta pregunta del banco? Los resultados históricos no se borrarán.'))return;
    manage('/api/manage/questions',{action:'delete',id:q.id},'Pregunta eliminada.');
  };

  const deleteProfessional=x=>{
    if(!window.confirm('¿Eliminar definitivamente a '+x.full_name+'? Esta acción no se puede deshacer.'))return;
    manage('/api/manage/professional',{action:'delete',id:x.id},'Profesional eliminado.');
  };
  const deleteSupervisor=x=>{
    if(!window.confirm('¿Eliminar definitivamente a '+x.full_name+'? También se eliminarán sus evaluaciones y resultados asociados.'))return;
    manage('/api/manage/supervisor',{action:'delete',id:x.id},'Supervisor eliminado.');
  };
  const deleteCompany=x=>{
    if(!window.confirm('¿Eliminar definitivamente la empresa '+x.name+'? Se eliminarán también sus supervisores, evaluaciones, respuestas e informes asociados.'))return;
    const check=window.prompt('Escribe ELIMINAR para confirmar');
    if(check!=='ELIMINAR')return;
    manage('/api/manage/company',{action:'delete',id:x.id},'Empresa eliminada.');
  };

  if(!session)return <main className="shell">
    <div className="appBrandBar"><img className="appWhiteLogo" src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/></div>
    <a className="link" href="/">← Volver al inicio</a>
    <section className="panel login">
      <div className="eyebrow">Acceso a plataforma</div>
      <h1>RC Leadership 360</h1>
      <p className="muted">Acceso para Administración, Psicología Laboral y Empresas.</p>
      <form onSubmit={doLogin}>
        <label>Usuario<input value={login.rut} onChange={e=>setLogin({...login,rut:e.target.value})} required/></label>
        <label>Contraseña<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label>
        {msg&&<div className="notice">{msg}</div>}
        <button className="primary">Ingresar</button>
      </form>
    </section>
  </main>;

  if(!data)return <main className="shell"><section className="panel centered"><h2>Preparando panel…</h2><p className="muted">Estamos cargando la información.</p>{msg&&<div className="notice">{msg}</div>}<button className="primary" onClick={()=>load()}>Reintentar</button></section></main>;

  if(session.role==='company'){
    const supervisors=data.supervisors||[];
    const companyName=supervisors[0]?.company_name||session.full_name||'Empresa';
    const statusOf=x=>{
      if(!x.assessment_id)return ['No iniciado','muted'];
      if(x.final_report_status==='finalized')return ['Finalizado','good'];
      if(x.has_psychologist_note||x.self_done||Number(x.team_count)>=3)return ['Análisis en curso','info'];
      return ['Pendiente','warn'];
    };
    const completed=supervisors.filter(x=>x.final_report_status==='finalized').length;
    const inProgress=supervisors.filter(x=>x.assessment_id&&x.final_report_status!=='finalized'&&(x.has_psychologist_note||x.self_done||Number(x.team_count)>=3)).length;
    return <main className="shell wide companyPortal">
      <div className="appBrandBar"><img className="appWhiteLogo" src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/></div>
      <div className="topline">
        <div><div className="eyebrow">Portal Empresa</div><h1>{companyName}</h1><p className="muted">Consulta de resultados e informes de liderazgo</p></div>
        <button className="ghost" onClick={logout}>Cerrar sesión</button>
      </div>
      <div className="kpis">
        <div><b>{supervisors.length}</b><span>Supervisores</span></div>
        <div><b>{inProgress}</b><span>Análisis en curso</span></div>
        <div><b>{completed}</b><span>Informes finalizados</span></div>
        <div><b>{supervisors.reduce((n,x)=>n+Number(x.team_count||0),0)}</b><span>Respuestas de trabajadores</span></div>
      </div>
      <section className="panel">
        <div className="sectionTitle"><div><div className="eyebrow">Resumen</div><h2>Estado de supervisores</h2></div><button className="ghost" onClick={load}>Actualizar</button></div>
        <p className="muted">Se muestra una tarjeta por supervisor, usando su evaluación más reciente. El acceso es solo de consulta.</p>
        <div className="companyAssessmentGrid">
          {supervisors.map(x=>{const [label,cl]=statusOf(x);return <article key={x.id} className="companyAssessmentCard">
            <div className="companyAssessmentHead"><div><h3>{x.full_name}</h3><p>{x.position||'Supervisor'}{x.area?' · '+x.area:''}</p>{x.cycle_name&&<small>{x.cycle_name}</small>}</div><span className={'pill '+cl}>{label}</span></div>
            <div className="companyMiniStats"><div><b>{x.self_done?'Sí':'No'}</b><span>Autoevaluación</span></div><div><b>{x.team_count||0}</b><span>Equipo</span></div><div><b>{x.has_psychologist_note?'Sí':'No'}</b><span>Análisis previo</span></div></div>
            {x.assessment_id
              ?<a className="primary companyViewBtn" href={'/analysis?id='+x.assessment_id}>Ver dashboard, análisis e informe PDF</a>
              :<div className="privacy">Aún no existe una evaluación iniciada para este supervisor.</div>}
          </article>})}
          {!supervisors.length&&<div className="notice">No hay supervisores disponibles para esta empresa.</div>}
        </div>
      </section>
    </main>;
  }

  const supervisors=data.supervisors||[];
  const assessments=data.assessments||[];
  const finalized=supervisors.filter(x=>x.final_report_status==='finalized').length;
  const questionBank=(data.questions||[]).filter(q=>q.mode===questionMode);
  const competencies=['Comunicación','Liderazgo','Toma de decisiones','Trabajo bajo presión','Trabajo en equipo','Adaptabilidad','Manejo de conflictos','Delegación','Orientación a resultados','Desarrollo de personas'];

  return <main className="shell wide">
    <div className="appBrandBar"><img className="appWhiteLogo" src="/innova-rc-capacita.svg" alt="Innova RC Capacita"/></div>
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

    {session.role==='admin'&&<div className="adminTabs">
      <button className={activeTab==='seguimiento'?'active':''} onClick={()=>setActiveTab('seguimiento')}>Seguimiento</button>
      <button className={activeTab==='configuracion'?'active':''} onClick={()=>setActiveTab('configuracion')}>Configuración</button>
      <button className={activeTab==='mantenimiento'?'active':''} onClick={()=>setActiveTab('mantenimiento')}>Mantenimiento</button>
      <button className={activeTab==='instrumento'?'active':''} onClick={()=>setActiveTab('instrumento')}>Instrumento</button>
    </div>}

    {msg&&<div className="notice">{msg}</div>}
    {session.role==='psychologist'&&<div className="privacy">
      Tienes acceso profesional al listado completo de supervisores, resultados DISC, percepción agregada del equipo, brechas e informes. En cada supervisor puedes ingresar tu percepción profesional y preparar el informe final.
    </div>}

    {((session.role==='psychologist')||(session.role==='admin'&&activeTab==='instrumento'))&&<section className="panel questionBankPanel">
      <div className="sectionTitle">
        <div><div className="eyebrow">Instrumento</div><h2>Banco de Preguntas</h2></div>
        <span className="pill good">{questionMode==='self'?questionBank.filter(q=>q.active).length+' escala + '+OPEN_SELF.length+' abiertas':questionBank.filter(q=>q.active).length+' activas'}</span>
      </div>
      <p className="muted">Administra las preguntas que responden supervisores y trabajadores. Los cambios se aplican a nuevas respuestas.</p>

      <div className="questionTabs">
        <button className={questionMode==='self'?'active':''} onClick={()=>setQuestionMode('self')}>Supervisor</button>
        <button className={questionMode==='team'?'active':''} onClick={()=>setQuestionMode('team')}>Trabajador / Equipo 360°</button>
      </div>

      <div className="newQuestionCard">
        <textarea placeholder="Escribe una nueva pregunta observable y clara..." value={newQuestion.text} onChange={e=>setNewQuestion({...newQuestion,text:e.target.value})}/>
        <select value={newQuestion.disc} onChange={e=>setNewQuestion({...newQuestion,disc:e.target.value})}>
          <option value="D">D · Dominancia</option><option value="I">I · Influencia</option><option value="S">S · Estabilidad</option><option value="C">C · Cumplimiento</option>
        </select>
        <select value={newQuestion.competency} onChange={e=>setNewQuestion({...newQuestion,competency:e.target.value})}>
          {competencies.map(x=><option key={x}>{x}</option>)}
        </select>
        <button className="primary" onClick={saveNewQuestion}>Agregar pregunta</button>
      </div>

      <div className="questionList">
        {questionBank.map((q,idx)=><article key={q.id} className={'questionItem '+(!q.active?'inactive':'')}>
          <div className="questionNumber">{idx+1}</div>
          <div className="questionContent">
            <p>{q.text}</p>
            <div className="questionMeta"><span>{q.disc}</span><span>{q.competency}</span><span>{q.active?'Activa':'Inactiva'}</span></div>
          </div>
          <div className="questionActions">
            <button className="ghost smallBtn" disabled={idx===0} onClick={()=>manage('/api/manage/questions',{action:'move',id:q.id,direction:'up'},'Orden actualizado.')}>↑</button>
            <button className="ghost smallBtn" disabled={idx===questionBank.length-1} onClick={()=>manage('/api/manage/questions',{action:'move',id:q.id,direction:'down'},'Orden actualizado.')}>↓</button>
            <button className="ghost smallBtn" onClick={()=>editQuestion(q)}>Editar</button>
            <button className="ghost smallBtn" onClick={()=>manage('/api/manage/questions',{action:'toggle',id:q.id},q.active?'Pregunta desactivada.':'Pregunta activada.')}>{q.active?'Desactivar':'Activar'}</button>
            <button className="dangerBtn smallBtn" onClick={()=>deleteQuestion(q)}>Eliminar</button>
          </div>
        </article>)}
        {questionBank.length===0&&<div className="notice">No hay preguntas en este banco.</div>}
      </div>

      {questionMode==='self'&&<div className="openBankSection">
        <div className="sectionTitle">
          <div><div className="eyebrow">Preguntas abiertas obligatorias</div><h3>3 preguntas cualitativas del supervisor</h3></div>
          <span className="pill info">Obligatorias</span>
        </div>
        <p className="muted">Estas preguntas aparecen después de las 48 preguntas de escala y deben responderse antes de finalizar la evaluación.</p>
        <div className="openBankGrid">
          {OPEN_SELF.map((q,idx)=><article className="openBankCard" key={q.id}>
            <div className="questionNumber">{idx+1}</div>
            <div><b>{q.area}</b><p>{q.text}</p><span className="pill good">Respuesta abierta · Obligatoria</span></div>
          </article>)}
        </div>
      </div>}
    </section>}

    {(session.role==='psychologist'||(session.role==='admin'&&activeTab==='seguimiento'))&&<section className="panel">
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
              ?session.role==='psychologist'
                ?<div className="actionStack">
                  <a className="link" href={'/analysis?id='+x.assessment_id}>Ver ficha completa</a>
                  <a className="psychAction" href={'/analysis?id='+x.assessment_id+'#percepcion'}>Ingresar percepción</a>
                </div>
                :<a className="link" href={'/analysis?id='+x.assessment_id}>Ver ficha completa</a>
              :<span className="muted">Sin ciclo abierto</span>}</td>
          </tr>)}
        </tbody>
      </table></div>
    </section>}

    {session.role==='admin'&&activeTab==='configuracion'&&<section className="panel">
      <div className="eyebrow">Configuración</div>
      <h2>Administrar empresas, usuarios y evaluaciones</h2>
      <div className="management">
        <article>
          <h3>1. Crear empresa</h3>
          <input placeholder="Nombre o razón social" value={company.name} onChange={e=>setCompany({...company,name:e.target.value})}/>
          <input placeholder="RUT empresa" value={company.rut} onChange={e=>setCompany({...company,rut:e.target.value})}/>
          <input placeholder="Correo" value={company.email} onChange={e=>setCompany({...company,email:e.target.value})}/>
          <input type="password" placeholder="Contraseña inicial" value={company.password} onChange={e=>setCompany({...company,password:e.target.value})}/>
          <p className="muted">Clave inicial recomendada: <b>Recamespa.2026</b></p>
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

    {session.role==='admin'&&activeTab==='mantenimiento'&&<section className="panel adminRegistry">
      <div className="sectionTitle">
        <div><div className="eyebrow">Mantenimiento</div><h2>Registros del sistema</h2></div>
        <button className="ghost" onClick={()=>load()}>Actualizar registros</button>
      </div>
      <p className="muted">Aquí puedes revisar todo lo creado, corregir datos, activar/desactivar accesos y restablecer contraseñas.</p>

      <div className="registryBlock">
        <h3>Empresas</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Empresa</th><th>RUT / Usuario</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{(data.management?.companies||[]).map(x=><tr key={x.id}>
            <td><b>{x.name}</b></td><td>{x.rut}</td><td>{x.email||'—'}</td>
            <td>{statusPill(x.active&&x.user_active,'Activa','Inactiva')}</td>
            <td><div className="registryActions">
              <button className="ghost smallBtn" onClick={()=>editCompany(x)}>Editar</button>
              <button className="ghost smallBtn" onClick={()=>resetCompanyPassword(x)}>Restablecer a Recamespa.2026</button>
              <button className="ghost smallBtn" onClick={()=>manage('/api/manage/company',{action:'toggle',id:x.id},x.active?'Empresa desactivada.':'Empresa activada.')}>{x.active?'Desactivar':'Activar'}</button>
              <button className="dangerBtn smallBtn" onClick={()=>deleteCompany(x)}>Eliminar</button>
            </div></td>
          </tr>)}
          {(data.management?.companies||[]).length===0&&<tr><td colSpan="5" className="muted">No hay empresas registradas.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="registryBlock">
        <h3>Supervisores</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Empresa</th><th>Supervisor</th><th>RUT</th><th>Cargo / Área</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{(data.management?.supervisors||[]).map(x=><tr key={x.id}>
            <td>{x.company_name}</td><td><b>{x.full_name}</b><br/><span className="muted">{x.email||''}</span></td><td>{x.rut}</td>
            <td>{x.position||'—'}{x.area?' · '+x.area:''}</td><td>{statusPill(x.active,'Activo','Inactivo')}</td>
            <td><div className="registryActions">
              <button className="ghost smallBtn" onClick={()=>editSupervisor(x)}>Editar</button>
              <button className="ghost smallBtn" onClick={()=>manage('/api/manage/supervisor',{action:'toggle',id:x.id},x.active?'Supervisor desactivado.':'Supervisor activado.')}>{x.active?'Desactivar':'Activar'}</button>
              <button className="dangerBtn smallBtn" onClick={()=>deleteSupervisor(x)}>Eliminar</button>
            </div></td>
          </tr>)}
          {(data.management?.supervisors||[]).length===0&&<tr><td colSpan="6" className="muted">No hay supervisores registrados.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="registryBlock professionalRegistry">
        <h3>Profesionales / Psicología Laboral</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Profesional</th><th>Usuario / RUT</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{(data.management?.professionals||[]).map(x=><tr key={x.id}>
            <td><b>{x.full_name}</b></td><td><b>{x.rut}</b></td><td>Psicología Laboral</td><td>{statusPill(x.active,'Activo','Inactivo')}</td>
            <td><div className="registryActions">
              <button className="ghost smallBtn" onClick={()=>editProfessional(x)}>Editar</button>
              <button className="primary smallBtn" onClick={()=>resetProfessionalPassword(x)}>Restablecer clave</button>
              <button className="ghost smallBtn" onClick={()=>manage('/api/manage/professional',{action:'toggle',id:x.id},x.active?'Profesional desactivado.':'Profesional activado.')}>{x.active?'Desactivar':'Activar'}</button>
              <button className="dangerBtn smallBtn" onClick={()=>deleteProfessional(x)}>Eliminar</button>
            </div></td>
          </tr>)}
          {(data.management?.professionals||[]).length===0&&<tr><td colSpan="5"><div className="notice">No existe ninguna cuenta de Psicóloga registrada. Créala en el formulario superior y luego aparecerá aquí.</div></td></tr>}
          </tbody>
        </table></div>
      </div>
    </section>}

    {((session.role==='psychologist')||(session.role==='admin'&&activeTab==='seguimiento'))&&<section className="panel">
      <h2>Historial de evaluaciones</h2>
      <p className="muted">Consulta todos los ciclos y accede a la ficha completa de cada supervisor.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>Empresa</th><th>Supervisor</th><th>Ciclo</th><th>DISC</th><th>Equipo</th><th>Entrevista</th><th>Informe</th><th>Acción</th></tr></thead>
        <tbody>{assessments.map(x=><tr key={x.id}>
          <td>{x.company_name}</td><td>{x.full_name}</td><td>{x.cycle_name}</td>
          <td>{x.self_done?'Completado':'Pendiente'}</td><td>{x.team_count}</td>
          <td>{x.has_psychologist_note?'Ingresada':'Pendiente'}</td>
          <td>{x.final_report_status==='finalized'?'Finalizado':'Pendiente'}</td>
          <td>{session.role==='psychologist'
            ?<div className="actionStack"><a className="link" href={'/analysis?id='+x.id}>Ver ficha</a><a className="psychAction" href={'/analysis?id='+x.id+'#percepcion'}>Ingresar percepción</a></div>
            :<a className="link" href={'/analysis?id='+x.id}>Ver análisis</a>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}
  </main>;
}
