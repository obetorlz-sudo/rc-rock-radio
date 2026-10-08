import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { normalizeRut } from '../../../../lib/rut';
import { verifyPassword, hashPassword, createSession } from '../../../../lib/security';

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

    if(!u){
      return NextResponse.json({error:'Credenciales incorrectas.'},{status:401});
    }

    const supplied=String(password||'');
    let valid=await verifyPassword(supplied,u.password_hash);

    // Migra de forma transparente las cuentas empresa que todavía usan la clave estándar anterior.
    if(!valid&&u.role==='company'&&supplied==='Recamespa.2026'){
      const stillOld=await verifyPassword('Recame.2026',u.password_hash);
      if(stillOld){
        const newHash=await hashPassword('Recamespa.2026');
        await query('update rc360_users set password_hash=$2 where id=$1',[u.id,newHash]);
        valid=true;
      }
    }

    if(!valid){
      return NextResponse.json({error:'Credenciales incorrectas.'},{status:401});
    }

    await createSession(u);
    return NextResponse.json({id:u.id,company_id:u.company_id,full_name:u.full_name,role:u.role});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'No fue posible iniciar sesión.'},{status:500});
  }
}
