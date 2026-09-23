const API_SEEDS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info'
];

const GENRES = [
  { id:'rock', label:'Rock', tag:'rock', icon:'🎸', desc:'Clásico · Hard · Alternativo', bg:'radial-gradient(circle at 70% 20%,#ff4555 0,transparent 28%),linear-gradient(140deg,#4a0711,#160b10 62%,#090a0d)' },
  { id:'metal', label:'Metal', tag:'metal', icon:'🤘', desc:'Heavy · Thrash · Symphonic', bg:'radial-gradient(circle at 70% 10%,#f8f8f8 0,transparent 17%),linear-gradient(135deg,#4b4c52,#111218 55%,#09090b)' },
  { id:'progressive', label:'Progresivo', tag:'progressive', icon:'△', desc:'Prog Rock · Prog Metal', bg:'radial-gradient(circle at 50% 40%,#00c8ff 0,transparent 20%),radial-gradient(circle at 70% 20%,#835cff 0,transparent 28%),linear-gradient(140deg,#081532,#07080d)' },
  { id:'grunge', label:'Grunge', tag:'grunge', icon:'☹', desc:'90s · Alternative · Raw', bg:'radial-gradient(circle at 65% 25%,#ffb020 0,transparent 28%),linear-gradient(140deg,#4b2d02,#12100b 60%,#09090b)' },
  { id:'power-metal', label:'Power Metal', tag:'power metal', icon:'⚔', desc:'Epic · Melodic · Symphonic', bg:'radial-gradient(circle at 60% 20%,#ff732e 0,transparent 25%),linear-gradient(140deg,#512006,#15100a 65%,#09090b)' },
  { id:'blues', label:'Blues', tag:'blues', icon:'♩', desc:'Electric · Blues Rock', bg:'radial-gradient(circle at 70% 18%,#00d2ff 0,transparent 24%),linear-gradient(140deg,#06324a,#0c141a 60%,#09090b)' },
  { id:'jazz', label:'Jazz', tag:'jazz', icon:'🎷', desc:'Jazz · Fusion · Smooth', bg:'radial-gradient(circle at 75% 10%,#9e5cff 0,transparent 28%),linear-gradient(140deg,#211041,#10101a 62%,#09090b)' },
  { id:'hard-rock', label:'Hard Rock', tag:'hard rock', icon:'⚡', desc:'Riffs · Guitarras · Energía', bg:'radial-gradient(circle at 65% 15%,#ff3347 0,transparent 25%),linear-gradient(140deg,#3a080e,#111217)' },
  { id:'classic-rock', label:'Classic Rock', tag:'classic rock', icon:'◉', desc:'60s · 70s · 80s', bg:'radial-gradient(circle at 65% 15%,#ffb020 0,transparent 25%),linear-gradient(140deg,#3d2104,#111217)' },
  { id:'psychedelic', label:'Psychedelic', tag:'psychedelic rock', icon:'✦', desc:'Space · Psych · Stoner', bg:'radial-gradient(circle at 25% 20%,#ff3bba 0,transparent 22%),radial-gradient(circle at 75% 75%,#00c8ff 0,transparent 22%),linear-gradient(140deg,#20103d,#101116)' }
];


const BANDS = [
  {id:'iron-maiden',name:'Iron Maiden',query:'iron maiden',mono:'IM',desc:'Heavy Metal · NWOBHM',bg:'linear-gradient(135deg,#4a090d,#16131a 58%,#281052)'},
  {id:'metallica',name:'Metallica',query:'metallica',mono:'M',desc:'Thrash · Heavy Metal',bg:'linear-gradient(135deg,#3b3d42,#121318 58%,#281010)'},
  {id:'acdc',name:'AC/DC',query:'acdc',mono:'AC',desc:'Hard Rock · Classic',bg:'linear-gradient(135deg,#7a1018,#211014 58%,#09090b)'},
  {id:'black-sabbath',name:'Black Sabbath',query:'black sabbath',mono:'BS',desc:'Heavy · Doom · Classic',bg:'linear-gradient(135deg,#221438,#0d1116 58%,#132d26)'},
  {id:'guns-n-roses',name:"Guns N' Roses",query:'guns n roses',mono:'GNR',desc:'Hard Rock · 80s/90s',bg:'linear-gradient(135deg,#5b1510,#2a190c 58%,#09090b)'},
  {id:'ozzy',name:'Ozzy Osbourne',query:'ozzy osbourne',mono:'OZ',desc:'Heavy Metal · Classic',bg:'linear-gradient(135deg,#38115c,#17101d 58%,#06070a)'},
  {id:'pink-floyd',name:'Pink Floyd',query:'pink floyd',mono:'PF',desc:'Progressive · Psychedelic',bg:'linear-gradient(135deg,#4b163c,#101c35 58%,#06333a)'},
  {id:'led-zeppelin',name:'Led Zeppelin',query:'led zeppelin',mono:'LZ',desc:'Classic · Hard Rock',bg:'linear-gradient(135deg,#56330a,#1a1510 58%,#15151b)'},
  {id:'queen',name:'Queen',query:'queen',mono:'Q',desc:'Classic Rock · Arena',bg:'linear-gradient(135deg,#51183c,#1d1027 58%,#291a06)'},
  {id:'nirvana',name:'Nirvana',query:'nirvana',mono:'N',desc:'Grunge · Alternative',bg:'linear-gradient(135deg,#5d4b04,#211d0b 58%,#101114)'},
  {id:'dream-theater',name:'Dream Theater',query:'dream theater',mono:'DT',desc:'Progressive Metal',bg:'linear-gradient(135deg,#18336a,#141328 58%,#30144d)'},
  {id:'judas-priest',name:'Judas Priest',query:'judas priest',mono:'JP',desc:'Heavy Metal · NWOBHM',bg:'linear-gradient(135deg,#5a0b18,#211016 58%,#191a20)'}
];


