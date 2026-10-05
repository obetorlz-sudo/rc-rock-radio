import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getSession } from '../../../lib/security';
function avgJson(rows,key){
  if(!rows.length)return null; const keys=Object.keys(rows[0][key]||{}); const out={};
  for(const k of keys){ const vals=rows.map(r=>Number(r[key]?.[k])).filter(Number.isFinite); out[k]=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null; }
  return out;
}
export async function GET(req){
  const s=await getSession(); if(!s)return NextResponse.json({error:'No autorizado.'},{status:401});
  try{
    const id=new URL(req.url).searchParams.get('id');
    const {rows}=await query(`select a.id,a.cycle_name,a.company_id,su.full_name,su.position,su.area,c.name company_name
      from rc360_assessments a join rc360_supervisors su on su.id=a.supervisor_id join rc360_companies c on c.id=a.company_id where a.id=$1`,[id]);
    const a=rows[0]; if(!a)return NextResponse.json({error:'Evaluación no encontrada.'},{status:404});
    if(s.role==='company'&&String(a.company_id)!==String(s.companyId))return NextResponse.json({error:'Sin acceso.'},{status:403});
    const self=(await query('select disc,competencies,primary_profile,secondary_profile from rc360_self_results where assessment_id=$1',[id])).rows[0]||null;
    const teamRows=(await query('select disc,competencies from rc360_team_responses where assessment_id=$1',[id])).rows;
    const count=teamRows.length;
    const team=count>=3?{respondent_count:count,disc:avgJson(teamRows,'disc'),competencies:avgJson(teamRows,'competencies')}:{respondent_count:count,disc:null,competencies:null};
    return NextResponse.json({company:{name:a.company_name},supervisor:{name:a.full_name,position:a.position,area:a.area},assessment:{cycle:a.cycle_name},self:self?{disc:self.disc,competencies:self.competencies,primary:self.primary_profile,secondary:self.secondary_profile}:null,team});
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible generar el análisis.'},{status:500});}
}
