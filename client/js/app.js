/* ═════════════ CONFIG ═════════════ */
// API calls now go through our secure backend at /api/
let lat=33.6844,lon=73.0479,ov='wind',chart=null,isDark=true,_fore=null,chartM='temp',units='C',pollComps=null,refreshSecs=600,refreshInterval=null,timeFmt='12h';


/* ═════════════ SCROLL-TO-TOP ═════════════ */
window.addEventListener('scroll',()=>{const st=document.getElementById('scrollTop');if(st)st.classList.toggle('show',window.scrollY>300)});

/* ═════════════ TOAST ═════════════ */
function showToast(msg,type='success'){
  let b=document.getElementById('toast-box');if(!b){b=document.createElement('div');b.id='toast-box';document.body.appendChild(b)}const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=type==='success'?`<i class="fas fa-check-circle"></i>${msg}`:`<i class="fas fa-exclamation-triangle"></i>${msg}`;
  b.appendChild(t);
  setTimeout(()=>{t.style.animation='tOut .4s forwards';setTimeout(()=>t.remove(),400)},3500);
}

/* ═════════════ CLOCK + REFRESH TIMER ═════════════ */
function tick(){
  const n=new Date();
  const opts=timeFmt==='24h'?{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}:{hour:'2-digit',minute:'2-digit',second:'2-digit'};
  set('clockEl',n.toLocaleTimeString(timeFmt==='24h'?'en-GB':'en-US',opts));
  set('dashDate',n.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}));
}
function startRefreshTimer(){
  clearInterval(refreshInterval);
  refreshSecs=600;
  refreshInterval=setInterval(()=>{
    refreshSecs--;
    if(refreshSecs<=0){clearInterval(refreshInterval);forceRefresh();return}
    const m=Math.floor(refreshSecs/60),s=refreshSecs%60;
    set('refreshCountdown',`${m}:${s.toString().padStart(2,'0')}`);
  },1000);
}
async function forceRefresh(){
  clearInterval(refreshInterval);
  sessionStorage.removeItem(`sl_v2_${lat.toFixed(2)}_${lon.toFixed(2)}`);
  const cwCityEl=document.getElementById('cwCity');
  await fetchW(lat,lon,(cwCityEl&&cwCityEl.textContent)||'Current Location');
  startRefreshTimer();
}

/* ═════════════ UNIT TOGGLE ═════════════ */
let _lastWeatherData=null;
function setUnits(u){
  units=u;
  localStorage.setItem('sl_units',u);
  const btnC=document.getElementById('btnC'),btnF=document.getElementById('btnF');
  if(btnC){btnC.classList.toggle('act',u==='C');btnC.setAttribute('aria-pressed',u==='C')}
  if(btnF){btnF.classList.toggle('act',u==='F');btnF.setAttribute('aria-pressed',u==='F')}
  if(_lastWeatherData) reRenderUnits(_lastWeatherData);
}
function reRenderUnits(d){
  set('hTemp',units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp));
  set('cwTemp',units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp));
  set('cwUnit',units==='F'?'°F':'°C');
  set('cwWUnit',units==='mph'?'mph':'km/h');
  set('cwW',units==='mph'?(d.wind.speed*2.237).toFixed(1):(d.wind.speed*3.6).toFixed(1));
  const dew=Math.round(d.main.temp-(100-d.main.humidity)/5);
  const dewDisp=units==='F'?Math.round(dew*9/5+32):dew;
  const feelsDisp=units==='F'?Math.round(d.main.feels_like*9/5+32):Math.round(d.main.feels_like);
  const el=document.getElementById('cwFeels');if(el)el.textContent=`Feels like ${feelsDisp}°${units} · Dew ${dewDisp}°${units}`;
  set('dewVal',dewDisp+'°');
  // update wind panel
  const wkmh=d.wind.speed*3.6;
  set('windKmh',units==='mph'?(wkmh*.621371).toFixed(1):wkmh.toFixed(1));
  set('windSpdUnit',units==='mph'?'mph Speed':'km/h Speed');
  set('windMs',d.wind.speed.toFixed(1)+' m/s');
  const gust=(d.wind.gust||d.wind.speed)*3.6;
  set('gustKmh',units==='mph'?(gust*.621371).toFixed(1):gust.toFixed(1));
  set('gustUnit',units==='mph'?'mph Gusts':'km/h Gusts');
  set('windSpeedLg',units==='mph'?(wkmh*.621371).toFixed(1)+' mph':wkmh.toFixed(1)+' km/h');
  // heat panel
  const feelsC=Math.round(d.main.feels_like),actualC=Math.round(d.main.temp);
  const feelsD=units==='F'?Math.round(feelsC*9/5+32):feelsC;
  const actualD=units==='F'?Math.round(actualC*9/5+32):actualC;
  set('heatFeelsVal',feelsD); set('heatActual',actualD+'°');
  set('heatDiff','Diff: '+(feelsC-actualC>=0?'+':'')+(feelsC-actualC)+'°C');
}

/* ═════════════ INIT ═════════════ */
window.addEventListener('DOMContentLoaded',()=>{
  tick(); setInterval(tick,1000);
  startRefreshTimer();
  const savedU=localStorage.getItem('sl_units');
  if(savedU)setUnits(savedU);
  const savedTf=localStorage.getItem('sl_timefmt');
  if(savedTf)setTimeFmt(savedTf);
  Object.keys(QUIZ_ID).forEach(initQuiz);
  initScrollObserver();
  runCounters();
  renderRecent();
  updateAuthUI();
  renderFavorites();
  // Only pages that actually display live weather data opt in via
  // <body data-needs-weather> — avoids a pointless location prompt
  // and an unnecessary API/render pipeline on static pages (About, Learn).
  if(document.body.hasAttribute('data-needs-weather')){
    const qp=new URLSearchParams(location.search),sl=parseFloat(qp.get('lat')),sn=parseFloat(qp.get('lon'));
    if(isFinite(sl)&&isFinite(sn)&&Math.abs(sl)<=90&&Math.abs(sn)<=180){
      lat=sl;lon=sn;loadMap();fetchW(lat,lon,(qp.get('city')||'Shared location').slice(0,60));
    } else {
    loadMap();
    // Speed: if we already know where this browser was last time, load that weather
    // straight away instead of waiting for the (slow) location lookup. The lookup still
    // runs in the background and reloads only if the position really changed.
    let _lp=null;
    try{_lp=JSON.parse(localStorage.getItem('sl_lastpos')||'null')}catch(e){}
    const _hasLP=_lp&&isFinite(_lp.lat)&&isFinite(_lp.lon);
    if(_hasLP){lat=_lp.lat;lon=_lp.lon;loadMap();fetchW(lat,lon,'My Location')}
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos=>{
          const nl=pos.coords.latitude,no=pos.coords.longitude;
          try{localStorage.setItem('sl_lastpos',JSON.stringify({lat:nl,lon:no}))}catch(e){}
          if(_hasLP&&Math.abs(nl-lat)<0.1&&Math.abs(no-lon)<0.1)return; // same place, already loaded
          lat=nl;lon=no;loadMap();fetchW(lat,lon,'My Location')
        },
        ()=>{if(!_hasLP)fetchW(lat,lon,'Islamabad')},
        {enableHighAccuracy:false,timeout:6000,maximumAge:3600000}
      );
    } else if(!_hasLP) fetchW(lat,lon,'Islamabad');
    }
  }
});

/* ═════════════ KEYBOARD SHORTCUTS ═════════════ */
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(e.key==='Escape'){
    document.querySelectorAll('.details-panel.open').forEach(p=>{p.classList.remove('open');p.previousElementSibling?.querySelector('.detail-chip.open')?.classList.remove('open')});
    hideAcList();
  }
});

/* ═════════════ MOBILE NAV ═════════════ */

/* ═════════════ PAGE NAVIGATION (single-page scroll) ═════════════ */

/* ═════════════ COLLAPSIBLE PANELS ═════════════ */

/* ═════════════ FORECAST TABS ═════════════ */

/* ═════════════ HELPERS ═════════════ */
function q(fn){setTimeout(fn,130)}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function ico(id,c){const e=document.getElementById(id);if(e)e.className=`fas ${c||'fa-cloud'}`}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function spin(on){const e=document.getElementById('loader');if(e)e.style.display=on?'block':'none'}

/* ═════════════ THEME ═════════════ */

/* ═════════════ MOON PHASE ═════════════ */
function moonPhase(d=new Date()){const known=new Date(2000,0,6,18,14,0),diff=(d-known)/86400000,cycle=29.530588853,p=((diff%cycle)+cycle)%cycle/cycle;if(p<.0625)return{e:'🌑',n:'New Moon',i:0};if(p<.1875)return{e:'🌒',n:'Waxing Crescent',i:25};if(p<.3125)return{e:'🌓',n:'First Quarter',i:50};if(p<.4375)return{e:'🌔',n:'Waxing Gibbous',i:75};if(p<.5625)return{e:'🌕',n:'Full Moon',i:100};if(p<.6875)return{e:'🌖',n:'Waning Gibbous',i:75};if(p<.8125)return{e:'🌗',n:'Last Quarter',i:50};return{e:'🌘',n:'Waning Crescent',i:25}}
function windDir(deg){const d=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];return d[Math.round(deg/22.5)%16]}

/* ═════════════ WEATHER ICONS ═════════════ */
const ICONS={'01d':'fa-sun','01n':'fa-moon','02d':'fa-cloud-sun','02n':'fa-cloud-moon','03d':'fa-cloud','03n':'fa-cloud','04d':'fa-cloud-meatball','04n':'fa-cloud-meatball','09d':'fa-cloud-showers-heavy','09n':'fa-cloud-showers-heavy','10d':'fa-cloud-sun-rain','10n':'fa-cloud-moon-rain','11d':'fa-bolt','11n':'fa-bolt','13d':'fa-snowflake','13n':'fa-snowflake','50d':'fa-smog','50n':'fa-smog'};
const WMO_ICONS={0:'fa-sun',1:'fa-sun',2:'fa-cloud-sun',3:'fa-cloud',45:'fa-smog',48:'fa-smog',51:'fa-cloud-rain',53:'fa-cloud-rain',55:'fa-cloud-showers-heavy',61:'fa-cloud-rain',63:'fa-cloud-rain',65:'fa-cloud-showers-heavy',71:'fa-snowflake',73:'fa-snowflake',75:'fa-snowflake',80:'fa-cloud-rain',81:'fa-cloud-rain',82:'fa-cloud-showers-heavy',85:'fa-snowflake',86:'fa-snowflake',95:'fa-bolt',96:'fa-bolt',99:'fa-bolt'};

