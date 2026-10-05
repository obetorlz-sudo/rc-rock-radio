import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getSession } from '../../../lib/security';
export async function GET(){
  const s=await getSession(); if(!s) return NextResponse.json({error:'No autorizado.'},{status:401});
  try{
    const params=[]; let where='';
    if(s.role==='company'){ params.push(s.companyId); where='where a.company_id=$1'; }
    const {rows}=await query(`select a.id,a.cycle_name,a.status,a.self_completed_at,a.created_at,
      s.full_name,s.rut,s.position,s.area,c.name company_name,c.id company_id,
      (select count(*)::int from rc360_team_responses tr where tr.assessment_id=a.id) team_count
      from rc360_assessments a join rc360_supervisors s on s.id=a.supervisor_id join rc360_companies c on c.id=a.company_id
      ${where} order by a.created_at desc`,params);
    const companies=s.role==='admin'||s.role==='psychologist' ? (await query('select id,name,rut from rc360_companies where active=true order by name')).rows : [];
    const supervisors=s.role==='company' ? (await query('select id,full_name,rut,company_id from rc360_supervisors where company_id=$1 and active=true order by full_name',[s.companyId])).rows : (s.role==='admin'||s.role==='psychologist' ? (await query('select id,full_name,rut,company_id from rc360_supervisors where active=true order by full_name')).rows : []);
    return NextResponse.json({session:s,assessments:rows.map(r=>({...r,self_done:!!r.self_completed_at})),companies,supervisors});
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible cargar el dashboard.'},{status:500});}
}
