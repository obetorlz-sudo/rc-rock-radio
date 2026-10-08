import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getSession } from '../../../lib/security';

export async function GET(){
  const s=await getSession();
  if(!s) return NextResponse.json({error:'No autorizado.'},{status:401});

  try{
    const companyFilter=s.role==='company';
    const params=companyFilter?[s.companyId]:[];

    const assessmentsSql=`select a.id,a.cycle_name,a.status,a.self_completed_at,a.created_at,
      s.id supervisor_id,s.full_name,s.rut,s.position,s.area,c.name company_name,c.id company_id,
      (select count(*)::int from rc360_team_responses tr where tr.assessment_id=a.id) team_count,
      exists(select 1 from rc360_psychologist_notes pn where pn.assessment_id=a.id) has_psychologist_note,
      coalesce((select fr.status from rc360_final_reports fr where fr.assessment_id=a.id),'pending') final_report_status
      from rc360_assessments a
      join rc360_supervisors s on s.id=a.supervisor_id
      join rc360_companies c on c.id=a.company_id
      ${companyFilter?'where a.company_id=$1':''}
      order by a.created_at desc`;

    const supervisorsSql=`select s.id,s.full_name,s.rut,s.position,s.area,s.email,s.active,s.company_id,c.name company_name,
      la.id assessment_id,la.cycle_name,la.self_completed_at,
      coalesce((select count(*)::int from rc360_team_responses tr where tr.assessment_id=la.id),0) team_count,
      case when la.id is null then false else exists(select 1 from rc360_psychologist_notes pn where pn.assessment_id=la.id) end has_psychologist_note,
      coalesce((select fr.status from rc360_final_reports fr where fr.assessment_id=la.id),'pending') final_report_status
      from rc360_supervisors s
      join rc360_companies c on c.id=s.company_id
      left join lateral (
        select a.id,a.cycle_name,a.self_completed_at
        from rc360_assessments a
        where a.supervisor_id=s.id
        order by a.created_at desc limit 1
      ) la on true
      where s.active=true
      ${companyFilter?'and s.company_id=$1':''}
      order by c.name,s.full_name`;

    const managementCompanies=s.role==='admin'
      ? query(`select c.id,c.name,c.rut,c.email,c.active,c.created_at,
          u.id user_id,u.active user_active,u.rut login_user
        from rc360_companies c
        left join rc360_users u on u.company_id=c.id and u.role='company'
        order by c.name`)
      : Promise.resolve({rows:[]});

    const managementSupervisors=s.role==='admin'
      ? query(`select s.id,s.company_id,s.full_name,s.rut,s.position,s.area,s.email,s.active,c.name company_name,s.created_at
        from rc360_supervisors s join rc360_companies c on c.id=s.company_id
        order by c.name,s.full_name`)
      : Promise.resolve({rows:[]});

    const managementProfessionals=s.role==='admin'
      ? query(`select id,rut,full_name,role,active,created_at
        from rc360_users where role='psychologist' order by full_name`)
      : Promise.resolve({rows:[]});

    const companiesPromise=(s.role==='admin'||s.role==='psychologist')
      ? query('select id,name,rut from rc360_companies where active=true order by name')
      : Promise.resolve({rows:[]});

    const questionsPromise=['admin','psychologist'].includes(s.role)
      ? query(`select id,mode,text,disc,competency,position,active,created_at,updated_at
        from rc360_questions where deleted_at is null order by mode,position,id`)
      : Promise.resolve({rows:[]});

    const participationPromise=s.role==='admin'
      ? query(`select p.assessment_id,p.worker_rut,p.completed_at,
          a.cycle_name,a.supervisor_id,su.full_name supervisor_name,
          c.id company_id,c.name company_name
        from rc360_participation_log p
        join rc360_assessments a on a.id=p.assessment_id
        join rc360_supervisors su on su.id=a.supervisor_id
        join rc360_companies c on c.id=a.company_id
        order by p.completed_at desc`).catch(()=>({rows:[]}))
      : Promise.resolve({rows:[]});

    const [assessmentsRes,supervisorsRes,companiesRes,mc,ms,mp,mq,participationRes]=await Promise.all([
      query(assessmentsSql,params),
      query(supervisorsSql,params),
      companiesPromise,
      managementCompanies,
      managementSupervisors,
      managementProfessionals,
      questionsPromise,
      participationPromise
    ]);

    return NextResponse.json({
      session:s,
      assessments:assessmentsRes.rows.map(r=>({...r,self_done:!!r.self_completed_at})),
      companies:companiesRes.rows,
      supervisors:supervisorsRes.rows.map(r=>({...r,self_done:!!r.self_completed_at})),
      management:s.role==='admin'?{
        companies:mc.rows,
        supervisors:ms.rows,
        professionals:mp.rows,
        participation:participationRes.rows
      }:null,
      questions:mq.rows
    },{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible cargar el dashboard.'},{status:500});
  }
}