/* ═════════════ AUTOCOMPLETE ═════════════ */
let acTimer=null,acIdx=-1,acResults=[];
function acDebounce(val){clearTimeout(acTimer);if(val.length<2){hideAcList();return}acTimer=setTimeout(()=>acSearch(val),380)}
async function acSearch(q){
  try{
    const r=await fetch(`/api/geo?q=${encodeURIComponent(q)}`);
    const data=await r.json();
    acResults=data;
    const list=document.getElementById('acList');
    if(!data.length){hideAcList();return}
    list.innerHTML=data.map((c,i)=>`<div class="ac-item" role="option" data-i="${i}" onclick="acSelect(${i})" onmouseenter="acIdx=${i}"><i class="fas fa-map-marker-alt"></i><span>${c.name}${c.state?', '+c.state:''}</span><span class="ac-country">${c.country}</span></div>`).join('');
    list.classList.add('show');
    acIdx=-1;
  }catch(e){}
}
function acSelect(i){const c=acResults[i];if(!c)return;lat=c.lat;lon=c.lon;document.getElementById('cityIn').value='';hideAcList();loadMap();fetchW(lat,lon,c.name);}
function hideAcList(){const al=document.getElementById('acList');if(al)al.classList.remove('show');acIdx=-1}
function acKeyNav(e){
  const items=document.querySelectorAll('#acList .ac-item');
  if(e.key==='ArrowDown'){acIdx=Math.min(acIdx+1,items.length-1);items.forEach((it,i)=>it.classList.toggle('act',i===acIdx))}
  else if(e.key==='ArrowUp'){acIdx=Math.max(acIdx-1,0);items.forEach((it,i)=>it.classList.toggle('act',i===acIdx))}
  else if(e.key==='Enter'){if(acIdx>=0&&acResults[acIdx])acSelect(acIdx);else doSearch()}
  else if(e.key==='Escape')hideAcList();
}
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))hideAcList()});

/* ═════════════ RECENT CITIES ═════════════ */
function getRecent(){try{return JSON.parse(localStorage.getItem('sl_cities')||'[]')}catch{return[]}}
function addRecent(name,lt,ln){let arr=getRecent();arr=arr.filter(c=>c.name!==name);arr.unshift({name,lat:lt,lon:ln});arr=arr.slice(0,5);try{localStorage.setItem('sl_cities',JSON.stringify(arr))}catch{}renderRecent()}
function delRecent(name,e){e.stopPropagation();let arr=getRecent().filter(c=>c.name!==name);try{localStorage.setItem('sl_cities',JSON.stringify(arr))}catch{}renderRecent()}
function renderRecent(){
  const wrap=document.getElementById('recentWrap');if(!wrap)return;
  const arr=getRecent();
  if(!arr.length){wrap.innerHTML='';return}
  wrap.innerHTML='<span class="rc-lbl">Recent:</span>'+arr.map(c=>`<button class="rc-chip" onclick="rcSelect('${c.name}',${c.lat},${c.lon})" aria-label="Load weather for ${c.name}"><span>${c.name}</span><span class="rc-del" onclick="delRecent('${c.name}',event)" title="Remove" aria-label="Remove ${c.name}">✕</span></button>`).join('');
}
function rcSelect(name,lt,ln){lat=lt;lon=ln;loadMap();fetchW(lt,ln,name)}

/* ═════════════ SMART ALERTS ═════════════ */
function generateAlerts(d,uv,aqi){
  const alerts=[];
  const temp=d.main.temp,vis=d.visibility/1000,wind=d.wind.speed*3.6;
  if(temp>=40)alerts.push({type:'danger',icon:'fa-temperature-full',title:'Extreme Heat Warning',desc:`Temperature ${Math.round(temp)}°C. Stay hydrated and avoid outdoor activity.`});
  else if(temp>=35)alerts.push({type:'warn',icon:'fa-thermometer-three-quarters',title:'Heat Advisory',desc:`Temperature ${Math.round(temp)}°C. Limit strenuous outdoor activity.`});
  if(temp<=-5)alerts.push({type:'warn',icon:'fa-snowflake',title:'Extreme Cold Advisory',desc:`Temperature ${Math.round(temp)}°C. Risk of frostbite. Dress in layers.`});
  if(uv>=8)alerts.push({type:'danger',icon:'fa-sun',title:'Very High UV Alert',desc:`UV Index ${Math.round(uv)} — peak today. Apply SPF 50+ sunscreen every 2 hours.`});
  else if(uv>=6)alerts.push({type:'warn',icon:'fa-sun',title:'High UV Index',desc:`UV Index ${Math.round(uv)} today. Seek shade during peak hours (10am–2pm).`});
  if(aqi>=4)alerts.push({type:'danger',icon:'fa-lungs',title:'Poor Air Quality',desc:`AQI Level ${aqi>=5?'Hazardous':'Poor'}. Avoid outdoor exercise. Wear N95 mask outdoors.`});
  else if(aqi===3)alerts.push({type:'warn',icon:'fa-leaf',title:'Moderate Air Quality',desc:'Air quality is moderate. Sensitive groups should limit outdoor exposure.'});
  if(wind>=60)alerts.push({type:'danger',icon:'fa-wind',title:'High Wind Warning',desc:`Wind speed ${wind.toFixed(0)} km/h. Secure loose objects. Risk of fallen branches.`});
  else if(wind>=40)alerts.push({type:'warn',icon:'fa-wind',title:'Strong Wind Advisory',desc:`Wind speed ${wind.toFixed(0)} km/h. Be cautious driving high-profile vehicles.`});
  if(vis<1)alerts.push({type:'danger',icon:'fa-eye-slash',title:'Very Low Visibility',desc:`Visibility only ${vis.toFixed(1)} km. Dangerous driving conditions — use fog lights.`});
  else if(vis<3)alerts.push({type:'warn',icon:'fa-eye',title:'Reduced Visibility',desc:`Visibility ${vis.toFixed(1)} km. Exercise caution when driving.`});
  const wid=d.weather[0].id;
  if(wid>=200&&wid<300)alerts.push({type:'danger',icon:'fa-bolt',title:'Thunderstorm Active',desc:'Thunderstorm in progress. Stay indoors and away from windows.'});
  return alerts;
}
function renderAlerts(alerts){
  const zone=document.getElementById('alertZone');if(!zone)return;
  zone.innerHTML=alerts.map((a,i)=>`<div class="alert-banner ${a.type}" role="alert"><i class="fas ${a.icon} ab-icon"></i><div class="ab-body"><div class="ab-title">${a.title}</div><div class="ab-desc">${a.desc}</div></div><button class="ab-dismiss" onclick="this.parentElement.remove()" aria-label="Dismiss alert">✕</button></div>`).join('');
}

function updateNotifBadge(alerts){
  const btn=document.getElementById('notifBtn'),badge=document.getElementById('notifBadge');
  if(!btn||!badge)return;
  badge.textContent=alerts.length;
  badge.classList.toggle('show',alerts.length>0);
  btn.classList.toggle('has-danger',alerts.some(a=>a.type==='danger'));
  btn.classList.toggle('has-warn',alerts.length>0&&!alerts.some(a=>a.type==='danger'));
}

/* ═════════════ WEATHER BACKGROUND ADAPTATION ═════════════ */
function adaptBackground(weatherId){
  let wtype='clear';
  if(weatherId>=200&&weatherId<300)wtype='thunder';
  else if(weatherId>=300&&weatherId<600)wtype='rain';
  else if(weatherId>=600&&weatherId<700)wtype='snow';
  else if(weatherId>=700&&weatherId<800)wtype='fog';
  else if(weatherId===800)wtype='clear';
  else if(weatherId>800)wtype='cloudy';
  document.documentElement.setAttribute('data-weather',wtype);
}

