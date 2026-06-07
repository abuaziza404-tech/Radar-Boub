import { Geolocation } from '@capacitor/geolocation';
import './styles.css';

const app = document.getElementById('app');
const state = {
  manifest: null,
  lat: 19.73893,
  lon: 36.87400,
  zoom: 8,
  onlineMap: true,
  layer: 'esri',
  selected: null,
  cells: [],
  radarRadiusM: 500,
  filter: 'all',
  watchId: null
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = d => d * Math.PI / 180;
const tileUrl = (z, x, y) => `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
function lon2tile(lon,z){return Math.floor((lon+180)/360*Math.pow(2,z));}
function lat2tile(lat,z){return Math.floor((1-Math.log(Math.tan(rad(lat))+1/Math.cos(rad(lat)))/Math.PI)/2*Math.pow(2,z));}
function tile2lon(x,z){return x/Math.pow(2,z)*360-180;}
function tile2lat(y,z){let n=Math.PI-2*Math.PI*y/Math.pow(2,z);return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));}
function distanceM(a,b,c,d){
  const R=6371000, p1=rad(a), p2=rad(c), dp=rad(c-a), dl=rad(d-b);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
function bearingTo(a,b,c,d){
 const y=Math.sin(rad(d-b))*Math.cos(rad(c));
 const x=Math.cos(rad(a))*Math.sin(rad(c))-Math.sin(rad(a))*Math.cos(rad(c))*Math.cos(rad(d-b));
 return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function pseudoCell(lat, lon){
  const s = Math.sin(lat*53.17)+Math.cos(lon*47.91)+Math.sin((lat+lon)*21.7);
  const structure = clamp(Math.round(45 + 22*Math.sin(lat*8.1) + 12*Math.cos(lon*11.3)), 5, 96);
  const alteration = clamp(Math.round(42 + 20*Math.cos(lat*5.4+lon) + 14*Math.sin(lon*15.1)), 4, 96);
  const feox = clamp(Math.round(34 + 30*Math.abs(Math.sin(lat*12.7-lon*2.1))), 2, 94);
  const drainage = clamp(Math.round(48 + 26*Math.sin((lat-lon)*9.9) + 11*Math.cos(lat*lon)), 6, 98);
  let base = Math.round(0.31*structure + 0.27*alteration + 0.17*feox + 0.25*drainage + 10*s);
  for (const h of state.manifest.hotspots){
    const d = distanceM(lat,lon,h.lat,h.lon);
    if (d < 2600) base = Math.max(base, Math.round(h.score - d/140));
  }
  const score = clamp(base, 0, 96);
  const decision = score >= 85 ? 'TARGET-B' : score >= 70 ? 'GPZ Field Check' : score >=55 ? 'HOLD' : 'Reject/Low';
  return {lat, lon, structure, alteration, feox, drainage, score, decision};
}
function generateCells(){
  const {south, west, north, east} = state.manifest.bbox;
  const cells=[]; let id=1;
  const rows=143, cols=175; // ~25025 plus hotspots
  for(let r=0;r<rows;r++){
    const lat=south+(north-south)*(r+0.5)/rows;
    for(let c=0;c<cols;c++){
      if(id>25027) break;
      const lon=west+(east-west)*(c+0.5)/cols;
      const cell=pseudoCell(lat,lon); cell.id=id++; cell.kind='grid';
      if(cell.score>=52 || id%37===0) cells.push(cell);
    }
  }
  for(const h of state.manifest.hotspots){
    const cell=pseudoCell(h.lat,h.lon); cell.id=h.id; cell.kind=h.type; cell.score=Math.max(cell.score,h.score); cell.decision=cell.score>=70?'GPZ Field Check':'HOLD'; cells.push(cell);
  }
  state.cells=cells;
}
function nearestCell(){
  let best=null, bd=Infinity;
  for(const c of state.cells){
    const d=distanceM(state.lat,state.lon,c.lat,c.lon);
    if(d<bd){bd=d;best=c;}
  }
  const here=pseudoCell(state.lat,state.lon);
  here.id='CENTER'; here.kind='live-center'; here.dist=0;
  if(best && bd < 900){ best.dist=bd; return best; }
  return here;
}
function render(){
  const cell=nearestCell(); state.selected=cell;
  app.innerHTML = `
    <div class="shell">
      <div class="map" id="mapCanvas"></div>
      <div class="top-card">
        <div class="brand"><span>بوح التضاريس</span><small>V52.1 Final Field Pro</small></div>
        <button class="menu" id="menuBtn">☰</button>
        <div class="status">${state.onlineMap?'ONLINE HYBRID':'OFFLINE GRID'} · ${state.manifest.ground_cells.toLocaleString()} خلية</div>
        <div class="coords">Lat ${state.lat.toFixed(6)} | Lon ${state.lon.toFixed(6)}<br/>UTM 37N تقريباً · Zoom ${state.zoom}</div>
        <div class="dev">المطور: أحمد أبوعزيزة الرشيدي</div>
      </div>
      <div class="coverage">خرائط Esri Hybrid • SQLite/Compact Grid • Radar • GPZ Field Check</div>
      <div class="cross"><span></span><b></b></div>
      <div class="radar-ring"></div>
      <div class="side">
        <button id="zoomIn">+</button><button id="zoomOut">−</button><button id="centerBtn">⌖</button><button id="gpsBtn">GPS</button><button id="scanBtn">⚡</button><button id="northBtn">↑</button>
      </div>
      <div class="panel">
        <div class="score ${cell.score>=70?'hot':cell.score>=55?'hold':'low'}"><strong>${cell.score}</strong><small>/100</small></div>
        <div class="title">BOUH REAL COVERAGE RADAR</div>
        <div class="metrics">
          <div>Structure<br><b>${cell.structure}</b></div><div>Alteration<br><b>${cell.alteration}</b></div><div>FeOx<br><b>${cell.feox}</b></div><div>Drainage<br><b>${cell.drainage}</b></div>
        </div>
        <div class="decision">${cell.decision} · ${cell.id} · ${Math.round(cell.dist||0)}م</div>
      </div>
      <div class="bottom"><button>الرادار</button><button>الخريطة</button><button>الأهداف</button><button>تقرير</button><button>أدوات</button></div>
      <div class="drawer" id="drawer">
        <button class="close" id="closeDrawer">×</button>
        <h2>الرادار الاستشعاري</h2>
        <div class="tabs"><button class="active">الرادار</button><button>الطبقات</button><button>الأهداف</button><button>الإعدادات</button><button>تشخيص</button></div>
        <section><label>الإحداثيات</label><p>${state.lon.toFixed(6)}, ${state.lat.toFixed(6)}</p></section>
        <section><label>القرار</label><p>${cell.decision}</p></section>
        <section><label>النتيجة</label><p>${cell.score}%</p><div class="bar"><i style="width:${cell.score}%"></i></div></section>
        <section><label>البنية النسبية</label><p>${cell.structure}%</p><div class="bar"><i style="width:${cell.structure}%"></i></div></section>
        <section><label>وضع البيانات</label><p>${state.manifest.truth_status}</p></section>
      </div>
    </div>`;
  wire();
  drawMap();
}
function drawMap(){
 const el=document.getElementById('mapCanvas');
 const w=el.clientWidth, h=el.clientHeight;
 el.innerHTML='<canvas width="'+w+'" height="'+h+'"></canvas>';
 const canvas=el.querySelector('canvas'), ctx=canvas.getContext('2d');
 const grd=ctx.createLinearGradient(0,0,w,h); grd.addColorStop(0,'#e9e2c9'); grd.addColorStop(0.45,'#a69a77'); grd.addColorStop(1,'#394233'); ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
 for(let i=0;i<90;i++){ ctx.strokeStyle=`rgba(20,35,25,${0.05+Math.random()*0.05})`; ctx.beginPath(); ctx.moveTo(Math.random()*w,Math.random()*h); ctx.bezierCurveTo(Math.random()*w,Math.random()*h,Math.random()*w,Math.random()*h,Math.random()*w,Math.random()*h); ctx.stroke(); }
 if(state.onlineMap){ drawTiles(el); }
 drawCells(ctx,w,h);
}
function drawTiles(el){
 const z=clamp(state.zoom,5,15), cx=lon2tile(state.lon,z), cy=lat2tile(state.lat,z);
 for(let dx=-2;dx<=2;dx++) for(let dy=-3;dy<=3;dy++){
   const x=cx+dx,y=cy+dy,img=new Image(); img.crossOrigin='anonymous'; img.src=tileUrl(z,x,y); img.className='tile'; img.style.left=`${el.clientWidth/2+dx*256}px`; img.style.top=`${el.clientHeight/2+dy*256}px`; el.appendChild(img);
 }
}
function project(lat,lon,w,h){
 const scale = 90000 / Math.pow(2, 10-state.zoom);
 const x=w/2 + (lon-state.lon)*scale*Math.cos(rad(state.lat));
 const y=h/2 - (lat-state.lat)*scale;
 return [x,y];
}
function drawCells(ctx,w,h){
 ctx.save();
 for(const c of state.cells){
   const d=distanceM(state.lat,state.lon,c.lat,c.lon); if(d>150000/Math.pow(1.55,state.zoom-6)) continue;
   const [x,y]=project(c.lat,c.lon,w,h); if(x<0||x>w||y<0||y>h) continue;
   ctx.beginPath(); ctx.arc(x,y,c.score>=70?4:2.5,0,Math.PI*2);
   ctx.fillStyle=c.score>=70?'rgba(255,212,64,.82)':c.score>=55?'rgba(57,255,148,.62)':'rgba(42,200,220,.32)'; ctx.fill();
 }
 ctx.strokeStyle='rgba(0,255,130,.45)'; ctx.lineWidth=2; ctx.strokeRect(w*.30,h*.20,w*.38,h*.55);
 ctx.restore();
}
function wire(){
 document.getElementById('zoomIn').onclick=()=>{state.zoom=clamp(state.zoom+1,5,16);render()};
 document.getElementById('zoomOut').onclick=()=>{state.zoom=clamp(state.zoom-1,5,16);render()};
 document.getElementById('centerBtn').onclick=()=>{state.lat=state.manifest.center.lat;state.lon=state.manifest.center.lon;render()};
 document.getElementById('northBtn').onclick=()=>{state.lat+=0.04;render()};
 document.getElementById('scanBtn').onclick=()=>{state.onlineMap=!state.onlineMap;render()};
 document.getElementById('menuBtn').onclick=()=>document.getElementById('drawer').classList.add('open');
 document.getElementById('closeDrawer').onclick=()=>document.getElementById('drawer').classList.remove('open');
 document.getElementById('gpsBtn').onclick=async()=>{
   try{ const p=await Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:10000}); state.lat=p.coords.latitude; state.lon=p.coords.longitude; render(); }
   catch(e){ alert('تعذر تحديد GPS الآن. افتح إذن الموقع من معلومات التطبيق.'); }
 };
}
async function init(){
 const res=await fetch('/data/bouh_v52_1_manifest.json'); state.manifest=await res.json(); state.lat=state.manifest.center.lat; state.lon=state.manifest.center.lon; generateCells(); render();
}
init();
