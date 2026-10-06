import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';
import { COMP } from '../../../../lib/instrument';

const validDisc=['D','I','S','C'];

export async function POST(req){
  const s=await getSession();
  if(!s||!['admin','psychologist'].includes(s.role))return NextResponse.json({error:'Sin acceso.'},{status:403});
  try{
    const b=await req.json();
    const action=b.action||'create';

    if(action==='create'){
      const mode=b.mode==='team'?'team':'self';
      const text=String(b.text||'').trim();
      const disc=String(b.disc||'').toUpperCase();
      const competency=String(b.competency||'').trim();
      if(text.length<5||!validDisc.includes(disc)||!COMP.includes(competency))return NextResponse.json({error:'Completa texto, dimensión y competencia válidos.'},{status:400});
      const {rows:maxRows}=await query('select coalesce(max(position),0)::int max from rc360_questions where mode=$1',[mode]);
      const position=maxRows[0].max+1;
      const {rows}=await query(`insert into rc360_questions(mode,text,disc,competency,position,active)
        values($1,$2,$3,$4,$5,true) returning *`,[mode,text,disc,competency,position]);
      return NextResponse.json(rows[0]);
    }

    if(!b.id)return NextResponse.json({error:'Pregunta inválida.'},{status:400});

    if(action==='update'){
      const text=String(b.text||'').trim();
      const disc=String(b.disc||'').toUpperCase();
      const competency=String(b.competency||'').trim();
      if(text.length<5||!validDisc.includes(disc)||!COMP.includes(competency))return NextResponse.json({error:'Completa texto, dimensión y competencia válidos.'},{status:400});
      const {rows}=await query(`update rc360_questions set text=$2,disc=$3,competency=$4,updated_at=now()
        where id=$1 and deleted_at is null returning *`,[b.id,text,disc,competency]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='toggle'){
      const {rows}=await query(`update rc360_questions set active=not active,updated_at=now()
        where id=$1 and deleted_at is null returning *`,[b.id]);
      return NextResponse.json(rows[0]||{});
    }

    if(action==='move'){
      const direction=b.direction==='up'?'up':'down';
      const {rows}=await query('select id,mode,position from rc360_questions where id=$1 and deleted_at is null',[b.id]);
      const q=rows[0]; if(!q)return NextResponse.json({error:'Pregunta no encontrada.'},{status:404});
      const sql=direction==='up'
        ? 'select id,position from rc360_questions where mode=$1 and deleted_at is null and position<$2 order by position desc limit 1'
        : 'select id,position from rc360_questions where mode=$1 and deleted_at is null and position>$2 order by position asc limit 1';
      const other=await query(sql,[q.mode,q.position]);
      if(!other.rows[0])return NextResponse.json({ok:true});
      const temp=-1000000-q.position;
      await query('update rc360_questions set position=$2 where id=$1',[q.id,temp]);
      await query('update rc360_questions set position=$2 where id=$1',[other.rows[0].id,q.position]);
      await query('update rc360_questions set position=$2 where id=$1',[q.id,other.rows[0].position]);
      return NextResponse.json({ok:true});
    }

    if(action==='delete'){
      const {rows}=await query(`update rc360_questions set deleted_at=now(),active=false,updated_at=now()
        where id=$1 returning id,mode,text`,[b.id]);
      return NextResponse.json({ok:true,deleted:rows[0]||null});
    }

    return NextResponse.json({error:'Acción no válida.'},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible gestionar la pregunta.'},{status:500});
  }
}