/* ═════════════ MAIN FETCH ENGINE ═════════════ */
async function fetchW(lt,ln,hint){
  spin(true);
  const ck=`sl_v2_${lt.toFixed(2)}_${ln.toFixed(2)}`;
  const cached=sessionStorage.getItem(ck);
  if(cached){
    const d=JSON.parse(cached);
    if(Date.now()-d.ts<600000&&d.f10){_fore=d.f;pollComps=d.pc||null;renderAll(d.c,d.f,d.uv,d.aqi,d.f10,hint);spin(false);showToast(`Cached: ${hint}`,'success');return}
  }
  try{
    const safe = (p, fallback=null) => p.catch(()=>fallback);
    const _pa=[
      fetch(`/api/weather?lat=${lt}&lon=${ln}`).then(r=>r.ok?r.json():Promise.reject(r)),
      fetch(`/api/forecast?lat=${lt}&lon=${ln}`).then(r=>r.ok?r.json():Promise.reject(r)),
      safe(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lt}&longitude=${ln}&hourly=uv_index&timezone=auto&forecast_days=1`).then(r=>r.json()), {}),
      safe(fetch(`/api/aqi?lat=${lt}&lon=${ln}`).then(r=>r.json()), {list:[]}),
      safe(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lt}&longitude=${ln}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=10`).then(r=>r.ok?r.json():Promise.reject(r)).catch(()=>new Promise(res=>setTimeout(res,800)).then(()=>fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lt}&longitude=${ln}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=10`)).then(r=>r.json())), null)
    ];
    // Core data (current + forecast) first: paint the hero immediately
    const[c,f]=await Promise.all([_pa[0],_pa[1]]);
    try{renderHero(c);renderHeroForecast(f)}catch(_e){}
    // Extras (UV, air quality, 10-day) can arrive later without blocking the hero
    const[meteo,pol,f10]=await Promise.all([_pa[2],_pa[3],_pa[4]]);
    _fore=f;
    let realUV=0;
    if(meteo.hourly&&Array.isArray(meteo.hourly.uv_index))realUV=Math.max(...meteo.hourly.uv_index.map(v=>parseFloat(v)||0));
    const realAQI=(pol.list&&pol.list.length>0)?pol.list[0].main.aqi:1;
    pollComps=(pol.list&&pol.list.length>0)?pol.list[0].components:null;
    if(f10&&f10.daily)sessionStorage.setItem(ck,JSON.stringify({ts:Date.now(),c,f,uv:realUV,aqi:realAQI,pc:pollComps,f10}));
    if(!c||!c.weather||!c.main){showToast('Unexpected weather data format.','error');return;}
    renderAll(c,f,realUV,realAQI,f10,hint);
    addRecent(hint,lt,ln);
    showToast(`Weather updated: ${hint}`,'success');
  }catch(e){console.error(e);showToast('Failed to fetch weather data.','error')}
  finally{spin(false)}
}

function safe(fn,...args){
  try{return fn(...args)}catch(e){console.warn('[skyLens] '+(fn&&fn.name||'render')+' failed:',e)}
}
function renderAll(c,f,uv,aqi,f10,hint){
  if(!c||!c.weather||!c.main) return;
  _lastWeatherData=c;
  safe(renderCW,c,hint); safe(renderHero,c); safe(renderHeroForecast,f); safe(renderDbForecast,f); safe(renderWindSparkline,f);
  safe(renderFC,f); safe(buildHourly,f);
  safe(buildChart,f); safe(renderWidgets,c,uv,aqi); safe(renderSunMoon,c);
  safe(renderWindPanel,c); safe(renderHumidPanel,c); safe(renderPressPanel,c); safe(renderHeatPanel,c);
  const _alerts=safe(generateAlerts,c,uv,aqi)||[];
  safe(renderAQIPanel,pollComps); safe(renderAlerts,_alerts); safe(updateNotifBadge,_alerts);
  safe(render10Day,f10); safe(adaptBackground,c.weather[0].id);
  safe(renderAstroPanel,c);
  safe(updateDbChips,c,uv,f10);
  if(units!=='C')safe(reRenderUnits,c);
}

/* ═════════════ RENDER CURRENT WEATHER ═════════════ */
function renderCW(d,hint){
  const tz=d.timezone,ltMs=(Date.now()/1000+tz+new Date().getTimezoneOffset()*60)*1000;
  const lt=fmtTime(ltMs);
  set('cwCity',hint||d.name); set('cwMeta',d.sys.country); set('cwTime',lt); set('cwTime2',lt);
  const tempVal=units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp);
  set('cwTemp',tempVal); set('cwUnit',units==='F'?'°F':'°C');
  // H/L for dashboard center column
  set('cwHi',units==='F'?Math.round(d.main.temp_max*9/5+32):Math.round(d.main.temp_max));
  set('cwLo',units==='F'?Math.round(d.main.temp_min*9/5+32):Math.round(d.main.temp_min));
  // Condition name (big display in center)
  const main=d.weather[0].main;
  const info=WEATHER_INFO[main]||{cat:main,desc:cap(d.weather[0].description)+'. Stay informed with live data from skyLens.'};
  set('cwCond',main);
  const dew=Math.round(d.main.temp-(100-d.main.humidity)/5);
  const dewD=units==='F'?Math.round(dew*9/5+32):dew;
  const feelsD=units==='F'?Math.round(d.main.feels_like*9/5+32):Math.round(d.main.feels_like);
  const descEl=document.getElementById('cwFeels');
  if(descEl)descEl.textContent=info.desc||`Feels like ${feelsD}°${units} · Dew ${dewD}°${units}`;
  set('cwHi',units==='F'?Math.round(d.main.temp_max*9/5+32):Math.round(d.main.temp_max));
  set('cwLo',units==='F'?Math.round(d.main.temp_min*9/5+32):Math.round(d.main.temp_min));
  set('cwTime2',lt);
  set('cwH',d.main.humidity+'%');
  set('humidSubHl',d.main.humidity<30?'Very Dry':d.main.humidity<50?'Dry':d.main.humidity<60?'Comfortable':d.main.humidity<70?'Slightly Humid':'Very Humid');
  {const hBarHl=document.getElementById('humidBarHl');if(hBarHl)hBarHl.style.width=d.main.humidity+'%';}
  // Humidity sub-hint
  const h=d.main.humidity;
  set('humidSubHl',h<30?'Very Dry':h<50?'Dry':h<60?'Comfortable':h<70?'Slightly Humid':'Very Humid');
  const hBar=document.getElementById('humidBarHl');if(hBar)hBar.style.width=h+'%';
  const wkmh=d.wind.speed*3.6;
  set('cwW',units==='mph'?(wkmh*.621371).toFixed(1):wkmh.toFixed(1));
  set('cwWUnit',units==='mph'?'mph':'km/h');
  // Pressure shown in visibility card sub-label
  set('cwP',d.main.pressure+' hPa');
  set('cwV',(d.visibility/1000).toFixed(1));
  ico('cwIcon',ICONS[d.weather[0].icon]);
  // Right column wind card
  set('windKmh',units==='mph'?(wkmh*.621371).toFixed(1):wkmh.toFixed(1));
  set('windSpdUnit',units==='mph'?'mph':'km/h');
  set('windDirLg',windDir(d.wind.deg||0));
  const needleSm=document.getElementById('needleLg');
  if(needleSm)needleSm.style.transform=`rotate(${d.wind.deg||0}deg)`;
}
function renderHero(d){
  // Core values (used by legacy IDs kept for reRenderUnits compatibility)
  const tD=units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp);
  set('hTemp',tD); set('hHumid',d.main.humidity+'%');
  const wkmhNum=(d.wind.speed*3.6);
  const wD=units==='mph'?(d.wind.speed*2.237).toFixed(0):wkmhNum.toFixed(0);
  set('hWind',wD); set('hPress',d.main.pressure);
  set('hCond',cap(d.weather[0].description));
  ico('hIcon',ICONS[d.weather[0].icon]);
  // City in location pill (hCity is now the pill location span)
  const cityLabel=document.getElementById('cwCity')?.textContent||d.name||'Your Location';
  set('hCity',cityLabel);
  // wCast-style hero elements
  const main=d.weather[0].main;
  const info=WEATHER_INFO[main]||{cat:main+' Conditions',desc:cap(d.weather[0].description)+'. Stay informed with live updates from skyLens.'};
  set('heroCondName',main);
  set('heroCondCat',info.cat);
  set('heroCondDesc',info.desc);
  const windDisplay=units==='mph'?(d.wind.speed*2.237).toFixed(0)+' mph':wkmhNum.toFixed(0)+' km/h';
  set('heroWindKmh',windDisplay);
}

/* Weather condition info map for hero cinematic */
const WEATHER_INFO={
  'Thunderstorm':{cat:'Electrical Storm Activity',desc:'Violent atmospheric disturbance with lightning, thunder and heavy precipitation. Seek shelter immediately and stay away from high ground and open areas.'},
  'Drizzle':{cat:'Light Precipitation Event',desc:'Fine water droplets suspended from low-level cloud layers. Roads may become slick; pedestrians advised to carry cover and reduce speed.'},
  'Rain':{cat:'Active Precipitation',desc:'Liquid water droplets falling continuously from organized cloud systems. Visibility may be reduced during heavy spells.'},
  'Snow':{cat:'Winter Precipitation',desc:'Ice crystals accumulating on surfaces. Roads may become icy — allow extra travel time, dress in layers, and watch for black ice.'},
  'Mist':{cat:'Misty Conditions',desc:'Fine water vapour reducing horizontal visibility. Typical morning phenomenon that usually lifts as surface temperatures rise through the day.'},
  'Smoke':{cat:'Smoke in Atmosphere',desc:'Combustion particles suspended in the atmosphere affecting air quality and forward visibility. Limit prolonged outdoor exertion.'},
  'Haze':{cat:'Hazy Atmosphere',desc:'Dry dust or smoke particles creating atmospheric haze. UV radiation may be diffused, but sensitive groups should limit outdoor exposure.'},
  'Dust':{cat:'Airborne Dust Event',desc:'Windblown dust particles reducing visibility and degrading air quality. Wear a mask outdoors and keep windows closed.'},
  'Fog':{cat:'Dense Fog Advisory',desc:'Ground-level cloud layer with visibility potentially below 1 km. Drive with fog lights, significantly reduce speed, and increase following distance.'},
  'Sand':{cat:'Sandstorm Conditions',desc:'Wind-driven sand particles reducing visibility significantly. Seal windows and doors, wear protective eyewear, and avoid travel if possible.'},
  'Ash':{cat:'Volcanic Ash Detected',desc:'Volcanic particulate matter affecting the atmosphere. Wear a protective mask and significantly limit outdoor exposure during advisory.'},
  'Squall':{cat:'Active Squall Event',desc:'Sudden violent gusts of wind with rain. Secure all outdoor objects, take down structures, and seek shelter from elevated structures.'},
  'Tornado':{cat:'Tornado Alert — Danger',desc:'Rotating column of air in contact with the ground. Move immediately to the lowest floor of a sturdy building away from windows.'},
  'Clear':{cat:'Clear Sky Conditions',desc:'No significant cloud cover present. Excellent horizontal visibility and full solar radiation reaching the surface. High UV possible at midday.'},
  'Clouds':{cat:'Overcast Conditions',desc:'Cloud cover reducing direct sunlight and slightly lowering surface temperatures below seasonal norms. Dry conditions expected.'}
};

/* ═════════════ HERO FORECAST TIMELINE ═════════════ */
function renderHeroForecast(data){
  const daysEl=document.getElementById('hcfDays');
  const svgEl=document.getElementById('hcfSvg');
  const circlesEl=document.getElementById('hcfCircles');
  if(!daysEl||!svgEl||!circlesEl||!data||!data.list)return;
  const daily=data.list.filter((_,i)=>i%8===0).slice(0,5);
  if(!daily.length)return;
  const dayNames=daily.map(d=>new Date(d.dt*1000).toLocaleDateString('en-US',{weekday:'long'}));
  const temps=daily.map(d=>units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp));
  const iconClasses=daily.map(d=>ICONS[d.weather[0].icon]||'fa-cloud');
  // Render day columns
  daysEl.innerHTML=dayNames.map((name,i)=>`<div class="hcf-day"><div class="hcf-day-name">${name}</div><div class="hcf-day-temp">${temps[i]}<sup>°</sup></div></div>`).join('');
  // SVG line
  const svgW=1000,svgH=80,padL=100,padR=100,useW=svgW-padL-padR;
  const tMin=Math.min(...temps)-2,tMax=Math.max(...temps)+2,tRange=Math.max(tMax-tMin,1);
  const pts=temps.map((t,i)=>({
    x:padL+(i/(temps.length-1))*useW,
    y:svgH-8-((t-tMin)/tRange)*(svgH-22),
    icon:iconClasses[i]
  }));
  function buildPath(p){
    if(p.length<2)return'';
    let d=`M ${p[0].x} ${p[0].y}`;
    for(let i=0;i<p.length-1;i++){
      const p0=p[Math.max(0,i-1)],p1=p[i],p2=p[i+1],p3=p[Math.min(p.length-1,i+2)];
      const cp1x=p1.x+(p2.x-p0.x)/6,cp1y=p1.y+(p2.y-p0.y)/6;
      const cp2x=p2.x-(p3.x-p1.x)/6,cp2y=p2.y-(p3.y-p1.y)/6;
      d+=` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
  const pathD=buildPath(pts);
  svgEl.innerHTML=`<path class="hcf-path-glow" d="${pathD}"/><path class="hcf-path" d="${pathD}"/>`;
  circlesEl.innerHTML=pts.map((p,i)=>{
    const lx=(p.x/svgW*100).toFixed(2),ty=(p.y/svgH*100).toFixed(2);
    return `<div class="hcf-circle-wrap" style="left:${lx}%;top:${ty}%"><div class="hcf-circle${i===0?' current':''}"><i class="fas ${p.icon}"></i></div></div>`;
  }).join('');
}

/* ═════════════ DASHBOARD FORECAST TIMELINE ═════════════ */
function renderDbForecast(data){
  const daysEl=document.getElementById('dbFcDays');
  const svgEl=document.getElementById('dbFcSvg');
  const circlesEl=document.getElementById('dbFcCircles');
  const namesEl=document.getElementById('dbFcNames');
  if(!daysEl||!svgEl||!circlesEl||!namesEl||!data||!data.list)return;
  const daily=data.list.filter((_,i)=>i%8===0).slice(0,5);
  if(!daily.length)return;
  const dayNames=daily.map(d=>new Date(d.dt*1000).toLocaleDateString('en-US',{weekday:'short'}));
  const temps=daily.map(d=>units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp));
  const iconClasses=daily.map(d=>ICONS[d.weather[0].icon]||'fa-cloud');
  // Temperature row (above line)
  daysEl.innerHTML=temps.map(t=>`<div class="dbf-temp-col"><div class="dbf-temp-val">${t}<sup>°</sup></div></div>`).join('');
  // Day names row (below line)
  namesEl.innerHTML=dayNames.map(n=>`<div class="dbf-day-name">${n}</div>`).join('');
  // SVG
  const svgW=1000,svgH=60,padL=100,padR=100,useW=svgW-padL-padR;
  const tMin=Math.min(...temps)-2,tMax=Math.max(...temps)+2,tRange=Math.max(tMax-tMin,1);
  const pts=temps.map((t,i)=>({
    x:padL+(i/(temps.length-1))*useW,
    y:svgH-6-((t-tMin)/tRange)*(svgH-16),
    icon:iconClasses[i]
  }));
  function dbPath(p){
    if(p.length<2)return'';
    let d=`M ${p[0].x} ${p[0].y}`;
    for(let i=0;i<p.length-1;i++){
      const p0=p[Math.max(0,i-1)],p1=p[i],p2=p[i+1],p3=p[Math.min(p.length-1,i+2)];
      const cp1x=p1.x+(p2.x-p0.x)/6,cp1y=p1.y+(p2.y-p0.y)/6;
      const cp2x=p2.x-(p3.x-p1.x)/6,cp2y=p2.y-(p3.y-p1.y)/6;
      d+=` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
  const pd=dbPath(pts);
  svgEl.innerHTML=`<path class="dbf-path-glow" d="${pd}"/><path class="dbf-path" d="${pd}"/>`;
  circlesEl.innerHTML=pts.map((p,i)=>{
    const lx=(p.x/svgW*100).toFixed(2),ty=(p.y/svgH*100).toFixed(2);
    return `<div class="dbf-circle-wrap" style="left:${lx}%;top:${ty}%"><div class="dbf-circle${i===0?' current':''}"><i class="fas ${p.icon}"></i></div></div>`;
  }).join('');
}

/* ═════════════ WIND SPARKLINE (right column) ═════════════ */
function renderWindSparkline(data){
  const svg=document.getElementById('dbWindSparkSvg');
  if(!svg||!data||!data.list)return;
  const pts=data.list.slice(0,8);
  const speeds=pts.map(p=>p.wind.speed*3.6);
  if(!speeds.length)return;
  const sMin=Math.min(...speeds),sMax=Math.max(...speeds)+0.5,sRange=Math.max(sMax-sMin,1);
  const W=200,H=60,pad=8;
  const coords=speeds.map((s,i)=>({
    x:pad+(i/(speeds.length-1))*(W-pad*2),
    y:H-pad-((s-sMin)/sRange)*(H-pad*2)
  }));
  const poly=coords.map(c=>`${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPts=`${coords[0].x},${H} `+coords.map(c=>`${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')+` ${coords[coords.length-1].x},${H}`;
  svg.innerHTML=`
    <defs><linearGradient id="spGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient></defs>
    <polygon points="${areaPts}" class="sp-area"/>
    <polyline points="${poly}" class="sp-path"/>
    ${coords.map((c,i)=>i===0?`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" class="sp-dot"/>`:'').join('')}
  `;
}



/* ─── Sync pressure + wind expanded panels ─── */
function renderPressPanel(d){
  const p=d.main.pressure;
  set('presshPa',p); set('presshPaEx',p);
  const zone=p<990?'Deep Low':p<1000?'Low':p<1015?'Near Normal':p<1025?'Normal':p<1035?'High':'Very High';
  const impl=p<1000?'Storm risk elevated':p<1015?'Unsettled weather':'Settled, fair conditions';
  set('pressCat',zone); set('pressCatEx',zone);
  set('pressSlp','Sea level ref: 1013');
  set('pressImpl',impl);
  const pct=Math.min(((p-960)/80)*100,100);
  const b=document.getElementById('pressBar');if(b)b.style.width=pct+'%';
  const bEx=document.getElementById('pressBarEx');if(bEx)bEx.style.width=pct+'%';
}

function initScrollObserver(){
  const sections=[{id:'home',ni:0},{id:'weather',ni:1},{id:'encyclopedia',ni:2},{id:'about',ni:3}];
  const header=document.getElementById('mainHeader');
  // Hero transparent header observer
  const heroObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(header)header.classList.toggle('hero-mode',e.isIntersecting);
    });
  },{threshold:[0,0.02]});
  sections.forEach(s=>{
    const el=document.getElementById(s.id);
    if(el){
      // Pre-mark all non-home sections visible on startup (no opacity:0 trap)
      if(s.id!=='home') el.classList.add('in-view');
    }
  });
  const heroCinematic=document.querySelector('.hero-cinematic');
  if(heroCinematic&&header)heroObs.observe(heroCinematic);
}

/* ═════════════ SUN + MOON ═════════════ */
function renderSunMoon(d){
  const tz=d.timezone,off=new Date().getTimezoneOffset()*60;
  const rMs=(d.sys.sunrise+tz+off)*1000,sMs=(d.sys.sunset+tz+off)*1000;
  set('srTimeLg',fmtTime(rMs)); set('ssTimeLg',fmtTime(sMs));
  const dlMin=Math.round((d.sys.sunset-d.sys.sunrise)/60);
  set('dayLenLg',`${Math.floor(dlMin/60)}h ${dlMin%60}m`);
  const now=Date.now()/1000,prog=Math.max(0,Math.min(1,(now-d.sys.sunrise)/(d.sys.sunset-d.sys.sunrise)));
  const arcEl=document.getElementById('arcFill');if(arcEl)arcEl.style.strokeDashoffset=120-(prog*80);
  const dotEl=document.getElementById('arcDot');
  if(dotEl){const angle=Math.PI*(1-prog);dotEl.setAttribute('cx',(40+36*Math.cos(angle)).toFixed(1));dotEl.setAttribute('cy',(44-22*Math.sin(angle)).toFixed(1))}
  const moon=moonPhase(); set('moonEmoji',moon.e); set('moonName',moon.n); set('moonIllum',moon.i+'% illuminated');
  const deg=d.wind.deg||0;
  const nl=document.getElementById('needleLg');if(nl)nl.style.transform=`rotate(${deg}deg)`;
  const wkmh=d.wind.speed*3.6;
  set('windDirLg',windDir(deg));
  set('windSpeedLg',units==='mph'?(wkmh*.621371).toFixed(1)+' mph':wkmh.toFixed(1)+' km/h');
}

/* ═════════════ WIDGETS ═════════════ */
function renderWidgets(d,realUV=0,realAQI=1){
  const cl=(d.clouds&&d.clouds.all!==undefined)?d.clouds.all:0;
  set('cloudVal',cl+'%'); const cloudBar=document.getElementById('cloudBar');if(cloudBar)cloudBar.style.width=cl+'%';
  const uv=parseFloat(realUV)||0,uvR=Math.round(uv);
  const uvLbls=['Low','Low','Moderate','Moderate','High','High','V.High','V.High','Extreme','Extreme','Extreme'];
  const uvCols=['var(--emerald)','var(--emerald)','var(--gold)','var(--gold)','var(--storm)','var(--storm)','var(--storm)','var(--storm)','#e0244a','#e0244a','#e0244a'];
  const si=Math.min(uvR,10);
  set('uvVal',uvR); set('uvLbl',(uvLbls[si]||'Extreme')+' · Peak today');
  set('heroUV',uvR); // Update hero UV pill
  const uvEl=document.getElementById('uvVal');if(uvEl)uvEl.style.color=uvCols[si]||'#e0244a';
  const uvBar=document.getElementById('uvBar');if(uvBar)uvBar.style.width=Math.min((uv/11)*100,100)+'%';
  const aq=Math.max(1,Math.min(5,realAQI));
  const aqM={1:{l:'Good',c:'var(--emerald)'},2:{l:'Fair',c:'var(--ice)'},3:{l:'Moderate',c:'var(--gold)'},4:{l:'Poor',c:'var(--storm)'},5:{l:'Hazardous',c:'#a010c0'}};
  set('aqiVal',aqM[aq].l); set('aqiSub','Live PM2.5 AQI');
  const aqEl=document.getElementById('aqiVal');if(aqEl)aqEl.style.color=aqM[aq].c;
  const aqiBar=document.getElementById('aqiBar');if(aqiBar){aqiBar.style.width=(aq/5*100)+'%';aqiBar.style.background=aqM[aq].c}
  const dew=Math.round(d.main.temp-(100-d.main.humidity)/5);
  const dewD=units==='F'?Math.round(dew*9/5+32):dew;
  set('dewVal',dewD+'°'); set('dewComfort',dew<10?'Dry & Comfortable':dew<16?'Comfortable':dew<21?'Somewhat Humid':dew<24?'Humid':'Very Humid');
  const dewBar=document.getElementById('dewBar');if(dewBar)dewBar.style.width=Math.min(((dew+10)/45)*100,100)+'%';
}

/* ═════════════ WIND PANEL ═════════════ */
function renderWindPanel(d){
  const wkmh=d.wind.speed*3.6,gkmh=(d.wind.gust||d.wind.speed)*3.6;
  const wD=units==='mph'?(wkmh*.621371).toFixed(1):wkmh.toFixed(1);
  const gD=units==='mph'?(gkmh*.621371).toFixed(1):gkmh.toFixed(1);
  set('windKmh',wD); set('windSpdUnit',units==='mph'?'mph Speed':'km/h Speed');
  set('windMs',d.wind.speed.toFixed(1)+' m/s'); set('gustKmh',gD);
  set('gustUnit',units==='mph'?'mph Gusts':'km/h Gusts');
  set('windDirFull',windDir(d.wind.deg||0)+' direction');
  const bft=wkmh<1?0:wkmh<6?1:wkmh<12?2:wkmh<20?3:wkmh<29?4:wkmh<39?5:wkmh<50?6:wkmh<62?7:wkmh<75?8:wkmh<89?9:wkmh<103?10:wkmh<117?11:12;
  const bftN=['Calm','Light Air','Light Breeze','Gentle Breeze','Moderate Breeze','Fresh Breeze','Strong Breeze','Near Gale','Gale','Strong Gale','Storm','Violent Storm','Hurricane'];
  set('bftNum',bft); set('bftDesc',bftN[bft]);
  const b=document.getElementById('windBftBar');if(b)b.style.width=Math.min((bft/12)*100,100)+'%';
}

/* ═════════════ HUMIDITY PANEL ═════════════ */
function renderHumidPanel(d){
  const h=d.main.humidity,dew=Math.round(d.main.temp-(100-h)/5);
  const dewD=units==='F'?Math.round(dew*9/5+32):dew;
  set('humidPct',h+'%'); set('humidCat',h<30?'Very Dry':h<50?'Dry':h<60?'Comfortable':h<70?'Slightly Humid':'Very Humid');
  set('dewPtFull',dewD+'°'); set('dewCat',dew<10?'Dry':dew<13?'Comfortable':dew<16?'Slightly Humid':dew<18?'Humid':'Oppressive');
  set('comfortLabel',dew<10?'Dry & Pleasant':dew<16?'Comfortable':dew<21?'Somewhat Sticky':dew<24?'Humid':'Oppressive');
  const b=document.getElementById('humidBar2');if(b)b.style.width=Math.min((h/100)*100,100)+'%';
}

/* ═════════════ PRESSURE PANEL (moved above) ═════════════ */

/* ═════════════ HEAT INDEX PANEL ═════════════ */
function renderHeatPanel(d){
  const feels=Math.round(d.main.feels_like),actual=Math.round(d.main.temp),diff=feels-actual;
  const feelsD=units==='F'?Math.round(feels*9/5+32):feels;
  const actualD=units==='F'?Math.round(actual*9/5+32):actual;
  set('heatFeelsVal',feelsD); set('heatActual',actualD+'°');
  set('heatDiff','Diff: '+(diff>=0?'+':'')+diff+'°C');
  const cat=feels<0?'Freezing':feels<10?'Cold':feels<18?'Cool':feels<24?'Comfortable':feels<28?'Warm':feels<33?'Hot':'Very Hot';
  set('heatCategory',cat);
  const col=feels<10?'var(--ice)':feels<18?'var(--blue)':feels<24?'var(--emerald)':feels<28?'var(--gold)':'var(--storm)';
  const hc=document.getElementById('heatCircle');if(hc)hc.style.borderColor=col;
  const hb=document.getElementById('heatBar');if(hb)hb.style.width=Math.min(Math.max(((feels+10)/55)*100,0),100)+'%';
}

/* ═════════════ AQI BREAKDOWN PANEL ═════════════ */
function renderAQIPanel(comp){
  const tb=document.querySelector('#aqiTable tbody');if(!tb)return;
  if(!comp){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);font-size:.8rem;padding:1rem">No pollutant data available</td></tr>';return}
  const pollutants=[
    {key:'pm2_5',name:'PM2.5',unit:'µg/m³',limit:15,good:15,mod:35},
    {key:'pm10',name:'PM10',unit:'µg/m³',limit:45,good:45,mod:100},
    {key:'no2',name:'NO₂',unit:'µg/m³',limit:25,good:25,mod:200},
    {key:'o3',name:'O₃',unit:'µg/m³',limit:100,good:100,mod:180},
    {key:'co',name:'CO',unit:'µg/m³',limit:4000,good:4000,mod:10000}
  ];
  tb.innerHTML=pollutants.map(p=>{
    const val=comp[p.key]??0,pct=Math.min((val/p.limit)*70,100);
    const status=val<p.good?'Good':val<p.mod?'Moderate':'High';
    const col=val<p.good?'var(--emerald)':val<p.mod?'var(--gold)':'var(--storm)';
    return `<tr><td class="at-name">${p.name}</td><td class="at-val" style="color:${col}">${val.toFixed(1)}</td><td class="at-unit">${p.unit}</td><td class="at-bar-cell"><div class="aqi-mini-bar"><div class="aqi-mini-fill" style="width:${pct}%;background:${col}"></div></div></td><td class="at-status" style="color:${col}">${status}</td></tr>`;
  }).join('');
}

/* ═════════════ FORECAST ═════════════ */
function renderFC(data){
  const daily=data.list.filter((_,i)=>i%8===0).slice(0,5),el=document.getElementById('fcList');el.innerHTML='';
  daily.forEach(d=>{
    const date=new Date(d.dt*1000).toLocaleDateString('en-US',{weekday:'short',day:'numeric'}),pop=Math.round((d.pop||0)*100);
    const tD=units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp);
    const row=document.createElement('div');row.className='fc-row';
    row.innerHTML=`<span class="fc-day">${date}</span><img class="fc-img" src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png" alt="${d.weather[0].description}"><span class="fc-desc">${d.weather[0].main}</span><span class="fc-pop">${pop>5?`<i class="fas fa-droplet"></i>${pop}%`:'—'}</span><span class="fc-t">${tD}°</span>`;
    el.appendChild(row);
  });
}
function buildHourly(data){
  const el=document.getElementById('hourlyTable');if(!el)return;el.innerHTML='';
  data.list.slice(0,12).forEach(d=>{
    const hour=new Date(d.dt*1000).getHours(),pop=Math.round((d.pop||0)*100);
    const tD=units==='F'?Math.round(d.main.temp*9/5+32):Math.round(d.main.temp);
    const div=document.createElement('div');div.className='hr-item';
    div.innerHTML=`<div class="hr-time">${hour}:00</div><i class="fas ${ICONS[d.weather[0].icon]||'fa-cloud'} hr-ico"></i><div class="hr-temp">${tD}°</div><div class="hr-pop">${pop>5?pop+'%':''}</div>`;
    el.appendChild(div);
  });
}

/* ═════════════ 10-DAY FORECAST ═════════════ */
function render10Day(f10){
  const el=document.getElementById('f10Grid');if(!el||!f10||!f10.daily){if(el)el.innerHTML='<div style="font-family:JetBrains Mono,monospace;font-size:.7rem;color:var(--muted);padding:.5rem">10-day data unavailable</div>';return;}el.innerHTML='';
  const{time,temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode}=f10.daily;
  time.slice(0,10).forEach((t,i)=>{
    const d=new Date(t),name=i===0?'Today':i===1?'Tom':d.toLocaleDateString('en-US',{weekday:'short'});
    const hi=units==='F'?Math.round(temperature_2m_max[i]*9/5+32):Math.round(temperature_2m_max[i]);
    const lo=units==='F'?Math.round(temperature_2m_min[i]*9/5+32):Math.round(temperature_2m_min[i]);
    const wc=weathercode[i]||0,icon=WMO_ICONS[wc]||'fa-cloud';
    const pop=precipitation_probability_max[i]||0;
    const div=document.createElement('div');div.className='f10-day';
    div.innerHTML=`<div class="f10-name">${name}</div><i class="fas ${icon} f10-ico"></i><div class="f10-hi">${hi}°</div><div class="f10-lo">${lo}°</div><div class="f10-rain">${pop>10?pop+'%':''}</div>`;
    el.appendChild(div);
  });
}

/* ═════════════ CHART ═════════════ */
function setChart(m,btn){chartM=m;document.querySelectorAll('.ctog').forEach(b=>b.classList.remove('act'));btn.classList.add('act');if(_fore)buildChart(_fore)}
function buildChart(data){
  const canvas=document.getElementById('hrChart');if(!canvas||typeof Chart==='undefined')return;
  const ctx=canvas.getContext('2d'),pts=data.list.slice(0,10),labels=pts.map(p=>new Date(p.dt*1000).getHours()+':00');
  let d1,d2,c1,c2,l1,l2;
  if(chartM==='temp'){d1=pts.map(p=>p.main.temp);d2=pts.map(p=>p.main.feels_like);c1=isDark?'#f0f4ff':'#1b6ab0';c2=isDark?'rgba(104,176,228,.75)':'rgba(20,130,196,.55)';l1='Temp °C';l2='Feels Like'}
  else if(chartM==='humidity'){d1=pts.map(p=>p.main.humidity);d2=pts.map(p=>Math.round(p.main.temp-(100-p.main.humidity)/5));c1=isDark?'#f0f4ff':'#1482c4';c2=isDark?'rgba(74,140,196,.5)':'rgba(27,106,176,.5)';l1='Humidity %';l2='Dew Point °C'}
  else{d1=pts.map(p=>+(p.wind.speed*3.6).toFixed(1));d2=pts.map(p=>+(p.wind.gust||p.wind.speed*3.6).toFixed(1));c1=isDark?'#f0f4ff':'#1482c4';c2=isDark?'rgba(74,140,196,.5)':'rgba(27,106,176,.5)';l1='Wind km/h';l2='Gusts km/h'}
  const gr=ctx.createLinearGradient(0,0,0,200);
  gr.addColorStop(0,isDark?'rgba(255,255,255,.14)':'rgba(27,106,176,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');
  if(chart){chart.destroy();chart=null}
  const tc=isDark?'#7ba8c6':'#264260',grid=isDark?'rgba(255,255,255,.03)':'rgba(0,0,0,.05)',bg=isDark?'rgba(5,9,26,.96)':'rgba(255,255,255,.96)';
  chart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:l1,data:d1,borderColor:c1,backgroundColor:gr,borderWidth:2.3,fill:true,tension:.42,pointRadius:4,pointBackgroundColor:c1,pointBorderColor:isDark?'#05091a':'#fff',pointBorderWidth:2},{label:l2,data:d2,borderColor:c2,backgroundColor:'transparent',borderWidth:2,fill:false,tension:.42,borderDash:[5,4],pointRadius:3,pointBackgroundColor:c2,pointBorderColor:isDark?'#05091a':'#fff',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',align:'end',labels:{color:tc,font:{family:'JetBrains Mono',size:10},boxWidth:10,usePointStyle:true}},tooltip:{mode:'index',intersect:false,backgroundColor:bg,borderColor:grid,borderWidth:1,titleColor:tc,bodyColor:tc,titleFont:{family:'Exo 2',size:13},bodyFont:{family:'JetBrains Mono',size:11},padding:12,cornerRadius:12}},scales:{x:{grid:{color:grid},ticks:{color:tc,font:{family:'JetBrains Mono',size:10}}},y:{grid:{color:grid},ticks:{color:tc,font:{family:'JetBrains Mono',size:10}},border:{display:false}}},interaction:{mode:'nearest',axis:'x',intersect:false}}});
}

/* ═════════════ MAP ═════════════ */
function loadMap(){const f=document.getElementById('wFrame');if(f)f.src=`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&overlay=${ov}&product=ecmwf&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`}
function syncMapPills(){document.querySelectorAll('.mp-btn').forEach(b=>b.classList.toggle('act',b.textContent.trim().toLowerCase()===ov))}
function setOv(type,btn){ov=type;loadMap();if(btn){document.querySelectorAll('.mp-btn').forEach(b=>b.classList.remove('act'));btn.classList.add('act')}else syncMapPills()}

/* ═════════════ SEARCH & GEO ═════════════ */
async function doSearch(){
  const q=document.getElementById('cityIn').value.trim();if(!q)return;spin(true);hideAcList();
  try{const r=await fetch(`/api/weather?q=${encodeURIComponent(q)}`);if(!r.ok)throw new Error('not found');const d=await r.json();lat=d.coord.lat;lon=d.coord.lon;loadMap();await fetchW(lat,lon,d.name);document.getElementById('cityIn').value=''}
  catch(e){showToast('City not found. Check spelling.','error')}finally{spin(false)}
}

/* ═════════════ COUNTERS ═════════════ */
function runCounters(){document.querySelectorAll('.ctr').forEach(el=>{const t=+el.dataset.t;let c=0;const inc=t/65;const tick=()=>{c+=inc;if(c<t){el.textContent=Math.ceil(c).toLocaleString();requestAnimationFrame(tick)}else{el.textContent=t.toLocaleString()+(t>100?'+':'%')}};tick()})}

/* ═════════════ TIME FORMAT ═════════════ */
function setTimeFmt(fmt){
  timeFmt=fmt;
  const btn12=document.getElementById('btn12h'),btn24=document.getElementById('btn24h');
  if(btn12){btn12.classList.toggle('act',fmt==='12h');btn12.setAttribute('aria-pressed',fmt==='12h')}
  if(btn24){btn24.classList.toggle('act',fmt==='24h');btn24.setAttribute('aria-pressed',fmt==='24h')}
  localStorage.setItem('sl_timefmt',fmt);
  if(_lastWeatherData)renderSunMoon(_lastWeatherData);
  tick();
}
function fmtTime(ms){
  const d=new Date(ms);
  if(timeFmt==='24h')return d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}

/* ═════════════ SHARE WEATHER ═════════════ */
async function shareWeather(){
  const city=(document.getElementById('hCity')?.textContent||'').trim();
  const url=`${location.origin}${location.pathname}?lat=${(+lat).toFixed(3)}&lon=${(+lon).toFixed(3)}&city=${encodeURIComponent(city)}`;
  if(navigator.share){
    try{await navigator.share({title:'skyLens Weather',text:`Weather in ${city} on skyLens`,url});return}catch(e){if(e&&e.name==='AbortError')return}
  }
  try{await navigator.clipboard.writeText(url);showToast('Link copied to clipboard!','success')}
  catch(e){showToast('Copy this link: '+url,'success')}
}

/* ═════════════ HERO SEARCH ═════════════ */
async function heroSearch(){
  const inp=document.getElementById('heroCityIn');if(!inp)return;
  const q=inp.value.trim();if(!q)return;
  try{
    const r=await fetch(`/api/weather?q=${encodeURIComponent(q)}`);
    if(!r.ok)throw new Error();
    const d=await r.json();
    lat=d.coord.lat;lon=d.coord.lon;
    inp.value='';
    fetchW(lat,lon,d.name);
  }catch(e){showToast('City not found.','error')}
}

/* ═════════════ ASTRONOMY PANEL ═════════════ */
function renderAstroPanel(d){
  const tz=d.timezone,off=new Date().getTimezoneOffset()*60;
  const rMs=(d.sys.sunrise+tz+off)*1000,sMs=(d.sys.sunset+tz+off)*1000;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('astroSunrise',fmtTime(rMs));
  set('astroSunset',fmtTime(sMs));
  const dlMin=Math.round((d.sys.sunset-d.sys.sunrise)/60);
  set('astroDayLen',`${Math.floor(dlMin/60)}h ${dlMin%60}m`);
  // Golden hour = 1 hour after sunrise
  set('astroGolden',fmtTime(rMs+3600000));
  const moon=moonPhase();
  set('astroMoonPhase',moon.e);
  set('astroMoonName',moon.n);
  set('astroMoonIllum',moon.i+'% lit');
}


/* ═════════════ QUIZ ENGINE ═════════════ */
const QUIZZES={
  localwind:[
    {q:'What drives a sea breeze during the day?',opts:['Land heating faster than water','Water heating faster than land','The jet stream','Ocean currents'],ans:0,exp:'Land heats up faster than water, so warm rising air over land draws in cooler air from the sea.'},
    {q:'What is a katabatic wind?',opts:['A warm upslope daytime wind','A cool wind that sinks downslope, usually at night','A wind found only at sea','Another name for the jet stream'],ans:1,exp:'As mountain air cools after sunset, it becomes denser and flows downhill under gravity — a katabatic wind.'},
    {q:'What causes a Foehn/Chinook wind to warm so dramatically?',opts:['Friction with the ground','Adiabatic compression as air descends the leeward side','Direct sunlight','Ocean evaporation'],ans:1,exp:'Air that\'s already lost its moisture climbing the windward slope compresses and warms rapidly as it descends the other side.'},
    {q:'What is the world record for the fastest 24-hour temperature rise, set by a Chinook wind in Loma, Montana in 1972?',opts:['25°F','60°F','103°F','150°F'],ans:2,exp:'Temperatures in Loma jumped from -54°F to 49°F in 24 hours — a 103°F swing, still the record today.'}
  ],
  aurora:[
    {q:'What actually causes the aurora?',opts:['Reflected moonlight','Charged solar particles colliding with atmospheric gases','Lightning in the upper atmosphere','City lights bouncing off clouds'],ans:1,exp:'Solar wind particles funnel along Earth\'s magnetic field lines toward the poles and collide with oxygen and nitrogen, exciting them to emit light.'},
    {q:'Which gas produces the common green aurora color?',opts:['Nitrogen','Hydrogen','Oxygen at low altitude','Helium'],ans:2,exp:'Oxygen atoms around 100–150km altitude produce the familiar green glow — the most common aurora color.'},
    {q:'What is a coronal mass ejection (CME)?',opts:['A type of aurora','A burst of solar plasma and magnetic field from the sun','A satellite malfunction','A polar wind pattern'],ans:1,exp:'A CME is a massive eruption of plasma from the sun\'s corona — when Earth-directed, it can trigger a geomagnetic storm.'},
    {q:'How far south was the aurora visible during the May 2024 "Gannon" storm?',opts:['Only within the Arctic Circle','Northern Canada','As far south as Mexico','It was not visible from Earth'],ans:2,exp:'The strongest geomagnetic storm in over two decades pushed the aurora to unusually low latitudes, with sightings reported as far south as Mexico.'}
  ],
  heat:[
    {q:'What is the Urban Heat Island effect?',opts:['Cities being cooler than rural areas','Cities being hotter than surrounding rural areas','A type of heat wave','Ocean warming near coastal cities'],ans:1,exp:'Dense building materials absorb and re-radiate heat, and less vegetation means less natural cooling — making cities measurably hotter than the countryside around them.'},
    {q:'According to EPA data, how much warmer can urban nighttime temperatures get versus rural areas, at the extreme?',opts:['2°F','10°F','Up to 22°F','50°F'],ans:2,exp:'Under calm, clear conditions, the urban-rural temperature gap can reach as much as 22°F after sunset, since cities retain stored heat longer than open land.'},
    {q:'Who first documented the urban heat island effect, in 1833?',opts:['Luke Howard','Gordon Manley','Vilhelm Bjerknes','James Glaisher'],ans:0,exp:'Luke Howard compared air temperatures in central London to the surrounding countryside — one of the earliest documented observations of the effect.'},
    {q:'Which surface contributes most to daytime urban heat absorption?',opts:['Grass','Open water','Asphalt and pavement','Tree canopy'],ans:2,exp:'Dark, dense surfaces like asphalt absorb far more solar energy than vegetation or water, then re-release it as heat.'}
  ],
  hail:[
    {q:'What is the world record diameter for a single hailstone?',opts:['4 inches (10 cm)','6 inches (15 cm)','8 inches (20 cm)','12 inches (30 cm)'],ans:2,exp:'An 8-inch hailstone fell near Vivian, South Dakota in 2010 — the largest ever officially recorded.'},
    {q:'What causes a hailstone to grow larger inside a storm?',opts:['Falling through rain','Repeated cycles through the updraft','Ground-level freezing','Wind alone'],ans:1,exp:'Strong updrafts carry the ice pellet up and down repeatedly, adding a new layer of ice each pass.'},
    {q:'What distinguishes sleet from freezing rain?',opts:['Sleet refreezes before reaching the ground','Sleet only falls in summer','Freezing rain is warmer','There is no difference'],ans:0,exp:'Sleet passes through a deep enough cold layer to refreeze into ice pellets before landing; freezing rain stays liquid until it hits a surface below freezing.'},
    {q:'What updraft strength is generally needed to support large hail?',opts:['20 km/h','50 km/h','100+ km/h','No updraft needed'],ans:2,exp:'Sustained updrafts over 100 km/h are typically required to keep large hailstones suspended long enough to grow.'}
  ],
  cyclones:[
    {q:'What minimum sea surface temperature is required for tropical cyclogenesis?',opts:['20°C','26.5°C','30°C','15°C'],ans:1,exp:'Cyclones need SST above 26.5°C to sustain convection and latent heat release.'},
    {q:'In which direction do Northern Hemisphere cyclones rotate?',opts:['Clockwise','Counter-clockwise','Depends on season','No rotation'],ans:1,exp:'The Coriolis effect causes counter-clockwise rotation in the Northern Hemisphere.'},
    {q:'What is the minimum wind speed for a Category 1 hurricane?',opts:['100 km/h','119 km/h','150 km/h','90 km/h'],ans:1,exp:'The Saffir-Simpson scale starts at 119 km/h for Category 1.'},
    {q:'What is the calm center of a tropical cyclone called?',opts:['The core','The vortex','The eye','The anvil'],ans:2,exp:'The eye is the calm, clear center with the lowest pressure in the cyclone.'},
    {q:'What energy source powers tropical cyclones?',opts:['Solar radiation','Latent heat from ocean evaporation','Wind shear','Cold air masses'],ans:1,exp:'Cyclones are heat engines powered by latent heat released when moist ocean air condenses.'}
  ],
  clouds:[
    {q:'At what altitude do high-level clouds like Cirrus form?',opts:['Below 2,000m','2,000–6,000m','Above 6,000m','At sea level'],ans:2,exp:'High-level clouds (Cirrus, Cirrostratus, Cirrocumulus) form above 6,000m and consist mostly of ice crystals.'},
    {q:'Which cloud type spans all altitude layers and causes thunderstorms?',opts:['Stratus','Altocumulus','Nimbostratus','Cumulonimbus'],ans:3,exp:'Cumulonimbus is a vertical cloud spanning surface to stratosphere, responsible for thunderstorms and hail.'},
    {q:'What do Cirrus clouds typically signal?',opts:['Immediate rain','Fair weather','Approaching frontal system in 24–48h','Fog overnight'],ans:2,exp:'Cirrus filaments often indicate an approaching warm front 24–48 hours in advance.'},
    {q:'How many main cloud genera are there?',opts:['5','8','10','12'],ans:2,exp:'The WMO classifies clouds into 10 main genera based on altitude and physical form.'},
    {q:'Which low-level cloud is associated with continuous drizzle?',opts:['Stratus','Cumulus','Cirrostratus','Altocumulus'],ans:0,exp:'Stratus clouds form a grey uniform layer below 2,000m and are associated with drizzle and overcast skies.'}
  ],
  wind:[
    {q:'What effect causes winds to deflect to the right in the Northern Hemisphere?',opts:['Gravity','Coriolis effect','Jet stream','Trade winds'],ans:1,exp:'The Coriolis effect, caused by Earth rotation, deflects moving air to the right in the Northern Hemisphere.'},
    {q:'Between which latitudes do trade winds blow?',opts:['0°–10°','0°–30°','30°–60°','60°–90°'],ans:1,exp:'Trade winds blow from the subtropical high pressure zones toward the equator, between 0° and 30° latitude.'},
    {q:'What are the fast-moving air currents in the upper atmosphere called?',opts:['Trade winds','Monsoons','Jet streams','Cyclones'],ans:2,exp:'Jet streams are narrow bands of fast-moving air at high altitude that influence surface weather patterns.'},
    {q:'What are the three main atmospheric circulation cells?',opts:['Polar, Tropical, Monsoon','Hadley, Ferrel, Polar','Trade, Westerly, Polar','ITCZ, Ferrel, Arctic'],ans:1,exp:'The three circulation cells are the Hadley cell (0–30°), Ferrel cell (30–60°), and Polar cell (60–90°).'},
    {q:'Where does the Intertropical Convergence Zone (ITCZ) form?',opts:['60°N','30°N','Near the equator','The poles'],ans:2,exp:'The ITCZ is a belt of low pressure near the equator where trade winds converge, causing heavy rainfall.'}
  ],
  storms:[
    {q:'What type of storm cell is most dangerous and long-lived?',opts:['Single cell','Multi-cell','Squall line','Supercell'],ans:3,exp:'Supercells are the most severe thunderstorm type, featuring a rotating updraft (mesocyclone) and lasting 6+ hours.'},
    {q:'What is the return stroke in a lightning bolt?',opts:['Cloud-to-cloud discharge','The initial leader','The visible bright flash upward from ground','Thunder'],ans:2,exp:'The visible lightning flash is the return stroke — a powerful upward surge of current from ground to cloud.'},
    {q:'What is the name for hail-producing updraft speeds?',opts:['Below 10 m/s','50–100 mph','Above 160 km/h','Any wind speed'],ans:2,exp:'Hail requires strong updrafts exceeding 160 km/h to suspend ice pellets while they grow in the storm.'},
    {q:'What differentiates a severe thunderstorm from an ordinary one?',opts:['It occurs at night','Wind ≥93 km/h or hail ≥2.5cm or tornado','It lasts more than 2 hours','It produces lightning'],ans:1,exp:'A storm is classified severe if it produces winds ≥93 km/h, hail ≥2.5cm diameter, or a tornado.'},
    {q:'What atmospheric condition suppresses thunderstorm development?',opts:['High humidity','High vertical wind shear','Warm sea surface','Unstable air'],ans:1,exp:'High vertical wind shear tilts and disrupts updrafts, preventing organized thunderstorm development.'}
  ],
  optics:[
    {q:'What causes a rainbow to form?',opts:['Reflection off clouds','Refraction and reflection of light in water droplets','Diffraction by ice crystals','Dust particles in air'],ans:1,exp:'Rainbows form when sunlight enters water droplets, refracts, reflects internally, and exits at different angles for each color.'},
    {q:'At what angle from the antisolar point does the primary rainbow appear?',opts:['22°','42°','60°','90°'],ans:1,exp:'The primary rainbow appears at about 42° from the antisolar point (the point opposite the sun from the observer).'},
    {q:'What atmospheric phenomenon creates halos around the sun or moon?',opts:['Water droplets','Dust particles','Hexagonal ice crystals','Ozone layer'],ans:2,exp:'Halos are caused by refraction of light through hexagonal ice crystals in cirrus clouds at high altitude.'},
    {q:'What is a "sun dog" (parhelion)?',opts:['A bright spot near the sun caused by ice crystal refraction','A solar flare','A type of rainbow','A reflection off water'],ans:0,exp:'Sun dogs are bright spots at 22° to the left and right of the sun, caused by plate-shaped ice crystals.'},
    {q:'Why is the sky blue?',opts:['Water vapor absorbs red light','The ocean reflects blue light upward','Rayleigh scattering of sunlight by air molecules','Ozone absorbs other colors'],ans:2,exp:'Rayleigh scattering causes air molecules to scatter shorter blue wavelengths much more than longer red wavelengths.'}
  ],
  climate:[
    {q:'What does El Niño refer to?',opts:['A cold phase of the Pacific','Unusual warming of central/eastern Pacific','An Atlantic hurricane','A polar vortex event'],ans:1,exp:'El Niño is the warm phase of ENSO — unusual warming of the central and eastern tropical Pacific Ocean.'},
    {q:'What is the threshold for classifying an El Niño event?',opts:['Niño 3.4 anomaly > +0.3°C','Niño 3.4 anomaly > +0.5°C','Sea surface temp > 28°C','Wind anomaly > 5 m/s'],ans:1,exp:'An El Niño event is declared when the Niño 3.4 region sea surface temperature anomaly exceeds +0.5°C for 5+ months.'},
    {q:'La Niña is associated with which Pacific conditions?',opts:['Warmer than average SSTs','Cooler than average SSTs','No change in SSTs','Higher sea levels'],ans:1,exp:'La Niña features cooler than average SSTs in the central and eastern Pacific, the opposite of El Niño.'},
    {q:'How often does the ENSO cycle typically repeat?',opts:['Every year','Every 2–3 months','Every 2–7 years','Every 10–15 years'],ans:2,exp:'The El Niño / La Niña cycle typically repeats irregularly every 2 to 7 years.'},
    {q:'Which global climate teleconnection affects the North Atlantic region?',opts:['ENSO','PDO','NAO (North Atlantic Oscillation)','IOD'],ans:2,exp:'The North Atlantic Oscillation (NAO) is a major climate driver affecting temperature and precipitation across Europe and North America.'}
  ],
  tornado:[
    {q:'What scale is used to rate tornado intensity in the USA?',opts:['Saffir-Simpson','Beaufort','Enhanced Fujita (EF)','Richter'],ans:2,exp:'The Enhanced Fujita (EF) scale rates tornadoes from EF0 (weakest) to EF5 (strongest) based on wind damage.'},
    {q:'What is the rotating column of air in a supercell called?',opts:['Funnel cloud','Mesocyclone','Downburst','Gust front'],ans:1,exp:'A mesocyclone is the rotating updraft within a supercell thunderstorm — the precursor to tornado formation.'},
    {q:'What wind speeds define an EF5 tornado?',opts:['Over 200 km/h','Over 260 km/h','Over 322 km/h','Over 400 km/h'],ans:2,exp:'EF5 tornadoes have wind speeds exceeding 322 km/h (200 mph) and cause incredible destruction.'},
    {q:'Which US region is known as "Tornado Alley"?',opts:['Pacific Coast','New England','Central Great Plains','Southeast'],ans:2,exp:'Tornado Alley covers the central Great Plains — Texas, Oklahoma, Kansas, Nebraska — where cold and warm air masses clash.'},
    {q:'A funnel cloud becomes a tornado when it:',opts:['Reaches 1km width','Touches the ground','Rotates faster than 100 km/h','Produces lightning'],ans:1,exp:'A funnel cloud is officially classified as a tornado only when the rotating column makes contact with the ground.'}
  ],
  monsoon:[
    {q:'What drives the South Asian monsoon?',opts:['Ocean currents','Differential heating of land and sea','Polar vortex','El Niño alone'],ans:1,exp:'The monsoon is driven by differential heating — land heats faster than the ocean, creating pressure gradients that pull moist air inland.'},
    {q:'When does the Southwest Monsoon typically arrive in India?',opts:['March','June','September','December'],ans:1,exp:'The Southwest Monsoon typically arrives on the Kerala coast around June 1 and advances northward over the following weeks.'},
    {q:'What percentage of India annual rainfall comes from the monsoon?',opts:['20–30%','40–50%','70–80%','90–95%'],ans:2,exp:'The Southwest Monsoon delivers approximately 70–80% of India total annual rainfall between June and September.'},
    {q:'What is the dry Northeast Monsoon associated with?',opts:['Heavy rainfall across India','Dry conditions in South Asia','Rainfall in southeastern India and Sri Lanka','Snowfall in the Himalayas'],ans:2,exp:'The Northeast Monsoon (Oct–Dec) brings rainfall to southeastern India and Sri Lanka as winds reverse direction.'},
    {q:'A "break" in the monsoon refers to:',opts:['The end of the monsoon season','A sudden intensification','A temporary dry spell during active monsoon','Monsoon failing entirely'],ans:2,exp:'Monsoon breaks are temporary dry spells (3–7 days) during the active monsoon season, often associated with northward shifts of the trough.'}
  ],
  fog:[
    {q:'What type of fog forms when warm moist air moves over a cold surface?',opts:['Radiation fog','Advection fog','Steam fog','Upslope fog'],ans:1,exp:'Advection fog forms when warm moist air moves horizontally over a cold surface, cooling the air below its dew point.'},
    {q:'When does radiation fog typically form?',opts:['During the day','After heavy rain','On clear calm nights','In windy conditions'],ans:2,exp:'Radiation fog forms on clear, calm nights when the ground loses heat rapidly by radiation, cooling the air near the surface.'},
    {q:'What visibility classifies conditions as "fog"?',opts:['Less than 5 km','Less than 2 km','Less than 1 km','Less than 200m'],ans:2,exp:'Fog is officially defined as visibility reduced to less than 1 km (1,000 metres) by water droplets suspended in air.'},
    {q:'What is "sea smoke" or "Arctic sea smoke"?',opts:['Advection fog over oceans','Steam fog over cold ocean water','Industrial pollution','Low stratus clouds'],ans:1,exp:'Sea smoke (steam fog) forms when very cold air moves over relatively warm open water, causing rapid evaporation and condensation.'},
    {q:'How does fog differ from a stratus cloud?',opts:['Fog is denser','Fog contains larger droplets','Fog is a cloud touching the ground','They are identical'],ans:2,exp:'Fog and stratus are physically identical — suspended water droplets. The difference is purely positional: fog touches the surface.'}
  ]
};

const quizState={};

function initQuiz(topic){
  if(!QUIZZES[topic])return;
  quizState[topic]={idx:0,shuffled:[...QUIZZES[topic]].sort(()=>Math.random()-.5)};
  renderQuiz(topic);
}

// Map topic key → HTML element ID prefix
const QUIZ_ID={localwind:'LWind',aurora:'Aurora',heat:'Heat',hail:'Hail',cyclones:'Cycl',clouds:'Clouds',wind:'Wind',storms:'Storms',optics:'Optics',climate:'Climate',tornado:'Tornado',monsoon:'Monsoon',fog:'Fog'};

function renderQuiz(topic){
  const s=quizState[topic];
  if(!s)return;
  const q=s.shuffled[s.idx%s.shuffled.length];
  const pfx=QUIZ_ID[topic];if(!pfx)return;
  const qEl=document.getElementById('q'+pfx+'Q');
  const optsEl=document.getElementById('q'+pfx+'Opts');
  const fbEl=document.getElementById('q'+pfx+'Fb');
  if(!qEl||!optsEl||!fbEl)return;
  qEl.textContent=q.q;
  optsEl.innerHTML=q.opts.map((o,i)=>
    `<button class="quiz-opt" onclick="answerQuiz('${topic}',${i},this)">${o}</button>`
  ).join('');
  fbEl.textContent='';
}

function answerQuiz(topic,chosen,btn){
  const s=quizState[topic];if(!s)return;
  const q=s.shuffled[s.idx%s.shuffled.length];
  const pfx=QUIZ_ID[topic];if(!pfx)return;
  document.querySelectorAll(`#quiz-${topic} .quiz-opt`).forEach(b=>{b.disabled=true;b.style.pointerEvents='none'});
  const fbEl=document.getElementById('q'+pfx+'Fb');
  const optsEl=document.getElementById('q'+pfx+'Opts');
  if(chosen===q.ans){
    btn.classList.add('correct');
    if(fbEl)fbEl.textContent='Correct! '+q.exp;
  } else {
    btn.classList.add('wrong');
    if(optsEl)optsEl.querySelectorAll('.quiz-opt')[q.ans].classList.add('correct');
    if(fbEl)fbEl.textContent='Not quite. '+q.exp;
  }
}

function nextQuiz(topic){
  if(!quizState[topic])return;
  quizState[topic].idx++;
  renderQuiz(topic);
}

/* ═════════════ AUTH STATE ═════════════ */
// We store the JWT token in memory (safer than localStorage for tokens)
// The user object holds email and favorites after login
let authToken = null;
let currentUser = null;

function setToken(token) { authToken = token; }
function clearToken() { authToken = null; currentUser = null; }

/* ═════════════ AUTH API CALLS ═════════════ */
// Sign up a new user
async function apiSignup(email, password) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Signup failed');
  return data; // { token, user }
}

// Log in an existing user
async function apiLogin(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data; // { token, user }
}

// Save a city to favorites (requires being logged in)
async function apiSaveFavorite(cityName, lt, ln) {
  if (!authToken) { showToast('Log in to save favorites', 'error'); return; }
  const res = await fetch('/api/auth/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}` // Send our token as proof of identity
    },
    body: JSON.stringify({ name: cityName, lat: lt, lon: ln })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save');
  currentUser = data.user;
  renderFavorites();
  showToast(`${cityName} saved to favorites!`, 'success');
}

// Remove a favorite city
async function apiRemoveFavorite(cityName) {
  if (!authToken) return;
  const res = await fetch(`/api/auth/favorites/${encodeURIComponent(cityName)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to remove');
  currentUser = data.user;
  renderFavorites();
  showToast(`${cityName} removed`, 'success');
}

/* ═════════════ AUTH UI HANDLERS ═════════════ */
function handleSignup() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { showToast('Enter email and password', 'error'); return; }
  apiSignup(email, password)
    .then(data => {
      setToken(data.token);
      currentUser = data.user;
      closeAuthModal();
      updateAuthUI();
      showToast('Welcome to skyLens!', 'success');
    })
    .catch(e => showToast(e.message, 'error'));
}

function handleLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { showToast('Enter email and password', 'error'); return; }
  apiLogin(email, password)
    .then(data => {
      setToken(data.token);
      currentUser = data.user;
      closeAuthModal();
      updateAuthUI();
      renderFavorites();
      showToast(`Welcome back!`, 'success');
    })
    .catch(e => showToast(e.message, 'error'));
}

function handleLogout() {
  clearToken();
  updateAuthUI();
  renderFavorites();
  showToast('Logged out', 'success');
}

/* ═════════════ AUTH MODAL ═════════════ */
function openAuthModal(mode = 'login') {
  let modal = document.getElementById('authModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'authModal';
    modal.style.cssText = `position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(8px)`;
    modal.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border-hi);border-radius:24px;padding:2.2rem 2rem;width:100%;max-width:380px;box-shadow:0 24px 60px rgba(0,0,0,.55)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.6rem">
          <h2 style="font-family:'Exo 2',sans-serif;font-weight:800;color:var(--text-hi);font-size:1.3rem" id="authTitle">Log In</h2>
          <button onclick="closeAuthModal()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.1rem">✕</button>
        </div>
        <div style="margin-bottom:1rem">
          <label style="font-family:'JetBrains Mono',monospace;font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:.4rem">Email</label>
          <input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email" style="width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border-hi);border-radius:10px;padding:.7rem 1rem;color:var(--text-hi);font-family:'Nunito',sans-serif;font-size:.92rem;outline:none">
        </div>
        <div style="margin-bottom:1.6rem">
          <label style="font-family:'JetBrains Mono',monospace;font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:.4rem">Password</label>
          <input id="authPassword" type="password" placeholder="Min. 6 characters" autocomplete="current-password" style="width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border-hi);border-radius:10px;padding:.7rem 1rem;color:var(--text-hi);font-family:'Nunito',sans-serif;font-size:.92rem;outline:none">
        </div>
        <button id="authSubmitBtn" onclick="handleLogin()" style="width:100%;background:linear-gradient(135deg,var(--blue),var(--teal));border:none;border-radius:100px;padding:.82rem;color:#fff;font-family:'Exo 2',sans-serif;font-weight:700;font-size:.95rem;cursor:pointer;margin-bottom:.9rem">Log In</button>
        <div style="text-align:center;font-size:.82rem;color:var(--muted)">
          <span id="authSwitchText">Don't have an account?</span>
          <button id="authSwitchBtn" onclick="toggleAuthMode()" style="background:none;border:none;color:var(--blue);cursor:pointer;font-weight:700;font-size:.82rem;margin-left:.3rem">Sign Up</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) closeAuthModal(); });
  }
  modal.style.display = 'flex';
  setAuthMode(mode);
}

let _authMode = 'login';
function setAuthMode(mode) {
  _authMode = mode;
  const isLogin = mode === 'login';
  const title = document.getElementById('authTitle');
  const btn = document.getElementById('authSubmitBtn');
  const switchText = document.getElementById('authSwitchText');
  const switchBtn = document.getElementById('authSwitchBtn');
  if (title) title.textContent = isLogin ? 'Log In' : 'Create Account';
  if (btn) { btn.textContent = isLogin ? 'Log In' : 'Sign Up'; btn.onclick = isLogin ? handleLogin : handleSignup; }
  if (switchText) switchText.textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
  if (switchBtn) switchBtn.textContent = isLogin ? 'Sign Up' : 'Log In';
}
function toggleAuthMode() { setAuthMode(_authMode === 'login' ? 'signup' : 'login'); }
function closeAuthModal() { const m = document.getElementById('authModal'); if(m) m.style.display = 'none'; }

/* ═════════════ AUTH UI STATE ═════════════ */
// Updates the header button: shows "Log In" when logged out, user email + logout when logged in
function updateAuthUI() {
  const btn = document.getElementById('authHeaderBtn');
  const favBtn = document.getElementById('saveFavBtn');
  if (!btn) return;
  const compact = btn.classList.contains('site-nav-icon');
  if (currentUser) {
    btn.innerHTML = compact ? `<i class="fas fa-user-circle"></i>` : `<i class="fas fa-user-circle"></i> ${currentUser.email.split('@')[0]}`;
    btn.onclick = handleLogout;
    btn.title = 'Click to log out' + (compact ? ` (${currentUser.email.split('@')[0]})` : '');
    if(favBtn) favBtn.style.display = 'inline-flex';
  } else {
    btn.innerHTML = compact ? `<i class="fas fa-user"></i>` : `<i class="fas fa-user"></i> Log In`;
    btn.onclick = () => openAuthModal('login');
    btn.title = 'Log in to save favorites';
    if(favBtn) favBtn.style.display = 'none';
  }
}

/* ═════════════ FAVORITES RENDER ═════════════ */
function renderFavorites() {
  const wrap = document.getElementById('favWrap');
  if (!wrap) return;
  if (!currentUser || !currentUser.favorites || !currentUser.favorites.length) {
    wrap.innerHTML = currentUser ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:.64rem;color:var(--muted)">No favorites saved yet</span>' : '';
    return;
  }
  wrap.innerHTML = '<span class="rc-lbl">⭐ Favorites:</span>' + currentUser.favorites.map(c =>
    `<button class="rc-chip" onclick="rcSelect('${c.name}',${c.lat},${c.lon})" title="${c.name}">
       <span>${c.name}</span>
       <span class="rc-del" onclick="event.stopPropagation();apiRemoveFavorite('${c.name}')" title="Remove">✕</span>
     </button>`
  ).join('');
}

/* ═══════════════════════════════════════════════
   ══ HAMBURGER QUICK-INFO MENU               ══
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   ══ CAROUSEL MODAL                            ══
   ═══════════════════════════════════════════════ */
/* ═════════════ DASHBOARD — quick chips, panel switcher, drawer ═════════════ */
function updateDbChips(d,uv,f10){
  const rc=document.getElementById('dbRainChip');if(!rc)return; // not on this page, bail
  const pop=(f10&&f10.daily&&f10.daily.precipitation_probability_max)?f10.daily.precipitation_probability_max[0]:0;
  set('dbRainChip',pop+'%');
}

function selectDbView(name,btn){
  document.querySelectorAll('.db-view').forEach(v=>v.classList.remove('act'));
  const v=document.getElementById('view-'+name);if(v)v.classList.add('act');
  document.querySelectorAll('.feat-icon').forEach(b=>b.classList.remove('act'));
  if(btn)btn.classList.add('act');
  if(name==='chart'&&_fore)requestAnimationFrame(()=>safe(buildChart,_fore));
}

function toggleSiteDrawer(){
  const d=document.getElementById('siteDrawer'),s=document.getElementById('drawerScrim');
  if(d)d.classList.toggle('open');
  if(s)s.classList.toggle('show');
}
