import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getSession } from '../../../lib/security';

export async function GET(){
  const s=await getSession();
  if(!s) return NextResponse.json({error:'No autorizado.'},{status:401});
  try{
    const params=[]; let whereA=''; let whereS='';
    if(s.role==='company'){
      params.push(s.companyId);
      whereA='where a.company_id=$1';
      whereS='where s.company_id=$1';
    }

    const {rows}=await query(`select a.id,a.cycle_name,a.status,a.self_completed_at,a.created_at,
      s.id supervisor_id,s.full_name,s.rut,s.position,s.area,c.name company_name,c.id company_id,
      (select count(*)::int from rc360_team_responses tr where tr.assessment_id=a.id) team_count,
      exists(select 1 from rc360_psychologist_notes pn where pn.assessment_id=a.id) has_psychologist_note,
      coalesce((select fr.status from rc360_final_reports fr where fr.assessment_id=a.id),'pending') final_report_status
      from rc360_assessments a
      join rc360_supervisors s on s.id=a.supervisor_id
      join rc360_companies c on c.id=a.company_id
      ${whereA}
      order by a.created_at desc`,params);

    const supParams=s.role==='company'?[s.companyId]:[];
    const supervisors=(await query(`select s.id,s.full_name,s.rut,s.position,s.area,s.company_id,c.name company_name,
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
        order by a.created_at desc
        limit 1
      ) la on true
      ${whereS}
      and s.active=true
      order by c.name,s.full_name`.replace('where s.company_id=$1\n      and','where s.company_id=$1 and').replace('\n      and s.active=true','\n      where s.active=true'),supParams)).rows;

    const companies=s.role==='admin'||s.role==='psychologist'
      ? (await query('select id,name,rut from rc360_companies where active=true order by name')).rows : [];

    return NextResponse.json({
      session:s,
      assessments:rows.map(r=>({...r,self_done:!!r.self_completed_at})),
      companies,
      supervisors:supervisors.map(r=>({...r,self_done:!!r.self_completed_at}))
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible cargar el dashboard.'},{status:500});
  }
}
