export function normalizeRut(v=''){ return String(v).toUpperCase().replace(/[^0-9K]/g,''); }
export function validRut(v=''){
  const r=normalizeRut(v); if(r.length<7) return false;
  const body=r.slice(0,-1), dv=r.slice(-1); let sum=0,mul=2;
  for(let i=body.length-1;i>=0;i--){ sum+=Number(body[i])*mul; mul=mul===7?2:mul+1; }
  const x=11-(sum%11); const expected=x===11?'0':x===10?'K':String(x);
  return dv===expected;
}
