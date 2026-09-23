const FEEDS=[
  {url:'https://www.futuro.cl/feed/',fallback:'Futuro Chile'},
  {url:'https://news.google.com/rss/search?q=rock%20metal%20conciertos%20Chile%20when%3A14d&hl=es-419&gl=CL&ceid=CL%3Aes-419',fallback:'Google News'},
  {url:'https://news.google.com/rss/search?q=%28Metallica%20OR%20%22Iron%20Maiden%22%20OR%20AC%2FDC%20OR%20%22Black%20Sabbath%22%20OR%20%22Guns%20N%20Roses%22%20OR%20%22Pink%20Floyd%22%20OR%20Queen%29%20%28album%20OR%20single%20OR%20tour%20OR%20concierto%29%20when%3A14d&hl=es-419&gl=CL&ceid=CL%3Aes-419',fallback:'Google News'}
];
const UA='RC-Rock-Radio/14.0 (+https://rc-rock-radio.vercel.app)';

function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
  res.end(JSON.stringify(body));
}
function entity(s=''){
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}
function strip(s=''){
  return entity(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function tag(xml,name){
  const escName=name.replace(':','\\:');
  const m=xml.match(new RegExp('<'+escName+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+escName+'>','i'));
  return m?entity(m[1]).trim():'';
}
function attr(xml,tagName,attrName){
  const escName=tagName.replace(':','\\:');
  const re=new RegExp('<'+escName+'\\b[^>]*\\b'+attrName+'=["\\\']([^"\\\']+)["\\\'][^>]*>','i');
  return entity((xml.match(re)||[])[1]||'');
}
function firstImage(item){
  const html=tag(item,'content:encoded')||tag(item,'description');
  const m=html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return attr(item,'media:content','url')||attr(item,'media:thumbnail','url')||attr(item,'enclosure','url')||entity(m&&m[1]||'');
}
function parseFeed(xml,fallback){
  const items=xml.match(/<item\b[\s\S]*?<\/item>/gi)||[];
  return items.map(item=>{
    let title=strip(tag(item,'title'));
    const source=strip(tag(item,'source'))||fallback;
    if(source==='Google News' && /\s-\s[^-]+$/.test(title)) title=title.replace(/\s-\s[^-]+$/,'').trim();
    const desc=strip(tag(item,'description')||tag(item,'content:encoded'));
    return {title,url:strip(tag(item,'link')),date:strip(tag(item,'pubDate')||tag(item,'dc:date')),source,summary:desc.slice(0,240),image:firstImage(item)};
  }).filter(x=>x.title&&/^https?:\/\//i.test(x.url));
}
async function fetchFeed(feed){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(feed.url,{signal:ctrl.signal,headers:{'User-Agent':UA,Accept:'application/rss+xml,application/xml,text/xml,*/*'}});
    if(!r.ok) return [];
    return parseFeed(await r.text(),feed.fallback);
  }catch{return [];}finally{clearTimeout(timer);}
}
function score(item){
  const t=(item.title+' '+item.summary).toLowerCase();
  let s=0;
  ['chile','santiago','concierto','show','gira','tour','festival'].forEach(k=>{if(t.includes(k))s+=3});
  ['metallica','iron maiden','ac/dc','black sabbath','ozzy','guns n','pink floyd','queen','nirvana','slayer','sepultura','helloween','dream theater','judas priest'].forEach(k=>{if(t.includes(k))s+=2});
  ['álbum','album','single','estrena','lanzamiento','nuevo disco'].forEach(k=>{if(t.includes(k))s+=2});
  if(item.source.toLowerCase().includes('futuro')) s+=2;
  return s;
}
export default async function handler(req,res){
  if(req.method!=='GET') return send(res,405,{ok:false,items:[]});
  const groups=await Promise.all(FEEDS.map(fetchFeed));
  const seen=new Set();
  const items=groups.flat().filter(x=>{
    const key=x.title.toLowerCase().replace(/\W+/g,' ').trim();
    if(!key||seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>{
    const sd=score(b)-score(a);
    if(sd) return sd;
    return (Date.parse(b.date)||0)-(Date.parse(a.date)||0);
  }).slice(0,12);
  return send(res,200,{ok:true,updatedAt:new Date().toISOString(),items});
}