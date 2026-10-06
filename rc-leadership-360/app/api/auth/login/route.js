import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut } from '../../../../lib/rut';
import { verifyPassword, createSession } from '../../../../lib/security';

export async function POST(req){
  try{
    const {rut,password}=await req.json();
    const raw=String(rut||'').trim();
    const looksRut=/^[0-9kK.\-]+$/.test(raw);

    let candidates;
    if(looksRut){
      const normalized=normalizeRut(raw);
      const formatted=normalized.length>1?normalized.slice(0,-1)+'-'+normalized.slice(-1):normalized;
      candidates=[normalized,formatted,raw.toUpperCase()];
    }else{
      candidates=[raw.toUpperCase()];
    }
    candidates=[...new Set(candidates.filter(Boolean))];

    const {rows}=await query(
      'select id,company_id,rut,full_name,role,password_hash from rc360_users where rut = any($1::text[]) and active=true limit 1',
      [candidates]
    );
    const u=rows[0];

    if(!u||!(await verifyPassword(String(password||''),u.password_hash))){
      return NextResponse.json({error:'Credenciales incorrectas.'},{status:401});
    }

    await createSession(u);
    return NextResponse.json({id:u.id,company_id:u.company_id,full_name:u.full_name,role:u.role});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible iniciar sesión.'},{status:500});
  }
}
