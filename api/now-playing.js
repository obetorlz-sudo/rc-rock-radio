import dns from 'node:dns/promises';
import net from 'node:net';

const RB_SERVERS=['https://de1.api.radio-browser.info','https://nl1.api.radio-browser.info'];
const USER_AGENT='RC-Rock-Radio/6.0 (+https://rc-rock-radio.vercel.app)';

function json(res,status,body,cache='public, s-maxage=18, stale-while-revalidate=30'){
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
    return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||p[0]>=224;
  }
  if(net.isIPv6(ip)) return ip==='::1'||ip==='::'||ip.startsWith('fc')||ip.startsWith('fd')||ip.startsWith('fe8')||ip.startsWith('fe9')||ip.startsWith('fea')||ip.startsWith('feb');
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
    if(!results.length||results.some(r=>isPrivateIp(r.address))) throw new Error('private-resolution');
  }
  return u;
}
async function timedFetch(url,options={},ms=4500){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),ms);
  try{return await fetch(url,{...options,signal:ctrl.signal,redirect:'follow'});}
  finally{clearTimeout(timer);}
}
async function getStation(uuid){
  for(const base of RB_SERVERS){
    try{
      const r=await timedFetch(`${base}/json/stations/byuuid/${encodeURIComponent(uuid)}`,{headers:{'User-Agent':USER_AGENT,Accept:'application/json'}},3500);
      if(!r.ok) continue;
      const data=await r.json();
      if(Array.isArray(data)&&data[0]) return data[0];
    }catch{}
  }
  return null;
}
function splitTitle(raw=''){
  const clean=String(raw).replace(/\0/g,'').replace(/\\'/g,"'").replace(/\s+/g,' ').trim().slice(0,240);
  if(!clean) return {streamTitle:'',artist:'',song:''};
  for(const sep of [' — ',' – ',' - ',' | ',' ~ ',' :: ']){
    const i=clean.indexOf(sep);
    if(i>0&&i<clean.length-sep.length) return {streamTitle:clean,artist:clean.slice(0,i).trim().slice(0,120),song:clean.slice(i+sep.length).trim().slice(0,160)};
  }
  return {streamTitle:clean,artist:'',song:clean};
}
function resultFromTitle(title,source){
  const p=splitTitle(title);
  return p.streamTitle?{available:true,...p,source}:{available:false,reason:'empty-title'};
}
async function readIcy(streamUrl){
  const u=await assertPublicUrl(streamUrl);
  const r=await timedFetch(u.href,{headers:{'User-Agent':USER_AGENT,'Icy-MetaData':'1','Accept':'*/*','Connection':'close'}},5000);
  if(!r.ok) return {available:false,reason:`stream-http-${r.status}`};
  const metaInt=Number(r.headers.get('icy-metaint'));
  if(!Number.isFinite(metaInt)||metaInt<=0||metaInt>1024*1024) return {available:false,reason:'no-icy-metadata'};
  if(!r.body) return {available:false,reason:'no-body'};
  const reader=r.body.getReader();
  const maxBytes=Math.min(metaInt+4097,1024*1024+4097);
  let total=0; const chunks=[];
  while(total<maxBytes){
    const {done,value}=await reader.read();
    if(done) break;
    if(value?.length){chunks.push(value);total+=value.length;}
    if(total>=metaInt+1){
      const merged=new Uint8Array(total);let off=0;for(const c of chunks){merged.set(c,off);off+=c.length;}
      const length=merged[metaInt]*16;
      if(length===0) return {available:false,reason:'empty-metadata'};
      if(total>=metaInt+1+length){
        const bytes=merged.slice(metaInt+1,metaInt+1+length);
        let metadata=new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\0+$/,'');
        if(metadata.includes('�')) metadata=new TextDecoder('latin1',{fatal:false}).decode(bytes).replace(/\0+$/,'');
        const match=metadata.match(/StreamTitle='(.*?)';/is)||metadata.match(/StreamTitle="(.*?)";/is);
        return match?.[1]?resultFromTitle(match[1],'icy'):{available:false,reason:'empty-title'};
      }
    }
  }
  return {available:false,reason:'metadata-timeout'};
}
function flattenSources(source){
  if(!source) return [];
  return Array.isArray(source)?source:[source];
}
async function readIcecastStatus(streamUrl){
  const u=await assertPublicUrl(streamUrl);
  const statusUrl=new URL('/status-json.xsl',u.origin);
  await assertPublicUrl(statusUrl.href);
  const r=await timedFetch(statusUrl.href,{headers:{'User-Agent':USER_AGENT,Accept:'application/json,text/plain,*/*'}},3500);
  if(!r.ok) return {available:false,reason:'icecast-status-http'};
  const data=await r.json();
  const sources=flattenSources(data?.icestats?.source);
  if(!sources.length) return {available:false,reason:'icecast-no-source'};
  const path=u.pathname.replace(/\/$/,'');
  const matched=sources.find(s=>String(s?.listenurl||'').includes(path))||sources[0];
  const title=matched?.title||matched?.yp_currently_playing||'';
  return title?resultFromTitle(title,'icecast-status'):{available:false,reason:'icecast-no-title'};
}
async function readShoutcast(streamUrl){
  const u=await assertPublicUrl(streamUrl);
  const candidates=[
    new URL('/currentsong?sid=1',u.origin),
    new URL('/7.html',u.origin)
  ];
  for(const c of candidates){
    try{
      await assertPublicUrl(c.href);
      const r=await timedFetch(c.href,{headers:{'User-Agent':USER_AGENT,Accept:'text/plain,text/html,*/*'}},3000);
      if(!r.ok) continue;
      const t=(await r.text()).trim();
      if(!t) continue;
      if(c.pathname==='/7.html'){
        const parts=t.split(',');
        const maybe=parts.slice(6).join(',').replace(/<[^>]+>/g,'').trim();
        if(maybe) return resultFromTitle(maybe,'shoutcast-status');
      }else{
        const clean=t.replace(/<[^>]+>/g,'').trim();
        if(clean&&clean.length<300) return resultFromTitle(clean,'shoutcast-status');
      }
    }catch{}
  }
  return {available:false,reason:'shoutcast-no-title'};
}
async function firstMetadata(stream){
  const attempts=[readIcy(stream),readIcecastStatus(stream),readShoutcast(stream)];
  return await new Promise(resolve=>{
    let pending=attempts.length; let best=null;
    attempts.forEach(p=>Promise.resolve(p).then(v=>{
      if(v?.available) return resolve(v);
      best=best||v;
      pending--; if(pending===0) resolve(best||{available:false,reason:'no-metadata'});
    }).catch(()=>{pending--;if(pending===0)resolve(best||{available:false,reason:'no-metadata'});}));
  });
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
    const metadata=await firstMetadata(stream);
    return json(res,200,{ok:true,stationName:station.name||'',stationuuid:uuid,...metadata,checkedAt:new Date().toISOString()});
  }catch{
    return json(res,200,{ok:true,available:false,reason:'metadata-unavailable',stationName:station.name||'',checkedAt:new Date().toISOString()});
  }
}