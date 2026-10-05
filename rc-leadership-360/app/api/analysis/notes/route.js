import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';
export async function POST(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role)) return NextResponse.json({error:'Acceso reservado a administración y psicología laboral.'},{status:403});
  try{
    const b=await req.json();
    const note=String(b.note||'').trim();
    if(!b.assessmentId||note.length<10) return NextResponse.json({error:'Ingresa un análisis profesional de al menos 10 caracteres.'},{status:400});
    await query('insert into rc360_psychologist_notes(assessment_id,author_id,note) values($1,$2,$3)',[b.assessmentId,s.id,note.slice(0,5000)]);
    return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({error:'No fue posible guardar el análisis profesional.'},{status:500});}
}