const THEMES=['red','blue','green','orange','purple'];

function formatCommunityCount(v){
  const n=Math.max(0,Number(v)||0);
  return new Intl.NumberFormat('es-CL',{notation:n>=10000?'compact':'standard',maximumFractionDigits:1}).format(n);
}
function getCommunityUserId(){
  let id=localStorage.getItem('rc_community_uid');
  if(!id){
    const rnd=(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-zA-Z0-9_-]/g,'');
    id='rc_'+rnd.slice(0,64);
    localStorage.setItem('rc_community_uid',id);
  }
  return id;
}
async function communityRequest(type,mode='get'){
  const uid=getCommunityUserId();
  const url=`/api/community?type=${encodeURIComponent(type)}&mode=${encodeURIComponent(mode)}&uid=${encodeURIComponent(uid)}&_=${Date.now()}`;
  const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json','Cache-Control':'no-cache'}});
  if(!r.ok) throw new Error(`community-${r.status}`);
  const data=await r.json();
  if(!data?.ok || !Number.isFinite(Number(data.value))) throw new Error('community-invalid');
  return Number(data.value);
}
async function initCommunityStats(){
  const visitEl=$('#visitCount'), likeEl=$('#likeCount'), likeBtn=$('#likeBtn');
  const visitMode=localStorage.getItem('rc_visit_counted_v2')==='1'?'get':'inc';
  try{
    const value=await communityRequest('visit',visitMode);
    if(visitMode==='inc') localStorage.setItem('rc_visit_counted_v2','1');
    if(visitEl) visitEl.textContent=formatCommunityCount(value);
  }catch{
    if(visitEl) visitEl.textContent='—';
  }
  try{
    const value=await communityRequest('like','get');
    if(likeEl) likeEl.textContent=formatCommunityCount(value);
  }catch{
    if(likeEl) likeEl.textContent='—';
  }
  const liked=localStorage.getItem('rc_like_given')==='1';
  if(likeBtn){
    likeBtn.classList.toggle('liked',liked);
    likeBtn.setAttribute('aria-pressed',liked?'true':'false');
  }
}
async function giveLike(){
  const btn=$('#likeBtn'), count=$('#likeCount');
  if(localStorage.getItem('rc_like_given')==='1'){
    toast('Ya dejaste tu Me gusta 🤘');
    return;
  }
  if(btn) btn.disabled=true;
  try{
    const value=await communityRequest('like','inc');
    localStorage.setItem('rc_like_given','1');
    if(count) count.textContent=formatCommunityCount(value);
    if(btn){btn.classList.add('liked');btn.setAttribute('aria-pressed','true');}
    toast('¡Gracias por apoyar RC Rock Radio! 🤘');
  }catch{
    toast('No pudimos registrar el Me gusta en este momento.');
  }finally{
    if(btn) btn.disabled=false;
  }
}
function applyTheme(theme,{save=true}={}){
  const selected=THEMES.includes(theme)?theme:'orange';
  document.documentElement.dataset.theme=selected;
  const picker=$('#themeSelect'); if(picker) picker.value=selected;
  if(save) localStorage.setItem('rc_theme',selected);
}
function initTheme(){
  applyTheme(localStorage.getItem('rc_theme')||'orange',{save:false});
}

const MUSIC_TOKENS = ['rock','metal','grunge','blues','jazz','progressive','prog','psychedelic','stoner','alternative','hard rock','classic rock','fusion'];

