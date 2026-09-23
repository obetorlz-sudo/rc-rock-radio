const COUNTER_BASE='https://counterapi.com/api';
const NS='rc-rock-radio.vercel.app';
const KEY='homepage';

function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma','no-cache');
  res.end(JSON.stringify(body));
}
function cleanUid(value=''){
  return String(value).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
}
export default async function handler(req,res){
  if(req.method!=='GET') return send(res,405,{ok:false,error:'method-not-allowed'});
  const type=req.query?.type==='like'?'like':req.query?.type==='visit'?'view':'';
  const mode=req.query?.mode==='inc'?'inc':'get';
  const uid=cleanUid(req.query?.uid);
  if(!type) return send(res,400,{ok:false,error:'invalid-type'});
  try{
    const params=new URLSearchParams();
    if(mode==='get') params.set('readOnly','true');
    if(uid) params.set('userId',uid);
    const url=`${COUNTER_BASE}/${encodeURIComponent(NS)}/${encodeURIComponent(type)}/${encodeURIComponent(KEY)}?${params}`;
    const upstream=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RC-Rock-Radio/13.0'}});
    if(!upstream.ok) return send(res,502,{ok:false,error:'counter-upstream',status:upstream.status});
    const data=await upstream.json();
    const value=Number(data?.value);
    if(!Number.isFinite(value)) return send(res,502,{ok:false,error:'counter-invalid-response'});
    return send(res,200,{ok:true,value,abv:data?.abv||String(value)});
  }catch(e){
    return send(res,502,{ok:false,error:'counter-unavailable'});
  }
}