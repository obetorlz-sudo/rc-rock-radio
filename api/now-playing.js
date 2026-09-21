import dns from 'node:dns/promises';
import net from 'node:net';

const RB_SERVERS = ['https://de1.api.radio-browser.info','https://nl1.api.radio-browser.info'];
const USER_AGENT = 'RC-Rock-Radio/5.0 (+https://rc-rock-radio.vercel.app)';

function json(res,status,body,cache='public, s-maxage=25, stale-while-revalidate=45'){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control',cache);
  res.end(JSON.stringify(body));
}
function isPrivateIp(address){
  if(!address) return true;
  const ip=address.toLowerCase();
  if(net.isIPv4(ip)){
    const p=ip.split('.').map(Number);
    return p[0]===10 || p[0]===127 || p[0]===0 || (p[0]===169&&p[1]===254) || (p[0]===172&&p[1]>=16&&p[1]<=31) || (p[0]===192&&p[1]===168) || (p[0]===100&&p[1]>=64&&p[1]<=127) || p[0]>=224;
  }
  if(net.isIPv6(ip)) return ip==='::1' || ip==='::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb');
  return true;
}
async function assertPublicUrl(raw){
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)) throw new Error('unsupported-protocol');
  const host=u.hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.local')) throw new Error('private-host');
  if(net.isIP(host)){ if(isPrivateIp(host)) throw new Error('private-ip'); }
  else{
    const results=await dns.lookup(host,{all:true,verbatim:true});
    if(!results.length || results.some(r=>isPrivateIp(r.address))) throw new Error('private-resolution');
  }
  return u.href;
}
async function getStation(uuid){
  for(const base of RB_SERVERS){
    try{
      const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),5000);
      const r=await fetch(`${base}/json/stations/byuuid/${encodeURIComponent(uuid)}`,{signal:ctrl.signal,headers:{'User-Agent':USER_AGENT,Accept:'application/json'}}); clearTimeout(timer);
      if(!r.ok) continue;
      const data=await r.json();
      if(Array.isArray(data)&&data[0]) return data[0];
    }catch{}
  }
  return null;
}
function splitTitle(raw=''){
  const clean=String(raw).replace(/\0/g,'').replace(/\\'/g,"'").trim().slice(0,240);
  if(!clean) return {streamTitle:'',artist:'',song:''};
  for(const sep of [' — ',' – ',' - ',' | ',' ~ ']){
    const i=clean.indexOf(sep);
    if(i>0 && i<clean.length-sep.length){
      return {streamTitle:clean,artist:clean.slice(0,i).trim().slice(0,120),song:clean.slice(i+sep.length).trim().slice(0,160)};
    }
  }
  return {streamTitle:clean,artist:'',song:clean};
}
async function readIcy(streamUrl){
  const url=await assertPublicUrl(streamUrl);
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),7000);
  try{
    const r=await fetch(url,{signal:ctrl.signal,redirect:'follow',headers:{'User-Agent':USER_AGENT,'Icy-MetaData':'1','Accept':'*/*','Connection':'close'}});
    if(!r.ok) return {available:false,reason:`stream-http-${r.status}`};
    const contentType=(r.headers.get('content-type')||'').toLowerCase();
    if(contentType.includes('mpegurl')||contentType.includes('vnd.apple.mpegurl')) return {available:false,reason:'hls'};
    const metaInt=Number(r.headers.get('icy-metaint'));
    if(!Number.isFinite(metaInt)||metaInt<=0||metaInt>1024*1024) return {available:false,reason:'no-icy-metadata'};
    if(!r.body) return {available:false,reason:'no-body'};
    const reader=r.body.getReader();
    const target=metaInt+1+4080;
    let total=0; const chunks=[];
    while(total<target){
      const {done,value}=await reader.read();
      if(done) break;
      if(value?.length){ chunks.push(value); total+=value.length; }
      if(total>=metaInt+1){
        const merged=new Uint8Array(total); let off=0; for(const c of chunks){merged.set(c,off);off+=c.length;}
        const length=merged[metaInt]*16;
        if(length===0) return {available:false,reason:'empty-metadata'};
        if(total>=metaInt+1+length){
          const bytes=merged.slice(metaInt+1,metaInt+1+length);
          let metadata=new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\0+$/,'');
          if(metadata.includes('�')) metadata=new TextDecoder('latin1',{fatal:false}).decode(bytes).replace(/\0+$/,'');
          const match=metadata.match(/StreamTitle='(.*?)';/is) || metadata.match(/StreamTitle="(.*?)";/is);
          if(!match?.[1]?.trim()) return {available:false,reason:'empty-title'};
          return {available:true,...splitTitle(match[1])};
        }
      }
    }
    return {available:false,reason:'metadata-timeout'};
  }finally{ clearTimeout(timer); ctrl.abort(); }
}

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{ok:false,error:'method-not-allowed'},'no-store');
  const uuid=String(req.query?.uuid||'').trim();
  if(!/^[0-9a-f-]{20,40}$/i.test(uuid)) return json(res,400,{ok:false,error:'invalid-station-uuid'},'no-store');
  const station=await getStation(uuid);
  if(!station) return json(res,404,{ok:false,error:'station-not-found'});
  const stream=String(station.url_resolved||station.url||'').trim();
  if(!stream) return json(res,200,{ok:true,available:false,reason:'missing-stream',stationName:station.name||''});
  try{
    const metadata=await readIcy(stream);
    return json(res,200,{ok:true,stationName:station.name||'',stationuuid:uuid,...metadata,checkedAt:new Date().toISOString()});
  }catch(e){
    return json(res,200,{ok:true,available:false,reason:'metadata-unavailable',stationName:station.name||'',checkedAt:new Date().toISOString()});
  }
}