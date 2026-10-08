import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getSession } from '../../../../lib/security';

export async function POST(req){
  const session=await getSession();
  if(!session||session.role!=='admin') return NextResponse.json({error:'Solo administrador.'},{status:403});
  try{
    const body=await req.json();
    if(!body.id) return NextResponse.json({error:'Empresa inválida.'},{status:400});
    const logo=String(body.logoData||'');
    if(logo && logo.length>900000) return NextResponse.json({error:'El logo es demasiado pesado.'},{status:400});
    const {rows}=await query('update rc360_companies set logo_url=$2 where id=$1 returning id,name,logo_url',[body.id,logo||null]);
    if(!rows[0]) return NextResponse.json({error:'Empresa no encontrada.'},{status:404});
    return NextResponse.json(rows[0]);
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible guardar el logo.'},{status:500});
  }
}