const state = {
  apiBase: API_SEEDS[0],
  currentGenre: GENRES[0],
  currentBand: null,
  bandStations: [],
  currentStations: [],
  mapStations: [],
  countries: [],
  country: '',
  sort: 'clickcount',
  activeStation: null,
  isPlaying: false,
  view: 'home',
  favorites: readStore('rc_favorites', []),
  recent: readStore('rc_recent', []),
  mapSignature: '',
  nowPlaying: null,
  nowPlayingStatus: 'idle',
  isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const audio = $('#audio');
let deferredPrompt = null;
let toastTimer = null;
let sleepTimeout = null;
let nowPlayingTimer = null;
let nowPlayingInterval = null;
let nowPlayingAbort = null;
let nowPlayingStationKey = '';
let nowPlayingMisses = 0;
let nowPlayingRequestInFlight = false;
const NOW_PLAYING_INTERVAL = 15000;

function readStore(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeStore(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function esc(v=''){ return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800); }
function flag(code=''){ if(!code || code.length!==2) return '🌎'; return String.fromCodePoint(...code.toUpperCase().split('').map(c=>127397+c.charCodeAt())); }
function stationKey(s){ return s?.stationuuid || s?.url_resolved || s?.url || ''; }
function streamUrl(s){ return (s?.url_resolved||s?.url||'').trim(); }
function isSecureStream(s){ return /^https:\/\//i.test(streamUrl(s)); }
function mobileCompatible(list){
  const unique=uniqueStations(list);
  if(location.protocol!=='https:') return unique;
  return unique.filter(isSecureStream);
}
function isFavorite(s){ if(!s) return false; const key=stationKey(s); return state.favorites.some(x=>stationKey(x)===key); }
function qualityText(s){ const codec=(s?.codec||'AUDIO').toUpperCase(); const br=Number(s?.bitrate)||0; return `${codec}${br ? ` · ${br} kbps` : ''}`; }
function coverGradient(s){
  const text=(s?.tags||s?.name||'').toLowerCase();
  if(text.includes('jazz')) return 'linear-gradient(135deg,#28104d,#071b3c)';
  if(text.includes('blues')) return 'linear-gradient(135deg,#053958,#07131b)';
  if(text.includes('progress')||text.includes('prog')) return 'linear-gradient(135deg,#28115f,#042d4d)';
  if(text.includes('grunge')) return 'linear-gradient(135deg,#493000,#15110a)';
  if(text.includes('metal')) return 'linear-gradient(135deg,#4a1219,#101116)';
  return 'linear-gradient(135deg,#4a0812,#131425)';
}
function initials(name='RC'){ return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'RC'; }
function safeExternalUrl(value=''){ try{ const u=new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; }catch{return '';} }
function uniqueStations(list){ return (list||[]).filter(s=>s&&(s.url_resolved||s.url)).filter((s,i,a)=>a.findIndex(x=>stationKey(x)===stationKey(s))===i); }
function matchesMusicProfile(s){ const tags=(s?.tags||'').toLowerCase(); if(!tags) return true; return MUSIC_TOKENS.some(t=>tags.includes(t)); }
function formatNumber(value){ return new Intl.NumberFormat('es-CL',{notation:Number(value)>=10000?'compact':'standard',maximumFractionDigits:1}).format(Number(value)||0); }

async function fetchJSON(path){
  let lastErr;
  const bases=[state.apiBase,...API_SEEDS.filter(x=>x!==state.apiBase)];
  for(const base of bases){
    try{
      const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),10000);
      const response=await fetch(base+path,{signal:ctrl.signal,headers:{Accept:'application/json'}}); clearTimeout(timer);
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json(); state.apiBase=base; return data;
    }catch(e){ lastErr=e; }
  }
  throw lastErr || new Error('No se pudo conectar');
}

async function discoverMirrors(){
  try{
    const servers=await fetchJSON('/json/servers');
    [...new Set((servers||[]).map(s=>s.name).filter(Boolean).map(n=>`https://${n}`))].forEach(u=>{ if(!API_SEEDS.includes(u)) API_SEEDS.push(u); });
  }catch{}
}

function renderBands(){
  const card=b=>`<button class="band-card ${state.currentBand?.id===b.id?'active':''}" data-band="${b.id}" style="--band-bg:${b.bg}"><span class="band-monogram">${esc(b.mono)}</span><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small><span class="band-live">BUSCAR RADIOS →</span></button>`;
  const all=BANDS.map(card).join('');
  if($('#bandGrid')) $('#bandGrid').innerHTML=all;
  if($('#homeBandGrid')) $('#homeBandGrid').innerHTML=BANDS.slice(0,6).map(card).join('');
}
async function loadBandStations(bandId){
  const band=BANDS.find(b=>b.id===bandId)||BANDS[0];
  state.currentBand=band;
  renderBands();
  switchView('bands');
  $('#bandStationsTitle').textContent=`${band.name} en vivo`;
  $('#bandResultCopy').textContent=`Buscando emisoras dedicadas o relacionadas con ${band.name}…`;
  $('#bandStatus').className='status-pill';
  $('#bandStatus').innerHTML='<span></span> buscando';
  skeletons($('#bandStations'),8);
  try{
    const base={hidebroken:'true',limit:'60',order:'clickcount',reverse:'true'};
    const [byName,byTag]=await Promise.all([
      fetchJSON(`/json/stations/search?${new URLSearchParams({...base,name:band.query})}`).catch(()=>[]),
      fetchJSON(`/json/stations/search?${new URLSearchParams({...base,tag:band.query})}`).catch(()=>[])
    ]);
    let stations=mobileCompatible([...byName,...byTag]);
    stations=uniqueStations(stations).sort((a,b)=>(Number(b.clickcount)||0)-(Number(a.clickcount)||0));
    state.bandStations=stations;
    state.currentStations=stations.length?stations:state.currentStations;
    renderStations($('#bandStations'),stations.slice(0,28));
    $('#bandStatus').className='status-pill online';
    $('#bandStatus').innerHTML=`<span></span> ${stations.length} radios`;
    $('#bandResultCopy').textContent=stations.length
      ? `Emisoras encontradas para ${band.name}. Algunas son dedicadas y otras incluyen programación centrada en la banda.`
      : `No encontramos una emisora compatible de ${band.name} en este momento. Prueba otra banda.`;
  }catch{
    state.bandStations=[];
    renderStations($('#bandStations'),[]);
    $('#bandStatus').className='status-pill error';
    $('#bandStatus').innerHTML='<span></span> sin conexión';
    $('#bandResultCopy').textContent='No fue posible consultar las radios de esta banda.';
  }
}

function renderGenres(){
  $('#genreGrid').innerHTML=GENRES.slice(0,7).map(g=>`<button class="genre-card" data-genre="${g.id}" style="--genre-bg:${g.bg}"><span class="genre-icon">${esc(g.icon)}</span><span class="lines"></span><strong>${esc(g.label)}</strong><small>${esc(g.desc)}</small></button>`).join('');
  $('#quickChips').innerHTML=GENRES.slice(0,7).map(g=>`<button type="button" class="chip ${g.id==='rock'?'active':''}" data-genre="${g.id}">${esc(g.label)}</button>`).join('');
  $('#filterRow').innerHTML=GENRES.map(g=>`<button type="button" class="chip ${g.id==='rock'?'active':''}" data-genre="${g.id}">${esc(g.label)}</button>`).join('');
}
function renderVisualizer(){ $('#bigVisualizer').innerHTML=Array.from({length:34},()=>'<i></i>').join(''); }
function skeletons(container,count=8){ container.innerHTML=Array.from({length:count},()=>'<div class="skeleton"></div>').join(''); }
function setApiStatus(type,text){ const el=$('#apiStatus'); el.className=`status-pill ${type||''}`; el.innerHTML=`<span></span> ${esc(text)}`; }

function stationCard(s){
  const fav=isFavorite(s); const key=esc(stationKey(s));
  const art=s.favicon && /^https?:\/\//i.test(s.favicon) ? `<img src="${esc(s.favicon)}" alt="" loading="lazy" onerror="this.remove()">` : `<div class="station-art-fallback">${esc(initials(s.name))}</div>`;
  const tags=(s.tags||state.currentGenre.label||'Rock').split(',').slice(0,3).join(' · ');
  return `<article class="station-card ${state.activeStation && stationKey(state.activeStation)===stationKey(s)?'playing':''}" data-key="${key}">
    <div class="station-art" style="--station-bg:${coverGradient(s)}">${art}<span class="station-live"><i></i> EN VIVO</span><button class="station-play" data-play="${key}" aria-label="Reproducir ${esc(s.name)}">▶</button></div>
    <div class="station-body"><div class="station-name-row"><div class="station-name" title="${esc(s.name)}">${esc(s.name||'Radio sin nombre')}</div></div>
    <div class="station-country">${flag(s.countrycode)} ${esc(s.country||'Mundo')} ${s.language?`· ${esc(s.language.split(',')[0])}`:''}</div>
    <div class="station-tags">${esc(tags||'rock')}</div>
    <div class="station-bottom"><span class="station-quality"><b>${esc(qualityText(s))}</b> · ${formatNumber(s.clickcount)} plays</span><button class="heart-mini ${fav?'active':''}" data-fav="${key}" aria-label="Favorito">${fav?'♥':'♡'}</button></div></div>
  </article>`;
}
function renderStations(container,stations){ container.innerHTML=stations.length?stations.map(stationCard).join(''):'<div class="empty-state" style="grid-column:1/-1"><div>📻</div><h3>No encontramos radios</h3><p>Prueba otro género, país o término de búsqueda.</p></div>'; }
function findStation(key){ return [...state.currentStations,...state.mapStations,...state.favorites,...state.recent].find(s=>stationKey(s)===key); }

function renderRanking(){
  const list=[...state.currentStations].sort((a,b)=>(Number(b.clickcount)||0)-(Number(a.clickcount)||0)).slice(0,10);
  $('#rankingList').innerHTML=list.length?list.map((s,i)=>`<div class="rank-row"><div class="rank-number">${String(i+1).padStart(2,'0')}</div><div class="rank-copy"><b>${esc(s.name||'Radio')}</b><span>${flag(s.countrycode)} ${esc(s.country||'Mundo')} · ${esc((s.tags||state.currentGenre.label).split(',').slice(0,2).join(' · '))}</span></div><div class="rank-score">${formatNumber(s.clickcount)}<br>24 h</div><button class="rank-play" data-play="${esc(stationKey(s))}" aria-label="Reproducir">▶</button></div>`).join(''):'<div class="empty-state"><div>⚡</div><h3>Sin ranking disponible</h3></div>';
}

function stationQuery({limit=48,order=state.sort}={}){
  const params={tag:state.currentGenre.tag,hidebroken:'true',limit:String(limit),order,reverse:order==='name'?'false':'true'};
  if(state.country) params.country=state.country;
  return new URLSearchParams(params);
}

async function loadGenre(genreId,{target='both'}={}){
  const genre=GENRES.find(g=>g.id===genreId)||GENRES[0]; state.currentGenre=genre; state.mapSignature='';
  $$('.chip[data-genre]').forEach(b=>b.classList.toggle('active',b.dataset.genre===genre.id));
  $('#stationsTitle').textContent=`${genre.label} en vivo`; $('#mapGenreLabel').textContent=genre.label;
  if(target==='both'||target==='home') skeletons($('#featuredStations'),8);
  if(target==='both'||target==='explore') skeletons($('#exploreStations'),12);
  setApiStatus('', 'conectando');
  try{
    let stations=mobileCompatible(await fetchJSON(`/json/stations/search?${stationQuery({limit:84})}`));
    state.currentStations=stations;
    if(target==='both'||target==='home') renderStations($('#featuredStations'),stations.slice(0,8));
    if(target==='both'||target==='explore') renderStations($('#exploreStations'),stations.slice(0,28));
    renderRanking(); setApiStatus('online',`${stations.length} radios`);
    if(state.view==='map') loadMapStations();
  }catch{
    state.currentStations=[];
    if(target==='both'||target==='home') renderStations($('#featuredStations'),[]);
    if(target==='both'||target==='explore') renderStations($('#exploreStations'),[]);
    renderRanking(); setApiStatus('error','sin conexión'); toast('No fue posible cargar las radios. Revisa tu conexión a internet.');
  }
}

async function searchStations(term){
  const clean=term.trim(); if(!clean) return loadGenre(state.currentGenre.id,{target:'explore'});
  switchView('explore'); skeletons($('#exploreStations'),12); setApiStatus('', 'buscando');
  try{
    const base={hidebroken:'true',limit:'50',order:'clickcount',reverse:'true'};
    const [byName,byTag,byCountry]=await Promise.all([
      fetchJSON(`/json/stations/search?${new URLSearchParams({...base,name:clean})}`).catch(()=>[]),
      fetchJSON(`/json/stations/search?${new URLSearchParams({...base,tag:clean})}`).catch(()=>[]),
      fetchJSON(`/json/stations/search?${new URLSearchParams({...base,country:clean})}`).catch(()=>[])
    ]);
    const uniq=mobileCompatible([...byName,...byTag,...byCountry]).filter(matchesMusicProfile);
    state.currentStations=uniq; renderStations($('#exploreStations'),uniq.slice(0,32)); renderRanking(); setApiStatus('online',`${uniq.length} resultados`);
  }catch{ renderStations($('#exploreStations'),[]); setApiStatus('error','error de búsqueda'); }
}

async function loadCountries(){
  try{
    state.countries=(await fetchJSON('/json/countries?hidebroken=true&order=stationcount&reverse=true&limit=140'))||[];
    const options='<option value="">Todos los países</option>'+state.countries.map(c=>`<option value="${esc(c.name)}">${esc(c.name)} (${formatNumber(c.stationcount)})</option>`).join('');
    $('#countrySelect').innerHTML=options; $('#mapCountrySelect').innerHTML=options;
  }catch{}
}
function syncCountrySelects(){ $('#countrySelect').value=state.country; $('#mapCountrySelect').value=state.country; }

function clearNowPlayingMonitor(){
  clearTimeout(nowPlayingTimer); nowPlayingTimer=null;
  clearInterval(nowPlayingInterval); nowPlayingInterval=null;
  if(nowPlayingAbort){ try{ nowPlayingAbort.abort(); }catch{} nowPlayingAbort=null; }
  nowPlayingStationKey=''; nowPlayingMisses=0; nowPlayingRequestInFlight=false;
}
function resetNowPlaying(s){
  state.nowPlaying=null; state.nowPlayingStatus=s?'checking':'idle';
  updateNowPlayingUI();
}
function nowPlayingText(){
  const np=state.nowPlaying;
  if(!np) return '';
  if(np.artist && np.song) return `${np.artist} — ${np.song}`;
  return np.streamTitle || np.song || '';
}
function updateNowPlayingUI(){
  const s=state.activeStation;
  const text=nowPlayingText();
  const inline=$('#playerNowPlaying');
  const sheet=$('#sheetNowPlaying');
  const status=$('#sheetNowPlayingStatus');
  if(!s){
    if(inline) inline.textContent='';
    if(sheet) sheet.textContent='Selecciona una radio';
    if(status) status.textContent='';
    return;
  }
  if(text){
    inline.textContent=`♫ ${text}`; inline.classList.add('detected');
    sheet.textContent=text;
    status.textContent='Detectado automáticamente desde los metadatos de la emisora.';
    $('#playerName').textContent=`${s.name||'Radio'} · ${text}`;
  }else{
    inline.classList.remove('detected');
    $('#playerName').textContent=s.name||'Radio';
    if(state.nowPlayingStatus==='checking'){
      inline.textContent='♫ Detectando canción…';
      sheet.textContent='Detectando canción y artista…';
      status.textContent='Consultando los metadatos del stream.';
    }else if(state.nowPlayingStatus==='unavailable'){
      inline.textContent='♫ Título no informado';
      sheet.textContent='Título no informado por la radio';
      status.textContent='Esta emisora no está enviando artista y canción en su stream.';
    }else{
      inline.textContent='♫ Esperando canción…';
      sheet.textContent='Esperando información de la emisora…';
      status.textContent='La app consultará los metadatos del stream.';
    }
  }
}
async function requestNowPlaying(s){
  if(!s?.stationuuid || !state.activeStation || stationKey(state.activeStation)!==stationKey(s)) return null;
  if(nowPlayingAbort){ try{ nowPlayingAbort.abort(); }catch{} }
  nowPlayingAbort=new AbortController();
  try{
    const r=await fetch(`/api/now-playing?uuid=${encodeURIComponent(s.stationuuid)}&_=${Date.now()}`,{cache:'no-store',signal:nowPlayingAbort.signal,headers:{Accept:'application/json','Cache-Control':'no-cache'}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }catch(e){
    if(e?.name==='AbortError') return null;
    return {ok:false,available:false,reason:'request-failed'};
  }
}
async function refreshNowPlaying(s){
  const key=stationKey(s);
  if(!s || !state.activeStation || stationKey(state.activeStation)!==key || audio.paused || nowPlayingRequestInFlight) return;
  nowPlayingStationKey=key;
  nowPlayingRequestInFlight=true;
  if(!state.nowPlaying) state.nowPlayingStatus='checking';
  updateNowPlayingUI();
  try{
    const data=await requestNowPlaying(s);
    if(!data || !state.activeStation || stationKey(state.activeStation)!==key) return;
    if(data.available && data.streamTitle){
      const old=nowPlayingText();
      state.nowPlaying={streamTitle:data.streamTitle,artist:data.artist||'',song:data.song||''};
      state.nowPlayingStatus='available';
      nowPlayingMisses=0;
      updateNowPlayingUI();
      updateMediaSession(s);
      const current=nowPlayingText();
      if(current && old && current!==old) toast(`Ahora suena: ${current}`);
    }else{
      nowPlayingMisses++;
      if(!state.nowPlaying && nowPlayingMisses>=2){
        state.nowPlayingStatus='unavailable';
        updateNowPlayingUI();
        updateMediaSession(s);
      }
    }
  }finally{
    nowPlayingRequestInFlight=false;
  }
}
function startNowPlayingMonitor(s){
  clearNowPlayingMonitor();
  resetNowPlaying(s);
  if(!s?.stationuuid){ state.nowPlayingStatus='unavailable'; updateNowPlayingUI(); return; }
  const run=()=>{ if(state.activeStation && stationKey(state.activeStation)===stationKey(s) && !audio.paused) refreshNowPlaying(s); };
  setTimeout(run,200);
  nowPlayingInterval=setInterval(run,NOW_PLAYING_INTERVAL);
}

async function playStation(s){
  if(!s) return;
  const url=streamUrl(s); if(!url){ toast('Esta radio no tiene un stream disponible.'); return; }
  if(location.protocol==='https:' && !isSecureStream(s)){ toast('Esta emisora usa un stream antiguo HTTP y el teléfono puede bloquearlo. Prueba otra radio.'); return; }
  clearNowPlayingMonitor(); state.activeStation=s; audio.src=url; audio.volume=Number($('#volume').value); resetNowPlaying(s); updatePlayerUI(); renderAllActiveCards();
  try{ await audio.play(); state.isPlaying=true; updatePlayerButton(); addRecent(s); countClick(s); updateMediaSession(s); startNowPlayingMonitor(s); }
  catch{ state.isPlaying=false; updatePlayerButton(); toast('No se pudo reproducir este stream. Prueba otra radio.'); }
}
function togglePlay(){
  if(!state.activeStation){ const first=state.currentStations[0]; if(first) playStation(first); else toast('Selecciona una radio primero.'); return; }
  if(audio.paused) audio.play().then(()=>{state.isPlaying=true;updatePlayerButton();startNowPlayingMonitor(state.activeStation);}).catch(()=>toast('No se pudo reanudar la radio.'));
  else { audio.pause(); state.isPlaying=false; updatePlayerButton(); clearNowPlayingMonitor(); }
}
function updatePlayerButton(){
  const icon=state.isPlaying?'Ⅱ':'▶'; $('#playBtn').textContent=icon; $('#sheetPlay').textContent=icon;
  $('#playerMiniViz').classList.toggle('is-playing',state.isPlaying); $('#bigVisualizer').classList.toggle('is-playing',state.isPlaying);
}
function updatePlayerUI(){
  const s=state.activeStation; if(!s) return;
  const npText=nowPlayingText(); $('#playerName').textContent=npText ? `${s.name||'Radio'} · ${npText}` : (s.name||'Radio'); $('#playerDetails').textContent=`${flag(s.countrycode)} ${s.country||'Mundo'} · ${qualityText(s)}`;
  const art=$('#playerArt'); art.innerHTML=s.favicon&&/^https?:\/\//i.test(s.favicon)?`<img src="${esc(s.favicon)}" alt="" onerror="this.parentNode.innerHTML='⚡'">`:'⚡';
  $('#playerFavorite').classList.toggle('active',isFavorite(s)); $('#playerFavorite').textContent=isFavorite(s)?'♥':'♡';
  $('#sheetName').textContent=s.name||'Radio'; $('#sheetCountry').textContent=`${flag(s.countrycode)} ${(s.country||'Mundo').toUpperCase()}`;
  $('#sheetTags').textContent=(s.tags||state.currentGenre.label||'Rock').split(',').slice(0,6).join(' · ');
  $('#sheetCodec').textContent=qualityText(s); $('#sheetPopularity').textContent=`${formatNumber(s.clickcount)} escuchas / 24 h`; $('#sheetVotes').textContent=`${formatNumber(s.votes)} votos`;
  $('#sheetFavorite').textContent=isFavorite(s)?'♥ Guardado':'♡ Favorito';
  const cover=$('#sheetCover'); cover.innerHTML=s.favicon&&/^https?:\/\//i.test(s.favicon)?`<img src="${esc(s.favicon)}" alt="Logo de ${esc(s.name)}" onerror="this.parentNode.innerHTML='⚡'">`:`<span>${esc(initials(s.name))}</span>`; cover.style.background=coverGradient(s);
  const site=safeExternalUrl(s.homepage); const link=$('#stationWebsite'); link.classList.toggle('hidden',!site); if(site) link.href=site;
  updateNowPlayingUI();
}
function renderAllActiveCards(){ $$('.station-card').forEach(c=>c.classList.toggle('playing',!!state.activeStation&&c.dataset.key===stationKey(state.activeStation))); }
function nextStation(dir){ if(!state.currentStations.length) return; const key=state.activeStation?stationKey(state.activeStation):''; let i=state.currentStations.findIndex(s=>stationKey(s)===key); i=(i+dir+state.currentStations.length)%state.currentStations.length; playStation(state.currentStations[i]); }
function randomStation(){ if(!state.currentStations.length){ toast('Espera a que carguen las radios.'); return; } playStation(state.currentStations[Math.floor(Math.random()*state.currentStations.length)]); }
async function countClick(s){ if(!s.stationuuid) return; try{ await fetch(`${state.apiBase}/json/url/${encodeURIComponent(s.stationuuid)}`); }catch{} }
function updateMediaSession(s){
  if(!('mediaSession' in navigator)) return;
  try{
    const np=state.nowPlaying;
    navigator.mediaSession.metadata=new MediaMetadata({title:(np?.song||np?.streamTitle||s.name||'RC Rock Radio'),artist:(np?.artist||s.name||`${s.country||'Radio global'} · ${state.currentGenre.label}`),album:np?'RC Rock Radio · En vivo':`${s.country||'Radio global'} · ${state.currentGenre.label}`,artwork:s.favicon?[{src:s.favicon}]:[]});
    navigator.mediaSession.setActionHandler('play',togglePlay); navigator.mediaSession.setActionHandler('pause',togglePlay); navigator.mediaSession.setActionHandler('previoustrack',()=>nextStation(-1)); navigator.mediaSession.setActionHandler('nexttrack',()=>nextStation(1));
  }catch{}
}

function toggleFavorite(s){
  if(!s) return; const key=stationKey(s); const i=state.favorites.findIndex(x=>stationKey(x)===key);
  if(i>=0){ state.favorites.splice(i,1); toast('Quitada de favoritos'); } else { state.favorites.unshift(s); state.favorites=state.favorites.slice(0,100); toast('Guardada en favoritos'); }
  writeStore('rc_favorites',state.favorites); renderFavorites(); updatePlayerUI(); refreshFavoriteButtons();
}
function refreshFavoriteButtons(){ $$('.heart-mini').forEach(b=>{const s=findStation(b.dataset.fav);const fav=s&&isFavorite(s);b.classList.toggle('active',fav);b.textContent=fav?'♥':'♡';}); }
function addRecent(s){ state.recent=[s,...state.recent.filter(x=>stationKey(x)!==stationKey(s))].slice(0,30); writeStore('rc_recent',state.recent); renderRecent(); }
function renderFavorites(){ renderStations($('#favoriteStations'),state.favorites); $('#favoriteEmpty').classList.toggle('hidden',state.favorites.length>0); }
function renderRecent(){ renderStations($('#recentStations'),state.recent); $('#recentEmpty').classList.toggle('hidden',state.recent.length>0); }

function projectPoint(lat,lon){
  const x=((Number(lon)+180)/360)*100;
  const y=((90-Number(lat))/180)*100;
  return {x:Math.max(1,Math.min(99,x)),y:Math.max(2,Math.min(98,y))};
}
async function loadMapStations(){
  const signature=`${state.currentGenre.id}|${state.country}`; $('#mapGenreLabel').textContent=state.currentGenre.label; $('#mapCount').textContent='Buscando radios geolocalizadas…';
  const map=$('#radioMap'); $('#mapFallback').classList.add('hidden'); map.classList.remove('hidden');
  try{
    let stations=mobileCompatible(await fetchJSON(`/json/stations/search?${stationQuery({limit:220,order:'clickcount'})}`));
    stations=stations.filter(s=>Number.isFinite(Number(s.geo_lat))&&Number.isFinite(Number(s.geo_long))&&Math.abs(Number(s.geo_lat))<=90&&Math.abs(Number(s.geo_long))<=180);
    state.mapStations=stations; state.mapSignature=signature;
    const pins=stations.slice(0,90).map(s=>{
      const p=projectPoint(s.geo_lat,s.geo_long);
      return `<button class="map-pin" style="left:${p.x.toFixed(3)}%;top:${p.y.toFixed(3)}%" data-play="${esc(stationKey(s))}" aria-label="Escuchar ${esc(s.name||'radio')}"><span class="map-tip"><b>${esc(s.name||'Radio')}</b>${flag(s.countrycode)} ${esc(s.country||'Mundo')} · ${esc(qualityText(s))}<br>Toca para escuchar</span></button>`;
    }).join('');
    map.innerHTML=`<div class="map-legend"><i></i> ${stations.length} señales disponibles</div>${pins}`;
    $('#mapCount').textContent=`${stations.length} radios con ubicación · ${state.country||'Todo el mundo'}`;
  }catch{
    map.innerHTML=''; $('#mapCount').textContent='No fue posible cargar las ubicaciones en este momento.'; $('#mapFallback').classList.remove('hidden');
  }
}

function openPlayerSheet(){ if(!state.activeStation){ toast('Selecciona una radio primero.'); return; } updatePlayerUI(); $('#playerSheet').classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closePlayerSheet(){ $('#playerSheet').classList.add('hidden'); document.body.style.overflow=''; }
async function shareStation(){
  const s=state.activeStation; if(!s) return;
  const shareData={title:s.name||'RC Rock Radio',text:`Estoy escuchando ${s.name||'esta radio'} en RC Rock Radio`,url:safeExternalUrl(s.homepage)||location.href};
  try{ if(navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`); toast('Enlace copiado.'); } }catch{}
}
function setSleepTimer(minutes){
  clearTimeout(sleepTimeout); sleepTimeout=null; const status=$('#sleepStatus');
  if(!minutes){ status.textContent=''; toast('Temporizador desactivado.'); return; }
  const end=new Date(Date.now()+minutes*60000); status.textContent=`Se detendrá a las ${end.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
  sleepTimeout=setTimeout(()=>{ audio.pause(); state.isPlaying=false; updatePlayerButton(); $('#sleepTimer').value='0'; status.textContent=''; toast('RC Rock Radio se detuvo por el temporizador.'); },minutes*60000);
  toast(`Temporizador: ${minutes} minutos.`);
}

function installEnvironment(){
  const ua=navigator.userAgent||'';
  const ios=/iphone|ipad|ipod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const android=/android/i.test(ua);
  return {ios,android};
}
function showInstallButton(){
  if(state.isStandalone) return;
  $('#installBtn').classList.remove('hidden');
}
function openInstallSheet(){
  if(state.isStandalone){ toast('RC Rock Radio ya está instalada.'); return; }
  const {ios,android}=installEnvironment();
  const steps=$('#installSteps');
  const native=$('#nativeInstallBtn');
  if(deferredPrompt){
    $('#installTitle').textContent='Instalar RC Rock Radio';
    $('#installText').textContent='Puedes instalarla como una aplicación en este dispositivo.';
    steps.innerHTML='<div><b>1</b><span>Toca <strong>Instalar ahora</strong>.</span></div><div><b>2</b><span>Confirma la instalación cuando aparezca el mensaje del navegador.</span></div>';
    native.classList.remove('hidden');
  }else if(ios){
    $('#installTitle').textContent='Instalar en iPhone o iPad';
    $('#installText').textContent='En Safari, agrega RC Rock Radio a tu pantalla de inicio.';
    steps.innerHTML='<div><b>1</b><span>Abre esta página en <strong>Safari</strong>.</span></div><div><b>2</b><span>Toca el botón <strong>Compartir</strong> ⎋.</span></div><div><b>3</b><span>Selecciona <strong>Agregar a pantalla de inicio</strong> y luego <strong>Agregar</strong>.</span></div>';
    native.classList.add('hidden');
  }else if(android){
    $('#installTitle').textContent='Instalar en Android';
    $('#installText').textContent='Chrome permite instalar RC Rock Radio desde el menú del navegador.';
    steps.innerHTML='<div><b>1</b><span>Abre el menú <strong>⋮</strong> de Chrome.</span></div><div><b>2</b><span>Toca <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</span></div><div><b>3</b><span>Confirma la instalación.</span></div>';
    native.classList.add('hidden');
  }else{
    $('#installTitle').textContent='Instalar RC Rock Radio';
    $('#installText').textContent='Busca la opción Instalar aplicación en el menú de tu navegador.';
    steps.innerHTML='<div><b>1</b><span>Abre el menú del navegador.</span></div><div><b>2</b><span>Selecciona <strong>Instalar aplicación</strong> o <strong>Crear acceso directo</strong>.</span></div>';
    native.classList.add('hidden');
  }
  $('#installSheet').classList.remove('hidden'); document.body.style.overflow='hidden';
}
function closeInstallSheet(){ $('#installSheet').classList.add('hidden'); document.body.style.overflow=''; }
async function triggerNativeInstall(){
  if(!deferredPrompt){ openInstallSheet(); return; }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  closeInstallSheet();
}

function switchView(view){
  state.view=view; $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
  $$('.nav-item,.bottom-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#hero').style.display=view==='home'?'grid':'none'; $('#sidebar').classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'});
  if(view==='favorites') renderFavorites(); if(view==='recent') renderRecent(); if(view==='bands') renderBands();
  if(view==='map'){
    const signature=`${state.currentGenre.id}|${state.country}`;
    if(state.mapSignature!==signature) loadMapStations();
  }
}

function attachEvents(){
  document.addEventListener('click',e=>{
    const band=e.target.closest('[data-band]');
    if(band){ loadBandStations(band.dataset.band); return; }
    const genre=e.target.closest('[data-genre]');
    if(genre){ if(genre.closest('#genreGrid')) switchView('explore'); loadGenre(genre.dataset.genre,{target:'both'}); return; }
    const nav=e.target.closest('[data-view]'); if(nav){ switchView(nav.dataset.view); return; }
    const jump=e.target.closest('[data-jump]'); if(jump){ switchView(jump.dataset.jump); return; }
    const play=e.target.closest('[data-play]'); if(play){ playStation(findStation(play.dataset.play)); return; }
    const fav=e.target.closest('[data-fav]'); if(fav){ toggleFavorite(findStation(fav.dataset.fav)); return; }
    if(e.target.closest('[data-close-player]')){ closePlayerSheet(); return; }
    if(e.target.closest('[data-close-install]')){ closeInstallSheet(); return; }
  });
  $('#searchForm').addEventListener('submit',e=>{e.preventDefault();searchStations($('#searchInput').value)});
  $('#playBtn').addEventListener('click',togglePlay); $('#sheetPlay').addEventListener('click',togglePlay);
  $('#prevBtn').addEventListener('click',()=>nextStation(-1)); $('#sheetPrev').addEventListener('click',()=>nextStation(-1));
  $('#nextBtn').addEventListener('click',()=>nextStation(1)); $('#sheetNext').addEventListener('click',()=>nextStation(1));
  $('#volume').addEventListener('input',e=>audio.volume=Number(e.target.value));
  $('#playerFavorite').addEventListener('click',()=>toggleFavorite(state.activeStation)); $('#sheetFavorite').addEventListener('click',()=>toggleFavorite(state.activeStation));
  $('#refreshBtn').addEventListener('click',()=>state.view==='map'?loadMapStations():(state.view==='bands'&&state.currentBand?loadBandStations(state.currentBand.id):loadGenre(state.currentGenre.id,{target:'both'})));
  $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#surpriseBtn').addEventListener('click',randomStation); $('#surpriseBtnTop').addEventListener('click',randomStation);
  $('#expandPlayerBtn').addEventListener('click',openPlayerSheet); $('#shareStationBtn').addEventListener('click',shareStation);
  $('#sleepTimer').addEventListener('change',e=>setSleepTimer(Number(e.target.value)));
  $('#countrySelect').addEventListener('change',e=>{state.country=e.target.value;syncCountrySelects();loadGenre(state.currentGenre.id,{target:'both'});});
  $('#mapCountrySelect').addEventListener('change',e=>{state.country=e.target.value;syncCountrySelects();state.mapSignature='';loadMapStations();});
  $('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;loadGenre(state.currentGenre.id,{target:'both'});});
  $('#clearFiltersBtn').addEventListener('click',()=>{state.country='';state.sort='clickcount';syncCountrySelects();$('#sortSelect').value='clickcount';loadGenre(state.currentGenre.id,{target:'both'});});
  $('#reloadMapBtn').addEventListener('click',loadMapStations);
  audio.addEventListener('playing',()=>{state.isPlaying=true;updatePlayerButton(); if(state.activeStation && (!nowPlayingInterval || nowPlayingStationKey!==stationKey(state.activeStation))) startNowPlayingMonitor(state.activeStation);}); audio.addEventListener('pause',()=>{state.isPlaying=false;updatePlayerButton();clearNowPlayingMonitor();});
  audio.addEventListener('error',()=>{state.isPlaying=false;updatePlayerButton();toast('El stream de esta radio no respondió. Prueba otra emisora.');});
  window.addEventListener('keydown',e=>{ if(e.key==='Escape') closePlayerSheet(); if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();togglePlay();} });
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden && state.activeStation && !audio.paused) refreshNowPlaying(state.activeStation); });
  window.addEventListener('focus',()=>{ if(state.activeStation && !audio.paused) refreshNowPlaying(state.activeStation); });
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;showInstallButton();});
  window.addEventListener('appinstalled',()=>{state.isStandalone=true;deferredPrompt=null;$('#installBtn').classList.add('hidden');toast('RC Rock Radio instalada 🤘');});
  $('#likeBtn')?.addEventListener('click',giveLike);
  $('#themeSelect')?.addEventListener('change',e=>{applyTheme(e.target.value);toast('Tema actualizado');});
  $('#installBtn').addEventListener('click',openInstallSheet);
  $('#nativeInstallBtn').addEventListener('click',triggerNativeInstall);
}

async function init(){
  initTheme(); renderGenres(); renderBands(); renderVisualizer(); renderFavorites(); renderRecent(); attachEvents(); initCommunityStats();
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
  showInstallButton();
  const requestedView=new URLSearchParams(location.search).get('view');
  if(['home','explore','map','bands','favorites','recent','about'].includes(requestedView)) switchView(requestedView);
  discoverMirrors(); loadCountries(); await loadGenre('rock',{target:'both'});
}
init();
