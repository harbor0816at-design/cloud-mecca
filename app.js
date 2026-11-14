/* 云上麦加 · Cloud Mecca — app */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('mecca_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{if(v==null)localStorage.removeItem('mecca_'+k);else localStorage.setItem('mecca_'+k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`;};

/* ---------- language & currency ---------- */
const LANG=(()=>{const s=store.get('lang',null);if(s==='zh'||s==='en')return s;return /^zh/i.test(navigator.language||'')?'zh':'en';})();
const DICT=window.I18N[LANG],DH=window.DHIKR;
function t(k,v){let s=DICT[k];if(s==null)s=window.I18N.zh[k];if(s==null)return k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s;}
document.documentElement.lang=LANG==='zh'?'zh-CN':'en';
document.title=LANG==='zh'?'云上麦加 · Cloud Mecca':'Cloud Mecca · 云上麦加';
document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
let CUR=store.get('cur',null);
if(CUR!=='eur'&&CUR!=='usd'){let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}CUR=/^Europe\//.test(tz)?'eur':'usd';}
function price(c){try{return new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US',{style:'currency',currency:CUR.toUpperCase(),minimumFractionDigits:c%100?2:0,maximumFractionDigits:2}).format(c/100);}catch(e){return (CUR==='eur'?'€':'$')+(c/100).toFixed(c%100?2:0);}}
const PRICE={support:100,course:990};
const nf=n=>{try{return Number(n||0).toLocaleString(LANG==='zh'?'zh-CN':'en-US');}catch(e){return String(n);}};

const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isTouch)document.body.classList.add('touch');

/* ---------- backend (Supabase, shared project, mecca_* objects) ---------- */
const SB_URL='https://smwqqiebkdaheikihbrg.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtd3FxaWVia2RhaGVpa2loYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzU2NzksImV4cCI6MjEwNzU1MTY3OX0.ouoYJ_OTLp4aazXn7H9xcwGJQOQ-pF1fttwR7U5WaG4';
let sb=null;
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:8}}});}catch(e){sb=null;}
async function rpc(fn,args){if(!sb)throw new Error('offline');const r=await sb.rpc(fn,args||{});if(r.error)throw r.error;return r.data;}
const myId=(()=>{let id=null;try{id=sessionStorage.getItem('mecca_id');}catch(e){}if(!id){id=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('mecca_id',id);}catch(e){}}return id;})();

/* ---------- account state ---------- */
let token=store.get('tok',null),me=null,payOn=false;
function myName(){return me&&me.show_name?me.name:null;}
function setAcctBtn(){const b=$('#acctbtn');b.textContent=me?(me.name||'?').slice(0,1).toUpperCase():'👤';b.classList.toggle('in',!!me);}
function logoutLocal(){token=null;me=null;store.set('tok',null);setAcctBtn();retrack();}
async function loadMe(){if(!token||!sb){setAcctBtn();return;}try{const u=await rpc('mecca_me',{p_token:token});if(u){me=u;}else logoutLocal();}catch(e){}setAcctBtn();retrack();}
async function loadConfig(){if(!sb)return;try{const c=await rpc('mecca_public_config');payOn=!!(c&&c.payments);}catch(e){}}

/* ---------- location & prayer settings ---------- */
const PT=window.PT;
const devTZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){return'UTC';}})();
function cityLoc(c){return{name:LANG==='zh'?c[0]:c[1],lat:c[2],lng:c[3],tz:c[4],city:c[1]};}
let loc=store.get('loc',null);
if(!loc||typeof loc.lat!=='number'){const c=window.CITIES.find(c=>c[4]===devTZ)||window.CITIES.find(c=>c[1]==='Makkah');loc=cityLoc(c);}
if(loc.city){const c=window.CITIES.find(c=>c[1]===loc.city);if(c)loc.name=LANG==='zh'?c[0]:c[1];}
let METHOD=store.get('method','MWL');if(!PT.METHODS[METHOD])METHOD='MWL';
let ASR=store.get('asr',LANG==='zh'?2:1);
function nextPrayer(){try{return PT.next(loc,METHOD,ASR);}catch(e){return null;}}
const fmtT=d=>PT.fmt(d,loc.tz,LANG);

if(typeof THREE==='undefined'){$('#loading').textContent=t('engineFail');return;}

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<1.5&&!isTouch,powerPreference:'high-performance'});
const MAX_PR=Math.min(devicePixelRatio,isTouch?1:1.25);let PR=MAX_PR;
renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
$('#stage').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x050b14);
scene.fog=new THREE.FogExp2(0x0b1622,0.011);
const camera=new THREE.PerspectiveCamera(isTouch&&innerWidth<innerHeight?78:68,innerWidth/innerHeight,0.05,160);
camera.rotation.order='YXZ';
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=isTouch&&innerWidth<innerHeight?78:68;camera.updateProjectionMatrix();renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);});

/* ---------- procedural textures ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());
function toTex(c,srgb){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb!==false)t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;return t;}
function grain(g,w,h,amt,r){const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);}
function hsl(h,s,l){return`hsl(${h},${s}%,${l}%)`;}
function marbleTexture(){const[c,g]=mkC(512,512),r=rng(7);const n=4,s=512/n;
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=hsl(40,6+r()*4,84+r()*7);g.fillRect(i*s,j*s,s,s);
  for(let k=0;k<5;k++){g.strokeStyle=`rgba(120,120,130,${.06+r()*.1})`;g.lineWidth=.6+r()*1.6;g.beginPath();g.moveTo(i*s+r()*s,j*s+r()*s);g.bezierCurveTo(i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s);g.stroke();}}
 g.strokeStyle='rgba(150,150,150,.55)';g.lineWidth=2;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,512);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(512,i*s);g.stroke();}
 grain(g,512,512,10,r);return toTex(c);}
function limeTexture(){const[c,g]=mkC(512,512),r=rng(11);g.fillStyle='#b9ab93';g.fillRect(0,0,512,512);const rh=64;
 for(let y=0;y<512;y+=rh){let x=-(r()*120);while(x<512){const w=90+r()*90;const l=70+r()*8;g.fillStyle=hsl(38+r()*6,16+r()*6,l);g.fillRect(x+2,y+2,w-4,rh-4);if(x+w>512){g.fillRect(x+2-512,y+2,w-4,rh-4);}x+=w;}}
 grain(g,512,512,16,r);return toTex(c);}
function kiswaTexture(){const[c,g]=mkC(256,256);g.fillStyle='#0a0a0b';g.fillRect(0,0,256,256);g.strokeStyle='rgba(255,255,255,.045)';g.lineWidth=2;
 for(let i=-256;i<512;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i+256,256);g.stroke();g.beginPath();g.moveTo(i+256,0);g.lineTo(i,256);g.stroke();}
 return toTex(c);}
function star8(g,cx,cy,R){g.beginPath();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rr=k%2?R*.55:R;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}g.closePath();}
function bandTexture(){const[c,g]=mkC(512,64);const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#7a5a1e');gr.addColorStop(.5,'#b98d36');gr.addColorStop(1,'#7a5a1e');g.fillStyle='#120e08';g.fillRect(0,0,512,64);
 g.fillStyle=gr;g.fillRect(0,4,512,4);g.fillRect(0,56,512,4);
 for(let x=32;x<512;x+=64){g.strokeStyle='#e2bd66';g.lineWidth=2.5;star8(g,x,32,19);g.stroke();g.fillStyle='rgba(226,189,102,.25)';g.fill();g.beginPath();g.arc(x,32,5,0,7);g.fillStyle='#e2bd66';g.fill();
  g.beginPath();g.moveTo(x+26,14);g.lineTo(x+38,32);g.lineTo(x+26,50);g.lineTo(x+14+24,32);g.stroke();}
 return toTex(c);}
function doorTexture(){const[c,g]=mkC(128,256);const gr=g.createLinearGradient(0,0,128,0);gr.addColorStop(0,'#8a6526');gr.addColorStop(.5,'#e3c06a');gr.addColorStop(1,'#8a6526');g.fillStyle=gr;g.fillRect(0,0,128,256);
 g.strokeStyle='#6b4c18';g.lineWidth=3;g.strokeRect(6,6,116,244);g.beginPath();g.moveTo(64,6);g.lineTo(64,250);g.stroke();
 for(let y=36;y<240;y+=52){[34,94].forEach(x=>{star8(g,x,y,16);g.stroke();});}return toTex(c);}
function rugTexture(base,accent){const[c,g]=mkC(128,192);g.fillStyle=base;g.fillRect(0,0,128,192);g.strokeStyle=accent;g.lineWidth=6;g.strokeRect(6,6,116,180);
 g.lineWidth=3;g.beginPath();g.moveTo(24,176);g.lineTo(24,70);g.quadraticCurveTo(24,30,64,22);g.quadraticCurveTo(104,30,104,70);g.lineTo(104,176);g.stroke();
 g.fillStyle=accent;star8(g,64,110,10);g.fill();grain(g,128,192,14,rng(base.length));return toTex(c);}
function woodTexture(){const[c,g]=mkC(256,256),r=rng(3);g.fillStyle='#4e3320';g.fillRect(0,0,256,256);
 for(let i=0;i<70;i++){const y=r()*256;g.strokeStyle=`rgba(${r()<.5?'30,16,8':'120,80,45'},${.15+r()*.25})`;g.lineWidth=.5+r()*2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=256;x+=32)g.lineTo(x,y+Math.sin(x*.03+i)*2.5);g.stroke();}
 grain(g,256,256,14,r);return toTex(c);}
function glowTexture(){const[c,g]=mkC(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,228,170,.55)');gr.addColorStop(1,'rgba(255,200,110,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return toTex(c);}
function skyTexture(){const[c,g]=mkC(1024,512),r=rng(21);const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#02040a');gr.addColorStop(.38,'#071226');gr.addColorStop(.5,'#16314a');gr.addColorStop(.56,'#0b1a28');gr.addColorStop(1,'#050a10');g.fillStyle=gr;g.fillRect(0,0,1024,512);
 for(let i=0;i<900;i++){const y=r()*250;const a=(.25+r()*.75)*(1-y/260);g.fillStyle=`rgba(255,255,${230+r()*25},${a})`;const s=r()<.06?1.8:1;g.fillRect(r()*1024,y,s,s);}return toTex(c);}
function moonTexture(){const[c,g]=mkC(256,256);g.fillStyle='#f3e2b0';g.beginPath();g.arc(128,128,100,0,7);g.fill();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(170,104,92,0,7);g.fill();return toTex(c);}
function labelTexture(text,sub){const[c,g]=mkC(512,160);g.textAlign='center';g.fillStyle='#ecd08f';g.font='600 '+(LANG==='en'?54:62)+'px "Noto Serif SC","Songti SC",Georgia,serif';g.fillText(text,256,sub?78:100);if(sub){g.font='30px "Noto Serif SC","Songti SC",serif';g.fillStyle='#c9cdb8';g.fillText(sub,256,128);}return toTex(c);}

const TX={marble:marbleTexture(),lime:limeTexture(),kiswa:kiswaTexture(),band:bandTexture(),door:doorTexture(),wood:woodTexture(),glow:glowTexture(),rugR:rugTexture('#7c1c22','#d9b45f'),rugG:rugTexture('#1f5a43','#d9b45f')};
TX.marble.repeat.set(42/4.4,42/4.4);TX.band.repeat.set(1/8,1);
const marble2=TX.marble.clone();marble2.needsUpdate=true;marble2.repeat.set(1,1);

/* ---------- materials ---------- */
const PH=(o)=>new THREE.MeshPhongMaterial(Object.assign({shininess:6,specular:0x111111},o));
const M={
 marble:PH({map:TX.marble,shininess:46,specular:0x3a3a3a}),
 marbleL:PH({map:marble2,color:0xffffff,shininess:40,specular:0x3a3a3a}),
 lime:PH({map:TX.lime}),
 plaster:PH({color:0xe9e3d6}),
 kiswa:PH({map:TX.kiswa,color:0xffffff,shininess:14,specular:0x222222}),
 band:PH({map:TX.band,shininess:70,specular:0x8a6a30,emissive:0x1a1206}),
 door:PH({map:TX.door,shininess:80,specular:0x9a7a3a,emissive:0x1a1206}),
 gold:PH({color:0xd2ab55,shininess:80,specular:0x9a7a3a}),
 silver:PH({color:0xcfd3d6,shininess:90,specular:0x888888}),
 stone:PH({color:0x141414,shininess:30}),
 wood:PH({map:TX.wood,shininess:14}),
 darkWood:PH({map:TX.wood,color:0x8a6a52,shininess:12}),
 page:PH({color:0xf2e6cc}),
 rugR:PH({map:TX.rugR}),rugG:PH({map:TX.rugG}),
 rock:PH({color:0x8d8173,shininess:4}),
 green:new THREE.MeshBasicMaterial({color:0x3fe08a}),
 cushion:PH({color:0x2a5b4b}),
};
const glowMat=new THREE.SpriteMaterial({map:TX.glow,color:0xffd28a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.9});

/* ---------- geometry helpers ---------- */
const colliders=[];
function addCol(x1,x2,z1,z2){colliders.push([Math.min(x1,x2),Math.max(x1,x2),Math.min(z1,z2),Math.max(z1,z2)]);}
function worldUV(geo,w,h,d,s){const uv=geo.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/s,uv.getY(i)*dims[f][1]/s);}uv.needsUpdate=true;}
function box(w,h,d,mat,x,y,z,o){o=o||{};const g=new THREE.BoxGeometry(w,h,d);if(mat.map&&o.uv!==false)worldUV(g,w,h,d,o.s||4);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);(o.parent||scene).add(m);if(o.col)addCol(x-w/2,x+w/2,z-d/2,z+d/2);return m;}
function cyl(rt,rb,h,mat,x,y,z,seg,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16),mat);m.position.set(x,y,z);(parent||scene).add(m);return m;}
const lamps=[];
function lamp(x,y,z,s){s=s||1;cyl(.09*s,.12*s,.26*s,M.gold,x,y,z,8);cyl(.005,.005,6.5-y,M.gold,x,y+(6.5-y)/2,z,4);const sp=new THREE.Sprite(glowMat);sp.scale.set(.9*s,.9*s,1);sp.position.set(x,y,z);scene.add(sp);lamps.push(sp);}
function label(text,sub,x,y,z,ry,w){const m=new THREE.Mesh(new THREE.PlaneGeometry(w||2.4,(w||2.4)*160/512),new THREE.MeshBasicMaterial({map:labelTexture(text,sub),transparent:true,depthWrite:false}));m.position.set(x,y,z);m.rotation.y=ry;m.userData.dyn=true;scene.add(m);}

/* ---------- sky ---------- */
const sky=new THREE.Mesh(new THREE.SphereGeometry(130,32,16),new THREE.MeshBasicMaterial({map:skyTexture(),side:THREE.BackSide,fog:false,depthWrite:false}));sky.userData.dyn=true;scene.add(sky);
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture(),fog:false,transparent:true,depthWrite:false}));moon.scale.set(9,9,1);moon.position.set(-40,62,-90);scene.add(moon);

/* ---------- courtyard & Kaaba ---------- */
const fl=new THREE.Mesh(new THREE.PlaneGeometry(42,42),M.marble);fl.rotation.x=-Math.PI/2;scene.add(fl);
// Kaaba (simplified, illustrative proportions)
const KX=2.5,KZ=2.2,KB=.35,KH=6;
box(5.6,KB,5.0,M.marbleL,0,KB/2,0,{uv:false});
box(KX*2,KH,KZ*2,M.kiswa,0,KB+KH/2,0,{s:3});addCol(-2.85,2.85,-2.55,2.55);
box(KX*2+.06,.55,KZ*2+.06,M.band,0,KB+4.5,0,{s:.55});
box(KX*2+.04,.08,KZ*2+.04,M.gold,0,KB+2.2,0);
box(.86,1.48,.08,M.door,1.25,KB+1.0+.74,KZ+.03,{uv:false});
box(1.06,.1,.14,M.gold,1.25,KB+1.0,KZ+.06,{uv:false});
// Black Stone corner (east, +x +z)
{const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.045,8,20),M.silver);ring.position.set(KX+.02,1.08,KZ+.02);ring.rotation.y=Math.PI/4;scene.add(ring);
 const st=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),M.stone);st.position.set(KX-.02,1.08,KZ-.02);scene.add(st);}
// Hijr Ismail (Hatim) — low semicircular wall on the north-west (−x) face
{const cx=-KX,R=2.35;for(let k=0;k<9;k++){const a0=(105+k*150/9)*Math.PI/180,a1=(105+(k+1)*150/9)*Math.PI/180,am=(a0+a1)/2;const len=R*(a1-a0)+.05;
  const x=cx+Math.cos(am)*R,z=Math.sin(am)*R;const m=box(.36,1.0,len,M.marbleL,x,.5,z,{uv:false});m.rotation.y=-am;addCol(x-.25,x+.25,z-.25,z+.25);}}
// Maqam Ibrahim
box(.6,.3,.6,M.marbleL,1.0,.15,4.4,{uv:false});cyl(.26,.26,.9,M.gold,1.0,.75,4.4,12);{const d=new THREE.Mesh(new THREE.SphereGeometry(.26,12,8,0,Math.PI*2,0,Math.PI/2),M.gold);d.position.set(1.0,1.2,4.4);scene.add(d);}addCol(.65,1.35,4.05,4.75);
// prayer rugs in concentric rows facing the Kaaba
const RINGS=[10.6,11.8,13,14.2];
{const geo=new THREE.PlaneGeometry(.62,1.0);RINGS.forEach((R,ri)=>{const n=Math.floor(Math.PI*2*R/.74);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const m=new THREE.Mesh(geo,ri%2?M.rugG:M.rugR);m.rotation.order='YXZ';m.rotation.set(-Math.PI/2,Math.PI/2-a,0);m.position.set(R*Math.cos(a),.012,R*Math.sin(a));scene.add(m);}});}

/* ---------- surrounding galleries (arcade) ---------- */
const IN=16,OUT=20.5,AH=4.4;
const COLS=13,step=IN*2/(COLS-1);
for(let side=0;side<4;side++){
 for(let i=0;i<COLS;i++){const u=-IN+i*step;const[x,z]=side===0?[u,-IN]:side===1?[u,IN]:side===2?[-IN,u]:[IN,u];
  if(side>1&&(i===0||i===COLS-1))continue;
  cyl(.28,.32,AH,M.lime,x,AH/2,z,14);box(.8,.26,.8,M.lime,x,.13,z,{s:2});box(.78,.3,.78,M.lime,x,AH+.15,z,{s:2});addCol(x-.36,x+.36,z-.36,z+.36);
  if(i<COLS-1){const a=new THREE.Mesh(new THREE.TorusGeometry(step/2-.05,.12,6,24,Math.PI),M.lime);const um=u+step/2;
   if(side<2){a.position.set(um,AH+.3,z);}else{a.position.set(x,AH+.3,um);a.rotation.y=Math.PI/2;}scene.add(a);}}}
// fascia above arches & roof slabs & back walls
[[0,-1],[0,1]].forEach(([_,sg])=>{box(IN*2+.8,.8,.5,M.lime,0,AH+1.75,sg*IN,{s:2});box(OUT*2+.5,.3,OUT-IN+.8,M.plaster,0,AH+2.3,sg*(IN+OUT)/2,{uv:false});
 box(OUT*2+.5,AH+2.3,.5,M.lime,0,(AH+2.3)/2,sg*OUT);addCol(-OUT-.3,OUT+.3,sg*OUT-.3,sg*OUT+.3);});
[[-1],[1]].forEach(([sg])=>{box(.5,.8,IN*2+.8,M.lime,sg*IN,AH+1.75,0,{s:2});box(OUT-IN+.8,.3,IN*2-.4,M.plaster,sg*(IN+OUT)/2,AH+2.3,0,{uv:false});
 box(.5,AH+2.3,OUT*2,M.lime,sg*OUT,(AH+2.3)/2,0);addCol(sg*OUT-.3,sg*OUT+.3,-OUT,OUT);});
// parapet
[[0,-1],[0,1]].forEach(([_,sg])=>box(OUT*2+.5,.5,.25,M.lime,0,AH+2.7,sg*(OUT+.1),{s:2}));[[-1],[1]].forEach(([sg])=>box(.25,.5,OUT*2,M.lime,sg*(OUT+.1),AH+2.7,0,{s:2}));
// small domes over the bays
{const dg=new THREE.SphereGeometry(.95,14,8,0,Math.PI*2,0,Math.PI/2);const mid=(IN+OUT)/2;for(let i=0;i<COLS-1;i++){const u=-IN+step*(i+.5);[[u,-mid],[u,mid],[-mid,u],[mid,u]].forEach(([x,z])=>{const d=new THREE.Mesh(dg,M.plaster);d.position.set(x,AH+2.45,z);scene.add(d);});}
 [[-mid,-mid],[mid,-mid],[-mid,mid],[mid,mid]].forEach(([x,z])=>{const d=new THREE.Mesh(dg,M.plaster);d.position.set(x,AH+2.45,z);d.scale.setScalar(1.3);scene.add(d);});}
// south gate
box(.7,AH+1.4,.7,M.lime,-2.4,(AH+1.4)/2,OUT-.5,{s:2});box(.7,AH+1.4,.7,M.lime,2.4,(AH+1.4)/2,OUT-.5,{s:2});
{const a=new THREE.Mesh(new THREE.TorusGeometry(2.05,.2,8,28,Math.PI),M.lime);a.position.set(0,AH,OUT-.5);scene.add(a);}
box(1.9,AH-.2,.12,M.darkWood,-.98,(AH-.2)/2,OUT-.3,{s:1.5});box(1.9,AH-.2,.12,M.darkWood,.98,(AH-.2)/2,OUT-.3,{s:1.5});
// minarets
function minaret(x,z,h){box(1.7,7.5,1.7,M.lime,x,3.75,z,{s:2});cyl(.6,.66,h-7.5,M.plaster,x,7.5+(h-7.5)/2,z,16);
 [h*.55,h*.8].forEach(y=>{cyl(.95,.85,.3,M.lime,x,y,z,16);});cyl(.0,.5,2.8,M.plaster,x,h+1.4,z,16);cyl(.03,.03,1.2,M.gold,x,h+3.1,z,6);
 const s=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),M.gold);s.position.set(x,h+3.4,z);scene.add(s);
 const cr=new THREE.Mesh(new THREE.TorusGeometry(.26,.05,6,16,Math.PI*1.4),M.gold);cr.position.set(x,h+3.9,z);cr.rotation.z=Math.PI*.8;scene.add(cr);}
[[-22,-22],[22,-22],[-22,22],[22,22]].forEach(([x,z])=>minaret(x,z,27));minaret(-4.2,22,30);minaret(4.2,22,30);

/* ---------- stations ---------- */
// north gallery: Qur'an stand (west half) and Du'a wall (east half)
box(2.4,.02,1.8,M.rugG,-6,.01,-18.2,{uv:false});
{const g=new THREE.Group();g.position.set(-6,0,-18.4);scene.add(g);box(.8,.5,.5,M.darkWood,0,.25,0,{s:1.5,parent:g});
 const pl=box(.34,.03,.46,M.page,-.18,.58,0,{uv:false,parent:g});pl.rotation.set(-.35,0,.12);const pr=box(.34,.03,.46,M.page,.18,.58,0,{uv:false,parent:g});pr.rotation.set(-.35,0,-.12);
 box(.1,.02,.5,M.gold,0,.58,0,{uv:false,parent:g});addCol(-6.5,-5.5,-18.7,-18.1);}
box(1.0,.2,.6,M.cushion,-6,.1,-17.3,{uv:false});
box(5,1.9,.08,M.darkWood,6,1.9,-OUT+.29,{s:1.5});
{const r=rng(99);const cc=[0xf3e6c8,0xeadcc0,0xf6efe0,0xe8d3b0,0xe3eadf];for(let i=0;i<36;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.26,.18),new THREE.MeshLambertMaterial({color:cc[i%5]}));m.position.set(3.7+r()*4.6,1.1+r()*1.6,-OUT+.35);m.rotation.z=(r()-.5)*.3;scene.add(m);}}
// west gallery: dhikr corner
box(1.8,.02,3.2,M.rugR,-18.3,.01,0,{uv:false});
[-1,0,1].forEach(z=>box(.6,.18,.6,M.cushion,-18.6,.09,z*.9,{uv:false}));
{const beadG=new THREE.SphereGeometry(.05,8,6);for(let i=0;i<33;i++){const a=i/33*Math.PI*2;const b=new THREE.Mesh(beadG,M.darkWood);b.position.set(-OUT+.36,2.3+Math.sin(a)*.6,Math.cos(a)*.6);scene.add(b);}
 cyl(.04,.07,.35,M.gold,-OUT+.36,1.55,0,8);}
// east gallery: Ṣafā–Marwa (saʿy practice)
{const rg=new THREE.DodecahedronGeometry(1.1,0);[-13.4,13.4].forEach(z=>{const m=new THREE.Mesh(rg,M.rock);m.scale.set(1.3,.45,1.1);m.position.set(18.2,.2,z);scene.add(m);addCol(17.2,19.2,z-.9,z+.9);});
 [-3,3].forEach(z=>{box(OUT-IN-.6,.12,.25,M.green,(IN+OUT)/2,AH+2.05,z,{uv:false});});box(.12,.06,6,M.green,(IN+OUT)/2,AH+2.08,0,{uv:false});}
// lanterns along the galleries
for(let i=0;i<COLS-1;i+=2){const u=-IN+step*(i+.5);[[u,-17.6],[u,17.6],[-17.6,u],[17.6,u]].forEach(([x,z])=>lamp(x,4.1,z));}
// labels
label(t('lblQuran'),t('lblQuranSub'),-6,4.0,-OUT+.28,0,2.6);
label(t('lblWall'),t('lblWallSub'),6,3.35,-OUT+.36,0,2.4);
label(t('lblTasbih'),t('lblTasbihSub'),-OUT+.3,3.6,0,Math.PI/2,2.4);
label(t('lblSafa'),'',OUT-.3,2.6,-13.4,-Math.PI/2,2.2);label(t('lblMarwa'),'',OUT-.3,2.6,13.4,-Math.PI/2,2.2);
label(t('lblMasa'),t('lblMasaSub'),OUT-.3,3.6,0,-Math.PI/2,2.8);

/* ---------- merge static geometry (one draw call per material) ---------- */
function mergeStatic(){scene.updateMatrixWorld(true);const groups=new Map(),remove=[];
 scene.traverse(o=>{if(!o.isMesh||o.userData.dyn||Array.isArray(o.material))return;let p=o.parent;while(p&&p!==scene){if(p.userData.dyn)return;p=p.parent;}
  const g=o.geometry;if(!g.index||!g.attributes.uv||!g.attributes.normal)return;const k=o.material.uuid;if(!groups.has(k))groups.set(k,{mat:o.material,items:[]});groups.get(k).items.push(o);remove.push(o);});
 const v=new THREE.Vector3(),nm=new THREE.Matrix3();
 groups.forEach(({mat,items})=>{let nv=0,ni=0;items.forEach(o=>{nv+=o.geometry.attributes.position.count;ni+=o.geometry.index.count;});
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
  items.forEach(o=>{const g=o.geometry,Pa=g.attributes.position,Na=g.attributes.normal,Ua=g.attributes.uv,Ia=g.index;nm.getNormalMatrix(o.matrixWorld);
   for(let i=0;i<Pa.count;i++){const j=(vo+i)*3;v.fromBufferAttribute(Pa,i).applyMatrix4(o.matrixWorld);pos[j]=v.x;pos[j+1]=v.y;pos[j+2]=v.z;v.fromBufferAttribute(Na,i).applyMatrix3(nm).normalize();nor[j]=v.x;nor[j+1]=v.y;nor[j+2]=v.z;uv[(vo+i)*2]=Ua.getX(i);uv[(vo+i)*2+1]=Ua.getY(i);}
   for(let i=0;i<Ia.count;i++)idx[io+i]=Ia.getX(i)+vo;vo+=Pa.count;io+=Ia.count;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,mat);m.matrixAutoUpdate=false;scene.add(m);});
 remove.forEach(o=>{o.parent.remove(o);});}
mergeStatic();

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xcfdcff,0x3b3324,.75));
const moonL=new THREE.DirectionalLight(0xa9bfff,.35);moonL.position.set(-10,20,-12);scene.add(moonL);
[[-11,-11],[11,-11],[-11,11],[11,11]].forEach(([x,z])=>{const l=new THREE.PointLight(0xfff0d2,.75,38,1.2);l.position.set(x,15,z);scene.add(l);});
const kaabaL=new THREE.PointLight(0xffe2b0,.9,18,1.4);kaabaL.position.set(4,9,7);scene.add(kaabaL);
const galL=new THREE.PointLight(0xffc77a,.5,30,1.6);galL.position.set(0,4,-18);scene.add(galL);

/* ---------- other visitors (realtime presence) ---------- */
const ghosts=new Map();
const ghostRobe=new THREE.CylinderGeometry(.15,.3,1.25,12),ghostHead=new THREE.SphereGeometry(.12,12,10);
const GHOST_COLS=[0xf4f1ea,0xe9eef0,0xf2ebdd,0xe6efe6,0xefe9df,0xe4e8f0];
function nameSprite(text){const[c,g]=mkC(256,64);g.font='600 30px "Noto Serif SC","Songti SC",serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=6;g.fillStyle='#f3e2b4';g.fillText(text.slice(0,16),128,34);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:toTex(c),transparent:true,depthWrite:false,opacity:.9}));sp.scale.set(1.0,.25,1);return sp;}
function makeGhost(c){const g=new THREE.Group();const mat=new THREE.MeshLambertMaterial({color:GHOST_COLS[(c|0)%6],emissive:0x1a2a26,transparent:true,opacity:.9});
 const robe=new THREE.Mesh(ghostRobe,mat);robe.position.y=.625;g.add(robe);const head=new THREE.Mesh(ghostHead,mat);head.position.y=1.4;g.add(head);
 g.visible=false;scene.add(g);return{g,robe,head,mat,x:0,z:0,yaw:0,tx:0,tz:0,tyaw:0,s:'walk',seen:0,fresh:true,n:null,ns:null};}
function poseGhost(o){let rs=1,hy=1.4;if(o.s==='sit'||o.s==='row'){rs=.6;hy=.95;}o.robe.scale.y=rs;o.robe.position.y=.625*rs;o.head.position.y=hy;if(o.ns)o.ns.position.y=hy+.38;}
function setGhostName(o,n){n=n?String(n).slice(0,24):null;if(o.n===n)return;o.n=n;if(o.ns){o.g.remove(o.ns);o.ns.material.map.dispose();o.ns.material.dispose();o.ns=null;}if(n){o.ns=nameSprite(n);o.g.add(o.ns);poseGhost(o);}}
function removeGhost(id){const o=ghosts.get(id);if(!o)return;setGhostName(o,null);scene.remove(o.g);o.mat.dispose();ghosts.delete(id);}
let onlineN=1;
function myState(){if(P.mode==='locked')return lockKind==='cushion'?'sit':'row';return'walk';}
const net={ch:null,ready:false,last:{x:0,z:0,y:0,s:'',t:0},
 send(ev,p){if(this.ch&&this.ready){try{this.ch.send({type:'broadcast',event:ev,payload:Object.assign({id:myId},p||{})});}catch(e){}}}};
const myColor=Math.floor(Math.random()*6);
function retrack(){if(net.ch&&net.ready&&!document.hidden){try{net.ch.track({c:myColor,n:myName()});}catch(e){}net.last.t=0;}if(room&&room.ready){try{room.ch.track({n:myName()});}catch(e){}}}
function onPos(p){if(!p||p.id===myId)return;let o=ghosts.get(p.id);if(!o){if(ghosts.size>=40)return;o=makeGhost(p.c);ghosts.set(p.id,o);}
 o.tx=+p.x||0;o.tz=+p.z||0;o.tyaw=+p.y||0;o.s=p.s||'walk';o.seen=performance.now();if(o.fresh){o.x=o.tx;o.z=o.tz;o.yaw=o.tyaw;o.fresh=false;}o.g.visible=true;setGhostName(o,p.n);poseGhost(o);}
function updateOnline(){const el=$('#online');if(!net.ready){el.classList.remove('show');return;}el.classList.add('show');el.querySelector('span').textContent=t('onlineN',{n:onlineN});
 if(!$('#intro').classList.contains('hide'))$('#loading').textContent=onlineN>1?t('introOnline',{n:onlineN}):t('introQuiet');}
/* live dhikr totals */
let todayAll=0,circleCount=0,circleId=-1;const dhikrListeners=new Set();
function onDhikr(n,fromRoom){n=Math.max(0,Math.min(300,n|0));if(!n)return;todayAll+=n;if(!fromRoom&&groupInfo().live){syncCircle();circleCount+=n;}dhikrListeners.forEach(f=>f());}
function syncCircle(){const id=Math.floor(Date.now()/G_PERIOD);if(id!==circleId){circleId=id;circleCount=0;}}
function connect(){if(!sb)return;try{
 const ch=sb.channel('mecca-main',{config:{presence:{key:myId},broadcast:{self:false}}});net.ch=ch;
 ch.on('presence',{event:'sync'},()=>{const st=ch.presenceState();onlineN=Math.max(1,Object.keys(st).length);ghosts.forEach((o,id)=>{if(!st[id])removeGhost(id);else{const m=st[id][0];if(m&&'n' in m)setGhostName(o,m.n);}});updateOnline();});
 ch.on('presence',{event:'leave'},({key})=>removeGhost(key));
 ch.on('broadcast',{event:'pos'},({payload})=>onPos(payload));
 ch.on('broadcast',{event:'dhikr'},({payload})=>onDhikr(payload&&payload.n));
 ch.on('broadcast',{event:'hello'},()=>{net.last.t=0;});
 ch.subscribe(status=>{if(status==='SUBSCRIBED'){net.ready=true;retrack();net.send('hello');updateOnline();}
  else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){net.ready=false;updateOnline();}});
}catch(e){net.ch=null;}}
document.addEventListener('visibilitychange',()=>{if(!net.ch||!net.ready)return;try{if(document.hidden)net.ch.untrack();else retrack();}catch(e){}});
function netTick(now,dt){if(net.ready&&!document.hidden){const l=net.last,s=myState();const moved=Math.hypot(P.x-l.x,P.z-l.z)>.06||Math.abs(P.yaw-l.y)>.08||s!==l.s;
 if((moved&&now-l.t>220)||now-l.t>4000){l.x=P.x;l.z=P.z;l.y=P.yaw;l.s=s;l.t=now;net.send('pos',{x:+P.x.toFixed(2),z:+P.z.toFixed(2),y:+P.yaw.toFixed(2),s,c:myColor,n:myName()});}}
 const k=1-Math.exp(-dt*7);ghosts.forEach(o=>{if(now-o.seen>15000)o.g.visible=false;o.x+=(o.tx-o.x)*k;o.z+=(o.tz-o.z)*k;o.yaw=angLerp(o.yaw,o.tyaw,k);o.g.position.set(o.x,0,o.z);o.g.rotation.y=o.yaw;});}

/* ---------- dhikr circles (rooms) ---------- */
let room=null;
function joinRoomChannel(id,onSync,onCount){leaveRoom();if(!sb)return;const ch=sb.channel('mecca-room-'+id,{config:{presence:{key:myId},broadcast:{self:false}}});room={id,ch,ready:false,members:{}};
 ch.on('presence',{event:'sync'},()=>{if(!room||room.ch!==ch)return;room.members=ch.presenceState();onSync&&onSync();});
 ch.on('broadcast',{event:'dhikr'},({payload})=>{if(room&&room.ch===ch)onCount&&onCount(Math.max(0,Math.min(300,(payload&&payload.n)|0)));});
 ch.subscribe(st=>{if(st==='SUBSCRIBED'&&room&&room.ch===ch){room.ready=true;try{ch.track({n:myName()});}catch(e){}}});}
function leaveRoom(){if(room){try{sb.removeChannel(room.ch);}catch(e){}room=null;}}
function roomPeople(){const names=[];let anon=0;if(!room)return{names,anon};Object.values(room.members).forEach(a=>{const m=a&&a[0];if(m&&m.n)names.push(m.n);else anon++;});return{names,anon};}

/* ---------- public dhikr circle (every :00 and :30, 5 minutes) ---------- */
const G_PERIOD=30*60e3,G_WIN=5*60e3;let gWasLive=null,gNext=0;
function groupInfo(){const ph=Date.now()%G_PERIOD;return ph<G_WIN?{live:true,left:G_WIN-ph}:{live:false,until:G_PERIOD-ph};}
function pillTick(now){if(now<gNext)return;gNext=now+1000;const g=groupInfo(),el=$('#group');el.classList.add('show');
 if(g.live){el.classList.add('live');el.textContent=t('circleLive');}else{el.classList.remove('live');el.textContent=t('circleNext',{t:mmss(g.until)});}
 if(gWasLive===false&&g.live&&$('#intro').classList.contains('hide')){chime(587.33,.3);setTimeout(()=>chime(783.99,.25),500);toast(t('gBegan'));}gWasLive=g.live;
 const np=nextPrayer(),nel=$('#npill');if(np){nel.classList.add('show');nel.textContent=t('pillNext',{p:t(np.key),t:fmtT(np.at)})+' · '+mmss(np.at-Date.now());}}
$('#npill').onclick=()=>openSalah();

/* ---------- player ---------- */
const P={x:0,z:18.4,eye:1.65,yaw:0,pitch:.05,mode:'walk',bob:0};
let anim=null,saved=null,lockKind=null,auto=null;
const keys={};
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;keys[e.code]=true;if(e.code==='KeyE'||e.code==='Enter'){const b=$('#actions button');if(b)b.click();}if(e.code==='Escape')closeSheet();if(e.code==='Space'&&tapTarget){e.preventDefault();tapTarget();}});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const cvs=renderer.domElement;let lookId=null,lx=0,ly=0;
cvs.addEventListener('pointerdown',e=>{if(lookId!==null)return;lookId=e.pointerId;lx=e.clientX;ly=e.clientY;try{cvs.setPointerCapture(e.pointerId);}catch(_){} });
cvs.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const k=e.pointerType==='touch'?.0055:.0035;P.yaw-=(e.clientX-lx)*k;P.pitch-=(e.clientY-ly)*k;P.pitch=Math.max(-1.2,Math.min(1.2,P.pitch));lx=e.clientX;ly=e.clientY;});
const endLook=e=>{if(e.pointerId===lookId)lookId=null;};cvs.addEventListener('pointerup',endLook);cvs.addEventListener('pointercancel',endLook);
const joy=$('#joy'),knob=$('#knob');let joyId=null,jx=0,jy=0;
function joyMove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy),m=46;if(d>m){dx*=m/d;dy*=m/d;}jx=dx/m;jy=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;try{joy.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);e.preventDefault();});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;jx=jy=0;knob.style.transform='';};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
function blocked(x,z){const r=.28;for(const c of colliders){if(x>c[0]-r&&x<c[1]+r&&z>c[2]-r&&z<c[3]+r)return true;}return false;}
function moveTo(tg,dur,then){anim={from:{x:P.x,z:P.z,eye:P.eye,yaw:P.yaw,pitch:P.pitch},to:tg,t:0,dur:dur||1.2,then};}
function angLerp(a,b,k){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*k;}
const yawTo=(x,z)=>Math.atan2(x,z); // yaw that faces the Kaaba from (x,z)

/* ---------- zones & hotspots ---------- */
function zoneAt(x,z){const r=Math.hypot(x,z);if(x>IN)return t('zMasa');if(x<-IN)return t('zTasbih');if(z<-IN)return x<0?t('zQuran'):t('zWall');if(z>IN)return t('zGate');if(r<9.6)return t('zMataf');if(r<15)return t('zRows');return t('zCourt');}
const spots=[
 {test:(x,z)=>{const r=Math.hypot(x,z);return r>10.1&&r<14.9;},label:'aRow',act:joinRow},
 {test:(x,z)=>Math.hypot(x,z)<9.4,label:'aKaaba',act:()=>openKaaba()},
 {test:(x,z)=>Math.hypot(x+6,z+17.3)<1.8,label:'aQuran',act:()=>openQuran()},
 {test:(x,z)=>x>3.4&&x<8.6&&z<-16.4,label:'aWall',act:()=>openWall()},
 {test:(x,z)=>x<-16.4&&Math.abs(z)<2.4,label:'aTasbih',act:sitCushion},
 {test:(x,z)=>x>16.4&&Math.abs(z)<15,label:'aHajj',act:()=>openHajj()},
];
let curSpot=null,actionsKey='';
function renderActions(){let key,html=[];
 if(P.mode==='locked'){key='locked-'+lockKind;html=lockKind==='cushion'?[[t('aTasbih'),()=>openTasbih()],[t('aStand'),standUp,'sec']]:[[t('aTimes'),()=>openSalah()],[t('aDhikr'),()=>openTasbih('after')],[t('aStand'),standUp,'sec']];}
 else if(curSpot){key='s'+spots.indexOf(curSpot);html=[[t(curSpot.label),curSpot.act]];}
 else key='none';
 if(sheetOpen)key+='-sheet';
 if(key===actionsKey)return;actionsKey=key;const el=$('#actions');el.innerHTML='';
 if(sheetOpen)return;
 html.forEach(([tx,fn,cls])=>{const b=document.createElement('button');b.textContent=tx;if(cls)b.className=cls;b.onclick=e=>{e.stopPropagation();fn();};el.appendChild(b);});}
function lockAt(kind,tg,dur,then){if(P.mode==='walk')saved={x:P.x,z:P.z};P.mode='anim';moveTo(tg,dur,()=>{P.mode='locked';lockKind=kind;then&&then();});}
function rowSpot(x,z){const r=Math.hypot(x,z);let best=RINGS[0];RINGS.forEach(R=>{if(Math.abs(R-r)<Math.abs(best-r))best=R;});const a=Math.atan2(z,x),rr=best+.3;const px=rr*Math.cos(a),pz=rr*Math.sin(a);return{x:px,z:pz,eye:.98,yaw:yawTo(px,pz),pitch:.15};}
function joinRow(){lockAt('row',rowSpot(P.x,P.z),1.3,()=>openSalah());}
function sitCushion(){lockAt('cushion',{x:-18.4,z:Math.max(-.9,Math.min(.9,Math.round(P.z/.9)*.9)),eye:.95,yaw:Math.PI/2,pitch:.08},1.2,()=>openTasbih());}
function standUp(){closeSheet();leaveRoom();if(!saved){P.mode='walk';lockKind=null;return;}P.mode='anim';moveTo({x:saved.x,z:saved.z,eye:1.65,yaw:P.yaw,pitch:0},1.0,()=>{P.mode='walk';lockKind=null;saved=null;});}
function sitQuick(cb){if(P.mode==='locked'){cb();return;}closeSheet();stopAuto();const a=Math.random()*Math.PI*2,R=RINGS[Math.floor(Math.random()*RINGS.length)]+.9;const sx=R*Math.cos(a),sz=R*Math.sin(a);
 P.mode='anim';fade(()=>{P.x=sx;P.z=sz;P.yaw=yawTo(sx,sz);P.pitch=0;P.eye=1.65;saved={x:sx,z:sz};moveTo(rowSpot(sx,sz),1.0,()=>{P.mode='locked';lockKind='row';cb();});});}

/* ---------- sheet ---------- */
let sheetOpen=false,sheetCleanup=null,tapTarget=null;
function openSheet(title,html,init){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}tapTarget=null;$('#sheet').classList.remove('mini');$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#sheetBody').scrollTop=0;$('#sheet').classList.add('open');document.body.classList.add('sheet');sheetOpen=true;actionsKey='';if(init)sheetCleanup=init($('#sheetBody'))||null;}
function closeSheet(){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}tapTarget=null;$('#sheet').classList.remove('open','mini');document.body.classList.remove('sheet');sheetOpen=false;actionsKey='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}
$('#sheetX').onclick=closeSheet;
['pointerdown','touchstart','keydown'].forEach(ev=>$('#sheet').addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
function toast(tx){const el=$('#toast');el.textContent=tx;el.style.opacity=1;clearTimeout(toast._t);toast._t=setTimeout(()=>el.style.opacity=0,2800);}
function dhikrHTML(k,sm){const d=DH[k];return`<div class="ar${sm?' sm':''}">${d.ar}</div><div class="tr">${d.tr}</div><div class="mean">${d[LANG]}</div>`;}
function peopleHTML(names,anon){if(!names.length&&!anon)return'';return`<div class="people"><div class="ref" style="margin:8px 0 6px">${t('roomWith')}</div>${names.map(n=>`<span class="chip">${esc(n)}</span>`).join('')}${anon?`<span class="chip dim">${t('roomAnon',{n:anon})}</span>`:''}</div>`;}

/* ---------- prayer times & qibla ---------- */
function openSalah(){let heading=null,compassOn=false,handler=null;
 const render=root=>{const now=new Date();const np=nextPrayer();const day=np&&np.today?np.today:PT.day(loc,now,METHOD,ASR);const hj=PT.hijri(now,LANG);const q=PT.qibla(loc.lat,loc.lng);
  const rows=['fajr','sunrise','dhuhr','asr','maghrib','isha'].map(k=>`<tr class="${np&&np.key===k&&np.at===(day&&day[k])?'nx':''}${k==='sunrise'?' sr':''}"><td>${t(k)}</td><td>${day?fmtT(day[k]):'—'}</td></tr>`).join('');
  root.innerHTML=`<div class="small">${esc(hj.text)}${hj.month===9?`<span class="badge">${t('hijriRamadan')}</span>`:''} · ${esc(loc.name)}</div>
   ${np?`<div class="big">${t(np.key)} ${fmtT(np.at)}</div><div class="small" id="cd">${t('inT',{t:mmss(np.at-now)})}</div>`:''}
   <table class="ptable">${rows}</table>
   <div class="sec">${t('qiblaT')}</div>
   <div class="dial"><div class="rose" id="rose"><b>N</b><i id="qa"></i><em></em></div></div>
   <div class="small">${t('qiblaDeg',{d:q.toFixed(0)})} · ${t('qiblaDist',{k:nf(Math.round(PT.distKm(loc.lat,loc.lng)))})}</div>
   <div class="row"><button class="btn" id="cmp">${t('compassOn')}</button></div><div class="small" id="cmpH" style="display:none">${t('compassHint')}</div>
   <div class="sec">${t('locCity')}</div>
   <div class="row" style="justify-content:flex-start"><button class="btn" id="geo">${t('locUse')}</button>
    <select class="field" id="city" style="width:auto;flex:1;min-width:150px"><option value="">${t('locCity')}</option>${window.CITIES.map((c,i)=>`<option value="${i}" ${loc.city===c[1]?'selected':''}>${LANG==='zh'?c[0]:c[1]}</option>`).join('')}</select></div>
   <label class="lbl">${t('method')}</label><select class="field" id="meth">${Object.keys(PT.METHODS).map(m=>`<option value="${m}" ${m===METHOD?'selected':''}>${t('m'+m)}</option>`).join('')}</select>
   <label class="lbl">${t('asrM')}</label><div class="row" style="justify-content:flex-start"><button class="btn ${ASR===1?'pri':''}" data-asr="1">${t('asrStd')}</button><button class="btn ${ASR===2?'pri':''}" data-asr="2">${t('asrHan')}</button></div>
   <div class="note">${t('salahNote')}</div>`;
  const draw=()=>{const rose=root.querySelector('#rose'),qa=root.querySelector('#qa');if(!rose)return;rose.style.transform=`rotate(${heading==null?0:-heading}deg)`;qa.style.transform=`rotate(${q}deg)`;};draw();render.draw=draw;
  root.querySelector('#city').onchange=e=>{const c=window.CITIES[+e.target.value];if(!c)return;loc=cityLoc(c);store.set('loc',loc);render(root);};
  root.querySelector('#meth').onchange=e=>{METHOD=e.target.value;store.set('method',METHOD);render(root);};
  root.querySelectorAll('[data-asr]').forEach(b=>b.onclick=()=>{ASR=+b.dataset.asr;store.set('asr',ASR);render(root);});
  root.querySelector('#geo').onclick=()=>{if(!navigator.geolocation){toast(t('locFail'));return;}toast(t('locWait'));
   navigator.geolocation.getCurrentPosition(p=>{loc={name:t('locMine'),lat:+p.coords.latitude.toFixed(4),lng:+p.coords.longitude.toFixed(4),tz:devTZ,mine:true};store.set('loc',loc);render(root);},()=>toast(t('locFail')),{enableHighAccuracy:false,timeout:12000,maximumAge:6e5});};
  root.querySelector('#cmp').onclick=async()=>{if(compassOn)return;try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const s=await DeviceOrientationEvent.requestPermission();if(s!=='granted'){toast(t('compassFail'));return;}}}catch(_){toast(t('compassFail'));return;}
   compassOn=true;handler=e=>{let h=null;if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;else if(e.absolute&&e.alpha!=null)h=360-e.alpha;if(h!=null){const so=(screen.orientation&&screen.orientation.angle)||window.orientation||0;heading=(h+so+360)%360;render.draw&&render.draw();}};
   addEventListener('deviceorientationabsolute',handler,true);addEventListener('deviceorientation',handler,true);root.querySelector('#cmpH').style.display='block';
   setTimeout(()=>{if(heading==null&&compassOn)toast(t('compassFail'));},3500);};};
 openSheet(t('salahT'),'<div id="sal"></div>',root=>{const el=root.querySelector('#sal');render(el);
  const iv=setInterval(()=>{const np=nextPrayer(),cd=el.querySelector('#cd');if(np&&cd)cd.textContent=t('inT',{t:mmss(np.at-Date.now())});},1000);
  return()=>{clearInterval(iv);if(handler){removeEventListener('deviceorientationabsolute',handler,true);removeEventListener('deviceorientation',handler,true);}};});}

/* ---------- tasbih (dhikr counter) ---------- */
const AFTER=[['subhanallah',33],['alhamdulillah',33],['allahuakbar',34]];
let pend={},pendN=0,flushT=null,groupLogged=false;
function queueDhikr(k,group){pend[k]=(pend[k]||0)+1;pendN++;todayAll++;if(group&&!room){syncCircle();circleCount++;}
 if(!flushT)flushT=setTimeout(()=>flushDhikr(group),3000);}
let bcast=0,bcastT=null,bcastRoom=0;
function broadcastTap(inRoom){if(inRoom){bcastRoom++;}else bcast++;if(!bcastT)bcastT=setTimeout(()=>{bcastT=null;if(bcast){net.send('dhikr',{n:bcast});bcast=0;}if(bcastRoom&&room&&room.ready){try{room.ch.send({type:'broadcast',event:'dhikr',payload:{n:bcastRoom}});}catch(_){}}bcastRoom=0;},1000);}
async function flushDhikr(group){clearTimeout(flushT);flushT=null;const p=pend;pend={};pendN=0;
 for(const k in p){let r=null;const g=!!group&&!groupLogged;try{r=await rpc('mecca_add_dhikr',{p_token:token,p_phrase:k,p_n:p[k],p_group:g});if(g)groupLogged=true;}catch(_){}
  if(r){let s=0;for(const x in r)s+=+r[x]||0;todayAll=Math.max(todayAll,s);}}
 if(me)me.dhikr=(me.dhikr||0)+Object.values(p).reduce((a,b)=>a+b,0);dhikrListeners.forEach(f=>f());}
function mountTasbih(el,opt){opt=opt||{};let mode=opt.mode||'free',phrase=opt.phrase||'subhanallah',count=0,seq=0;const vib=store.get('vib',true);
 const cur=()=>mode==='after'?AFTER[seq][0]:phrase,target=()=>mode==='after'?AFTER[seq][1]:33;
 const render=()=>{el.innerHTML=`<div class="chips"><span class="chip ${mode==='after'?'on':''}" data-m="after">${t('afterSalah')}</span><span class="chip ${mode==='free'?'on':''}" data-m="free">${t('free')}</span></div>
   ${mode==='free'?`<div class="chips" style="margin-top:6px">${Object.keys(DH).map(k=>`<span class="chip ${phrase===k?'on':''}" data-p="${k}">${DH[k].tr}</span>`).join('')}</div>`:`<div class="steps">${AFTER.map((a,i)=>`<i class="${i<=seq?'on':''}"></i>`).join('')}</div>`}
   <div id="dz">${dhikrHTML(cur())}</div>
   <button class="tap" id="tap"><span class="n" id="cnt">${count}</span><span class="of">${mode==='after'?'/ '+target():t('tap')}</span></button>
   <div class="row"><button class="btn" id="rst">${t('reset')}</button></div>
   <div class="small" id="tot"></div>`;
  el.querySelectorAll('[data-m]').forEach(c=>c.onclick=()=>{mode=c.dataset.m;count=0;seq=0;render();});
  el.querySelectorAll('[data-p]').forEach(c=>c.onclick=()=>{phrase=c.dataset.p;count=0;render();});
  el.querySelector('#rst').onclick=()=>{count=0;seq=0;render();};
  const tapEl=el.querySelector('#tap');tapEl.onclick=tap;tot();};
 const tot=()=>{const e=el.querySelector('#tot');if(!e)return;const parts=[];if(opt.extra)parts.push(opt.extra());parts.push(t('todayAll',{n:nf(todayAll)}));if(me)parts.push(t('mine',{n:nf((me.dhikr||0)+pendN)}));e.innerHTML=parts.join('<br>');};
 function tap(){const k=cur();count++;queueDhikr(k,opt.group);broadcastTap(!!opt.room);opt.onTap&&opt.onTap();
  const n=el.querySelector('#cnt');if(n)n.textContent=count;
  if(vib&&navigator.vibrate){try{navigator.vibrate(count%33===0?40:8);}catch(_){}}
  if(mode==='after'&&count>=target()){chime(659.25,.22);if(seq<AFTER.length-1){seq++;count=0;setTimeout(render,250);}else{setTimeout(()=>{el.querySelector('#dz').innerHTML=`<div class="verse">${t('tasbihDone')}</div>`;},250);seq=0;count=0;mode='free';setTimeout(render,2200);}}
  else if(count%33===0)chime(659.25,.18);
  tot();}
 render();tapTarget=tap;
 const lis=()=>tot();dhikrListeners.add(lis);
 return()=>{dhikrListeners.delete(lis);if(pendN)flushDhikr(opt.group);if(tapTarget===tap)tapTarget=null;};}
function refreshToday(){if(!sb)return;rpc('mecca_dhikr_today').then(r=>{let s=0;for(const x in r||{})s+=+r[x]||0;todayAll=Math.max(todayAll,s);dhikrListeners.forEach(f=>f());}).catch(()=>{});}
function openTasbih(mode,o){o=o||{};refreshToday();const group=!!o.group;if(group)groupLogged=false;
 openSheet(group?t('gPublic'):t('tasbihT'),`${group?'<div class="ref" id="gl" style="margin:0 0 6px"></div>':`<div class="p">${t('tasbihP')}</div>`}<div id="tz"></div>`,root=>{
  const gl=root.querySelector('#gl');const upd=()=>{if(!gl)return;syncCircle();const g=groupInfo();gl.textContent=(g.live?t('gLiveLeft',{t:mmss(g.left)}):t('gStartsIn',{t:mmss(g.until)}))+' · '+t('gLiveCount',{n:nf(circleCount)});};
  const stop=mountTasbih(root.querySelector('#tz'),{mode:mode||'free',group,onTap:upd});let iv=null;if(gl){upd();iv=setInterval(upd,1000);dhikrListeners.add(upd);}
  return()=>{stop();if(iv)clearInterval(iv);dhikrListeners.delete(upd);};});}

/* ---------- accounts ---------- */
function requireLogin(after){if(me){after();return;}openAccount(t('needLogin'),after);}
function openAccount(reason,after){if(me){openProfile();return;}let mode='login',email='';
 const render=root=>{root.innerHTML=`${reason?`<div class="p" style="margin-bottom:8px">${reason}</div>`:''}<div class="tabs"><button data-m="login" class="${mode==='login'?'on':''}">${t('login')}</button><button data-m="register" class="${mode==='register'?'on':''}">${t('register')}</button></div>
  <input class="field" id="ae" type="email" autocomplete="email" placeholder="${t('email')}" value="${esc(email)}">
  ${mode==='register'?`<input class="field" id="an" maxlength="24" placeholder="${t('dname')}" style="margin-top:8px">`:''}
  <input class="field" id="ap" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="${t('password')}" style="margin-top:8px">
  <div class="row"><button class="btn pri" id="ago">${mode==='login'?t('loginBtn'):t('regBtn')}</button></div>
  <div class="note"><a href="/privacy.html" style="color:#c9b27a">${t('privacy')}</a></div>`;
  root.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{email=root.querySelector('#ae').value;mode=b.dataset.m;render(root);});
  root.querySelector('#ago').onclick=async()=>{const btn=root.querySelector('#ago');const e=root.querySelector('#ae').value.trim(),p=root.querySelector('#ap').value;let r;btn.disabled=true;
   try{r=mode==='login'?await rpc('mecca_login',{p_email:e,p_password:p}):await rpc('mecca_register',{p_email:e,p_password:p,p_name:root.querySelector('#an').value.trim(),p_lang:LANG});}catch(_){r={error:'offline'};}
   btn.disabled=false;if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}
   token=r.token;store.set('tok',token);me=r.user;setAcctBtn();retrack();closeSheet();toast(t('welcome',{n:me.name}));if(after)setTimeout(after,350);};};
 openSheet(t('acctT'),'<div id="acc"></div>',root=>{render(root.querySelector('#acc'));});}
function openProfile(){const u=me;const st=[t('statDhikr',{n:nf(u.dhikr)}),t('statGroup',{n:u.group_sessions}),t('statHajj',{n:u.hajj_done})];if(u.supports)st.push(t('statSupport',{n:u.supports}));
 openSheet(t('acctT'),`<div class="p">${esc(u.email)}</div><div class="stats">${st.map(s=>`<span class="chip">${s}</span>`).join('')}${u.hajj_course?`<span class="chip on">🕋 ${t('courseHave')}</span>`:''}</div>
  <label class="lbl">${t('dname')}</label><input class="field" id="pn" maxlength="24" value="${esc(u.name)}">
  <label class="chk"><input type="checkbox" id="ps" ${u.show_name?'checked':''}> ${t('showName')}</label>
  <label class="chk"><input type="checkbox" id="pv" ${store.get('vib',true)?'checked':''}> ${t('vibrate')}</label>
  <label class="lbl">${t('currency')}</label><div class="row" style="justify-content:flex-start"><button class="btn ${CUR==='eur'?'pri':''}" data-c="eur">EUR €</button><button class="btn ${CUR==='usd'?'pri':''}" data-c="usd">USD $</button></div>
  <div class="row"><button class="btn pri" id="psave">${t('saveBtn')}</button><button class="btn" id="pout">${t('logout')}</button></div>`,root=>{
  root.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{CUR=b.dataset.c;store.set('cur',CUR);root.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('pri',x===b));});
  root.querySelector('#pv').onchange=e=>store.set('vib',e.target.checked);
  root.querySelector('#psave').onclick=async()=>{let r;try{r=await rpc('mecca_update_profile',{p_token:token,p_name:root.querySelector('#pn').value.trim(),p_show_name:root.querySelector('#ps').checked,p_lang:LANG});}catch(_){r={error:'offline'};}
   if(r&&r.user){me=r.user;setAcctBtn();retrack();toast(t('saved'));}else{if(r&&r.error==='auth')logoutLocal();toast(t('aErr_'+((r&&r.error)||'offline')));}};
  root.querySelector('#pout').onclick=async()=>{try{await rpc('mecca_logout',{p_token:token});}catch(_){}logoutLocal();closeSheet();};});}
$('#acctbtn').onclick=()=>openAccount();

/* ---------- payments (PayPal; beta-free while payments are switched off) ---------- */
async function buy(kind){if(!sb){toast(t('aErr_offline'));return null;}let r;
 try{r=await rpc('mecca_create_order',{p_token:token,p_kind:kind,p_currency:CUR});}catch(_){toast(t('aErr_offline'));return null;}
 if(!r||r.error){if(r&&r.error==='auth'){logoutLocal();openAccount(t('needLogin'));}else toast(t('aErr_'+((r&&r.error)||'offline')));return null;}
 if(r.status==='beta_free')return r.id;
 try{const res=await fetch(SB_URL+'/functions/v1/mecca-paypal-checkout',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:r.id,lang:LANG,origin:location.origin})});
  const j=await res.json();if(j&&j.url){store.set('pend',{id:r.id,kind,ts:Date.now()});location.href=j.url;return null;}}catch(_){}
 toast(t('payFail'));return null;}
async function useOrder(id){let r;try{r=await rpc('mecca_use_order',{p_token:token,p_id:id});}catch(_){r={error:'offline'};}if(r&&r.user){me=r.user;setAcctBtn();}return r;}
let resume=null;
async function checkReturn(){const q=new URLSearchParams(location.search);const p=store.get('pend',null);if(!q.has('pay')&&!p)return;
 if(q.has('pay'))history.replaceState(null,'',location.pathname);
 if(!p||!token)return;if(q.get('pay')==='cancel'||Date.now()-p.ts>36e5){store.set('pend',null);if(q.get('pay')==='cancel')toast(t('payCancel'));return;}
 if(q.get('pay')==='ok'){toast(t('payWaiting'));try{await fetch(SB_URL+'/functions/v1/mecca-paypal-capture',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:p.id})});}catch(_){}}
 for(let i=0;i<12;i++){let s=null;try{s=await rpc('mecca_order_status',{p_token:token,p_id:p.id});}catch(_){}
  if(s==='paid'){store.set('pend',null);resume=p;toast(t('payDone'));return;}if(s==='used'||s==='failed'||s==null){store.set('pend',null);return;}await new Promise(r=>setTimeout(r,1500));}}
function priceNote(){return payOn?t('payNote'):t('betaFree');}
async function finishOrder(id,kind){const r=await useOrder(id);if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}
 if(kind==='support'){chime(783.99,.25);openSheet(t('supportT'),`<div class="verse">🤍</div><div class="p" style="text-align:center">${t('supportThanks')}</div><div class="row"><button class="btn" id="x">${t('close')}</button></div>`,r2=>{r2.querySelector('#x').onclick=closeSheet;});}
 else runCourse();}

/* ---------- support ---------- */
function openSupport(){openSheet(t('supportT'),`<div class="p">${t('supportP')}</div><div class="row"><button class="btn pri" id="sp">${t('supportBtn',{p:price(PRICE.support)})}</button></div><div class="note">${t('supportNote')}<br>${priceNote()}</div>`,root=>{
 root.querySelector('#sp').onclick=()=>requireLogin(async()=>{const id=await buy('support');if(id)finishOrder(id,'support');});});}
$('#supportLink').onclick=e=>{e.preventDefault();begin('support');};

/* ---------- du'a wall ---------- */
function openWall(){const mine=store.get('wall',[]);const amined=store.get('amined',{});const reported=store.get('reported',{});let items=[],state=sb?'loading':'offline';
 const draw=root=>{const bx=root.querySelector('#cards');let h='';
  mine.forEach(c=>{h+=`<div class="card"><div class="t">${esc(c.t)}</div><div class="m"><span>${t('yourReq')}<span class="tag">${t('reviewing')}</span></span><span>${new Date(c.at).toLocaleDateString()}</span></div></div>`;});
  if(state==='loading')h+=`<div class="p" style="text-align:center;padding:14px">${t('wallLoading')}</div>`;
  else if(state==='offline')h+=`<div class="p" style="text-align:center;padding:14px">${t('wallOffline')}</div>`;
  else if(!items.length)h+=`<div class="p" style="text-align:center;padding:14px">${t('wallEmpty')}</div>`;
  items.forEach(c=>{if(reported[c.id])return;const done=amined[c.id];h+=`<div class="card"><div class="t">${esc(c.body)}</div><div class="m"><span>${t('anon')} · ${new Date(c.created_at).toLocaleDateString()} · <a href="#" data-r="${c.id}" style="color:#7f8c7e">${t('report')}</a></span><button class="btn" data-id="${c.id}">${done?t('amined'):t('amin')} · ${c.amin_count}</button></div></div>`;});
  bx.innerHTML=h;
  bx.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id;if(amined[id])return;amined[id]=1;store.set('amined',amined);chime(587.33,.2);toast(t('aminToast'));
   const it=items.find(x=>x.id===id);if(it)it.amin_count++;draw(root);try{const n=await rpc('mecca_amin',{p_id:id});if(it&&n>=0){it.amin_count=n;draw(root);}}catch(_){}});
  bx.querySelectorAll('[data-r]').forEach(a=>a.onclick=async e=>{e.preventDefault();const id=a.dataset.r;reported[id]=1;store.set('reported',reported);draw(root);toast(t('reportedToast'));try{await rpc('mecca_report',{p_id:id});}catch(_){} });};
 const load=async root=>{if(!sb){state='offline';draw(root);return;}try{items=await rpc('mecca_list_duas')||[];state='ok';}catch(_){state='offline';}draw(root);};
 openSheet(t('wallT'),`<div class="p">${t('wallP')}</div>
  <textarea class="field" id="wt" maxlength="120" placeholder="${t('wallPh')}" style="min-height:80px;margin-top:10px"></textarea>
  <div class="row"><button class="btn pri" id="wp">${t('wallSubmit')}</button></div><div id="cards"></div>
  <div class="note">${t('wallRules')}</div>`,root=>{draw(root);load(root);
  root.querySelector('#wp').onclick=async()=>{const ta=root.querySelector('#wt'),v=ta.value.trim();if(v.length<2){toast(t('moreWords'));return;}const btn=root.querySelector('#wp');btn.disabled=true;
   let r='offline';try{r=await rpc('mecca_submit_dua',{p_body:v});}catch(_){}btn.disabled=false;
   toast(DICT['eRes_'+r]?t('eRes_'+r):t('eRes_fail'));if(r==='pending'){mine.unshift({t:v,at:Date.now()});mine.splice(10);store.set('wall',mine);ta.value='';draw(root);}};});}

/* ---------- Qur'an (AlQuran.cloud) ---------- */
const QAPI='https://api.alquran.cloud/v1',QTR=LANG==='zh'?'zh.majian':'en.pickthall';const qcache=new Map();
async function qget(path){if(qcache.has(path))return qcache.get(path);const r=await fetch(QAPI+path);if(!r.ok)throw new Error(r.status);const j=await r.json();if(!j||j.code!==200)throw new Error('bad');qcache.set(path,j.data);return j.data;}
const dayIdx=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);let ayahOff=0;
function openQuran(tab){tab=tab||'daily';let surahs=null,filter='';
 openSheet(t('quranT'),`<div class="tabs"><button data-t="daily">${t('qDaily')}</button><button data-t="read">${t('qRead')}</button></div><div id="qz"></div><div class="note">${t('qSrc')} · <a href="https://quran.com" target="_blank" rel="noopener" style="color:#c9b27a">${t('qOpen')}</a></div>`,root=>{
  const qz=root.querySelector('#qz');let alive=true;
  const fail=retry=>{qz.innerHTML=`<div class="p" style="text-align:center;padding:14px">${t('qFail')}</div><div class="row"><button class="btn" id="rt">${t('qRetry')}</button></div>`;qz.querySelector('#rt').onclick=retry;};
  const loading=()=>{qz.innerHTML=`<div class="p" style="text-align:center;padding:14px">${t('qLoading')}</div>`;};
  async function daily(){loading();const L=window.DAILY_AYAHS,ref=L[(dayIdx+ayahOff)%L.length];
   try{const d=await qget(`/ayah/${ref}/editions/quran-uthmani,${QTR}`);if(!alive)return;const ar=d[0],tr=d[1];
    qz.innerHTML=`<div class="ar" style="font-size:26px;margin-top:6px">${esc(ar.text)}</div><div class="verse" style="font-size:16px;text-align:left">${esc(tr.text)}</div>
     <div class="ref">— ${esc(ar.surah.englishName)} · ${ar.surah.number}:${ar.numberInSurah}</div><div class="row"><button class="btn" id="nx">${t('qNext')}</button><button class="btn" id="rs">${t('qRead')} · ${esc(ar.surah.englishName)}</button></div>`;
    qz.querySelector('#nx').onclick=()=>{ayahOff++;daily();};qz.querySelector('#rs').onclick=()=>{setTab('read');readSurah(ar.surah.number);};}catch(_){if(alive)fail(daily);}}
  async function list(){if(!surahs){loading();try{surahs=await qget('/surah');}catch(_){if(alive)fail(list);return;}}if(!alive)return;
   qz.innerHTML=`<input class="field" id="qs" placeholder="${t('qSearch')}" value="${esc(filter)}"><div class="slist" id="sl"></div>`;
   const drawL=()=>{const f=filter.trim().toLowerCase();qz.querySelector('#sl').innerHTML=surahs.filter(s=>!f||String(s.number)===f||s.englishName.toLowerCase().includes(f)||s.name.includes(f)||(s.englishNameTranslation||'').toLowerCase().includes(f)).map(s=>`<button class="btn" data-s="${s.number}"><span>${s.number}. ${esc(s.englishName)} <small>${esc(s.englishNameTranslation||'')}</small></span><span><span class="ar sm" style="font-size:18px;line-height:1">${esc(s.name)}</span> <small>${t('qAyahs',{n:s.numberOfAyahs})}</small></span></button>`).join('');
    qz.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>readSurah(+b.dataset.s));};
   drawL();qz.querySelector('#qs').oninput=e=>{filter=e.target.value;drawL();};}
  async function readSurah(n){loading();try{const d=await qget(`/surah/${n}/editions/quran-uthmani,${QTR}`);if(!alive)return;const ar=d[0],tr=d[1];
    qz.innerHTML=`<div class="row" style="justify-content:space-between"><button class="btn" id="bk">${t('qBack')}</button><div class="ref" style="margin:0">${n}. ${esc(ar.englishName)} <span class="ar sm" style="font-size:18px">${esc(ar.name)}</span></div></div>`+
     ar.ayahs.map((a,i)=>`<div class="ayah"><div class="ar">${esc(a.text)}</div><div class="tx"><span class="no">${a.numberInSurah}</span>${esc((tr.ayahs[i]||{}).text||'')}</div></div>`).join('');
    qz.querySelector('#bk').onclick=list;root.parentElement&&($('#sheetBody').scrollTop=0);}catch(_){if(alive)fail(()=>readSurah(n));}}
  function setTab(tb){root.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tb));}
  root.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{setTab(b.dataset.t);b.dataset.t==='daily'?daily():list();});
  setTab(tab);tab==='daily'?daily():list();return()=>{alive=false;};});}

/* ---------- Kaaba info ---------- */
function openKaaba(){openSheet(t('kaabaT'),`<div class="p">${t('kaabaP')}</div><div class="row"><button class="btn pri" id="hj">🕋 ${t('hajjT')}</button><button class="btn" id="qr">📖 ${t('quranT')}</button></div><div class="note">${t('kaabaNote')}<br>${t('disclaimer')}</div>`,root=>{
 root.querySelector('#hj').onclick=()=>openHajj();root.querySelector('#qr').onclick=()=>openQuran();});}

/* ---------- Hajj / Umrah practice ---------- */
function talbiyahHTML(){const T=window.TALBIYAH;return`<div class="card"><div class="ref" style="margin:0 0 4px">${t('talbiyahT')}</div><div class="ar sm">${T.ar}</div><div class="tr">${T.tr}</div><div class="mean" style="margin-top:6px">${T[LANG]}</div></div>`;}
function openHajj(){const have=me&&me.hajj_course;
 openSheet(t('hajjT'),`<div class="p">${t('hajjP')}</div>
  <div class="sec">${t('umrahH')}</div><ol class="st">${['u1','u2','u3','u4','u5','u6'].map(k=>`<li>${t(k)}</li>`).join('')}</ol>
  <div class="sec">${t('hajjH')}</div><ol class="st">${['h8','h9','h10','h11','h12'].map(k=>`<li>${t(k)}</li>`).join('')}</ol>
  ${talbiyahHTML()}
  <div class="sec">${have?t('courseHave'):t('courseBuy',{p:price(PRICE.course)})}</div>
  ${have?'':`<ul class="q">${['courseInc1','courseInc2','courseInc3','courseInc4','courseInc5'].map(k=>`<li>${t(k)}</li>`).join('')}</ul>`}
  <div class="row"><button class="btn pri" id="cgo">${have?t('courseOpen'):t('courseBuy',{p:price(PRICE.course)})}</button></div>
  <div class="note">${have?'':priceNote()+'<br>'}${t('hajjNote')}</div>`,root=>{
  root.querySelector('#cgo').onclick=()=>{if(me&&me.hajj_course){runCourse();return;}requireLogin(async()=>{if(me.hajj_course){runCourse();return;}const id=await buy('hajj_course');if(id)finishOrder(id,'hajj_course');});};});}
function stopAuto(){if(auto){auto=null;P.mode='walk';}}
function startAuto(fn,dur,onStep,done){P.mode='auto';auto={fn,dur,t:0,speed:1,onStep,done};}
function tele(x,z,yaw,cb){closeSheet();leaveRoom();stopAuto();saved=null;lockKind=null;P.mode='anim';fade(()=>{P.x=x;P.z=z;P.yaw=yaw;P.pitch=0;P.eye=1.65;P.mode='walk';cb&&setTimeout(cb,150);});}
function teleKeep(x,z,yaw,cb){stopAuto();saved=null;lockKind=null;P.mode='anim';fade(()=>{P.x=x;P.z=z;P.yaw=yaw;P.pitch=.05;P.eye=1.65;P.mode='walk';cb&&setTimeout(cb,150);});}
const TAWAF_R=6.2,A0=-Math.PI/4;
function tawafPos(k){const a=A0+k*Math.PI*14;return{x:TAWAF_R*Math.cos(a),z:-TAWAF_R*Math.sin(a),yaw:a+.35};}
function saiPos(k){const leg=Math.min(6,Math.floor(k*7)),f=k*7-leg,go=leg%2===0,z=go?-12.2+24.4*f:12.2-24.4*f;return{x:18.2,z,yaw:go?Math.PI:0,leg};}
function runCourse(){let step=0;const N=8;
 const go=(where,cb)=>{if(where==='gate')teleKeep(0,18.4,0,cb);else if(where==='stone'){const p=tawafPos(0);teleKeep(p.x,p.z,yawTo(p.x,p.z),cb);}else if(where==='maqam')teleKeep(1.6,7.4,yawTo(1.6,7.4),cb);else if(where==='safa')teleKeep(18.2,-12.2,Math.PI,cb);else cb&&cb();};
 const render=root=>{stopAuto();$('#sheet').classList.remove('mini');const head=`<div class="steps">${Array.from({length:N},(_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div><div class="small" style="margin-bottom:6px">${t('stepN',{n:step+1,m:N})}</div>`;
  const nav=(dis)=>`<div class="row">${step>0?`<button class="btn" data-b>${t('back')}</button>`:''}<button class="btn pri" data-n ${dis?'disabled':''}>${step<N-1?t('cont'):t('courseFinish')}</button></div>`;let h='',dis=false;
  if(step===0)h=`<div class="cfh">${t('c1T')}</div><div class="p">${t('c1P')}</div>${talbiyahHTML()}<div class="note" style="margin-top:4px">${t('c1Rules')}</div>`;
  else if(step===1)h=`<div class="cfh">${t('c2T')}</div><div class="p">${t('c2P')}</div>`;
  else if(step===2){dis=!runCourse.tawafDone;h=`<div class="cfh">${t('c3T')}</div><div class="p">${t('c3P')}</div><div class="card"><div class="ar sm">${window.BISMILLAH_TAKBIR.ar}</div><div class="tr">${window.BISMILLAH_TAKBIR.tr}</div></div><div class="note" style="margin-top:4px">${t('c3Tip')}</div><div id="anim" class="big" style="font-size:22px"></div><div class="row"><button class="btn pri" id="go">${t('c3Btn')}</button><button class="btn" id="fast" style="display:none">${t('faster')}</button><button class="btn" id="sk">${t('skip')}</button></div>`;}
  else if(step===3)h=`<div class="cfh">${t('c4T')}</div><div class="p">${t('c4P')}</div>`;
  else if(step===4)h=`<div class="cfh">${t('c5T')}</div><div class="p">${t('c5P')}</div>`;
  else if(step===5){dis=!runCourse.saiDone;h=`<div class="cfh">${t('c6T')}</div><div class="p">${t('c6P')}</div><div id="anim" class="big" style="font-size:22px"></div><div class="small" id="gz"></div><div class="row"><button class="btn pri" id="go">${t('c6Btn')}</button><button class="btn" id="fast" style="display:none">${t('faster')}</button><button class="btn" id="sk">${t('skip')}</button></div>`;}
  else if(step===6)h=`<div class="cfh">${t('c7T')}</div><div class="p">${t('c7P')}</div>`;
  else h=`<div class="cfh">${t('c8T')}</div><div class="p">${t('c8P')}</div><ol class="st">${['h8','h9','h10','h11','h12'].map(k=>`<li>${t(k)}</li>`).join('')}</ol><div class="sec"></div>${DICT.c8L.map((x,i)=>`<label class="chk"><input type="checkbox"> ${esc(x)}</label>`).join('')}<div class="note">${t('hajjNote')}</div>`;
  root.innerHTML=head+h+nav(dis);
  root.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{if(step<N-1){step++;enter(root);}else finish(root);});
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{step--;enter(root);});
  const goB=root.querySelector('#go'),fast=root.querySelector('#fast'),sk=root.querySelector('#sk'),an=root.querySelector('#anim');
  if(goB&&step===2){goB.onclick=()=>{goB.style.display='none';fast.style.display='';$('#sheet').classList.add('mini');const p=tawafPos(0);
    teleKeep(p.x,p.z,p.yaw,()=>{let lastLap=0;startAuto(tawafPos,42,k=>{const lap=Math.min(7,Math.floor(k*7)+1);if(lap!==lastLap){lastLap=lap;an.textContent=t('lap',{n:lap});if(lap>1)chime(659.25,.18);}},()=>{runCourse.tawafDone=true;chime(783.99,.25);an.textContent=t('lapsDone');fast.style.display='none';$('#sheet').classList.remove('mini');root.querySelector('[data-n]').disabled=false;});});};
   fast.onclick=()=>{if(auto)auto.speed=auto.speed>1?1:3;};sk.onclick=()=>{runCourse.tawafDone=true;stopAuto();step++;enter(root);};}
  if(goB&&step===5){const gz=root.querySelector('#gz');goB.onclick=()=>{goB.style.display='none';fast.style.display='';$('#sheet').classList.add('mini');
    teleKeep(18.2,-12.2,Math.PI,()=>{let lastLeg=-1;startAuto(saiPos,35,k=>{const p=saiPos(k);if(p.leg!==lastLeg){lastLeg=p.leg;an.textContent=t('leg',{n:p.leg+1});if(p.leg>0)chime(659.25,.18);}gz.textContent=Math.abs(P.z)<3?t('green'):'';if(auto)auto.speed=Math.abs(P.z)<3?Math.max(auto.speed,1.6):(auto.speed>2?auto.speed:1);},()=>{runCourse.saiDone=true;chime(783.99,.25);an.textContent=t('legsDone');gz.textContent='';fast.style.display='none';$('#sheet').classList.remove('mini');root.querySelector('[data-n]').disabled=false;});});};
   fast.onclick=()=>{if(auto)auto.speed=auto.speed>2?1:3;};sk.onclick=()=>{runCourse.saiDone=true;stopAuto();step++;enter(root);};}
  $('#sheetBody').scrollTop=0;};
 let lastWhere=null;const enter=root=>{const where=['gate','gate','stone','maqam','maqam','safa',null,null][step];if(where&&where!==lastWhere){lastWhere=where;go(where);}render(root);};
 const finish=root=>{if(token)rpc('mecca_hajj_done',{p_token:token}).then(r=>{if(r&&r.user)me=r.user;}).catch(()=>{});chime(783.99,.3);
  root.innerHTML=`<div class="verse">${t('courseDone')}</div>${dhikrHTML('allahuakbar',true)}<div class="row"><button class="btn" id="card">${t('courseCard')}</button><button class="btn pri" id="fin">${t('done')}</button></div><div class="note">${t('hajjNote')}</div>`;
  root.querySelector('#card').onclick=courseCard;root.querySelector('#fin').onclick=closeSheet;};
 runCourse.tawafDone=false;runCourse.saiDone=false;
 openSheet(t('hajjT'),'<div id="cs"></div>',root=>{const el=root.querySelector('#cs');enter(el);return()=>{stopAuto();};});}
function wrapLines(g,text,maxW){const out=[];const isCJK=/[㐀-鿿]/.test(text);const parts=isCJK?Array.from(text):text.split(' ');let line='';
 parts.forEach(p=>{const test=line?(isCJK?line+p:line+' '+p):p;if(g.measureText(test).width>maxW&&line){out.push(line);line=p;}else line=test;});if(line)out.push(line);return out;}
function courseCard(){const W=1080,H=1350,[c,g]=mkC(W,H);const gr=g.createRadialGradient(W/2,H*.38,50,W/2,H*.45,H*.8);gr.addColorStop(0,'#14403a');gr.addColorStop(1,'#050d0c');g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.strokeStyle='#d8b25e';g.lineWidth=4;g.strokeRect(50,50,W-100,H-100);g.lineWidth=1.5;g.strokeRect(66,66,W-132,H-132);
 g.fillStyle='#0a0a0a';g.fillRect(W/2-60,150,120,130);g.fillStyle='#d8b25e';g.fillRect(W/2-60,180,120,16);
 const serif='"Noto Serif SC","Songti SC",Georgia,serif';g.textAlign='center';g.fillStyle='#f1d693';g.font='600 60px '+serif;g.fillText(t('cardTitle'),W/2,380);
 g.fillStyle='#b7b9a6';g.font='30px '+serif;g.fillText(new Date().toLocaleDateString(LANG==='zh'?'zh-CN':'en-GB',{year:'numeric',month:'long',day:'numeric'})+' · '+PT.hijri(new Date(),LANG).text,W/2,440);
 g.fillStyle='#f3eedf';g.font='40px '+serif;let y=560;wrapLines(g,t('cardLine'),W-260).forEach(l=>{g.fillText(l,W/2,y);y+=64;});
 if(me&&me.show_name){g.fillStyle='#d8b25e';g.font='44px '+serif;g.fillText(me.name,W/2,y+40);y+=100;}
 g.fillStyle='#f1d693';g.font='56px "Noto Naskh Arabic","Amiri",serif';g.fillText(window.TALBIYAH.ar.split('،')[0],W/2,y+80);
 g.fillStyle='#7f8c7e';g.font='26px '+serif;g.fillText(t('cardNote'),W/2,H-160);g.fillText(LANG==='zh'?'云上麦加 · Cloud Mecca':'Cloud Mecca · 云上麦加',W/2,H-110);
 try{const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='umrah-practice.png';document.body.appendChild(a);a.click();a.remove();}catch(_){}}

/* ---------- dhikr circles sheet ---------- */
function openGroup(){let rooms=[],iv=null,startIn=0,dur=10;
 const drawPublic=root=>{const g=groupInfo();syncCircle();root.querySelector('#gpub').innerHTML=g.live?`<div class="verse">${t('gLiveLeft',{t:mmss(g.left)})}</div><div class="ref">${t('gNow',{n:onlineN})} · ${t('gLiveCount',{n:nf(circleCount)})}</div><div class="row"><button class="btn pri" id="gj">${t('gJoin')}</button></div>`
   :`<div class="verse">${t('gStartsIn',{t:mmss(g.until)})}</div><div class="p" style="text-align:center">${t('gChime')}</div><div class="row"><button class="btn" id="gj">${t('gJoin')}</button></div>`;const j=root.querySelector('#gj');if(j)j.onclick=()=>joinPublic();};
 const drawRooms=root=>{const now=Date.now();const el=root.querySelector('#grooms');if(!sb){el.innerHTML='';return;}
  el.innerHTML=rooms.length?rooms.map((r,i)=>{const st=new Date(r.starts_at).getTime(),live=now>=st;return`<div class="card"><div class="t">${esc(r.topic)}</div><div class="m"><span>${t('gHost',{n:esc(r.host_name||'—')})} · ${live?`<b style="color:#8fd18b">${t('gLive')}</b>`:t('gIn',{t:mmss(st-now)})} · ${t('gMins',{n:r.duration_min})}</span><button class="btn" data-r="${i}">${t('gEnter')}</button></div></div>`;}).join(''):`<div class="p">${t('gNoRooms')}</div>`;
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const r=rooms[+b.dataset.r];requireLogin(()=>joinRoom(r));});};
 const drawCreate=root=>{const el=root.querySelector('#gcreate');if(!sb){el.innerHTML='';return;}
  el.innerHTML=`<input class="field" id="gt" maxlength="60" placeholder="${t('gTopic')}"><label class="lbl">${t('gStart')}</label><div class="row" style="justify-content:flex-start">${[[0,'gNowOpt'],[15,'gIn15'],[30,'gIn30'],[60,'gIn60']].map(([v,k])=>`<button class="btn ${startIn===v?'pri':''}" data-s="${v}">${t(k)}</button>`).join('')}</div>
   <label class="lbl">${t('gDur')}</label><div class="row" style="justify-content:flex-start">${[5,10,15,30].map(v=>`<button class="btn ${dur===v?'pri':''}" data-d="${v}">${t('gMins',{n:v})}</button>`).join('')}</div><div class="row"><button class="btn pri" id="gc">${t('gCreateBtn')}</button></div>`;
  el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const tp=el.querySelector('#gt').value;startIn=+b.dataset.s;drawCreate(root);el.querySelector('#gt').value=tp;});
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const tp=el.querySelector('#gt').value;dur=+b.dataset.d;drawCreate(root);el.querySelector('#gt').value=tp;});
  el.querySelector('#gc').onclick=()=>{const topic=el.querySelector('#gt').value.trim();requireLogin(async()=>{let r;try{r=await rpc('mecca_create_room',{p_token:token,p_topic:topic,p_start_in_min:startIn,p_duration:dur});}catch(_){r={error:'offline'};}
   if(!r||r.error){if(r&&r.error==='auth'){logoutLocal();openAccount(t('needLogin'));return;}const k='gErr_'+((r&&r.error)||'');toast(DICT[k]?t(k):t('aErr_'+((r&&r.error)||'offline')));return;}
   toast(t('gCreated'));joinRoom({id:r.id,topic,host_name:me.name,starts_at:new Date(Date.now()+startIn*60e3).toISOString(),duration_min:dur});});};};
 openSheet(t('groupT'),`<div class="p">${t('groupP')}</div><div class="sec">${t('gPublic')}</div><div id="gpub"></div><div class="sec">${t('gRooms')}</div><div id="grooms"></div><div class="sec">${t('gCreate')}</div><div id="gcreate"></div>`,root=>{
  drawPublic(root);drawRooms(root);drawCreate(root);
  if(sb)rpc('mecca_list_rooms').then(r=>{rooms=r||[];drawRooms(root);}).catch(()=>{});
  iv=setInterval(()=>{drawPublic(root);drawRooms(root);},1000);return()=>clearInterval(iv);});}
function joinPublic(){sitQuick(()=>openTasbih('free',{group:true}));}
function joinRoom(r){sitQuick(()=>openRoomDhikr(r));}
function openRoomDhikr(r){let iv=null,stop=null,total=0,started=false;const st=new Date(r.starts_at).getTime(),endT=st+r.duration_min*60e3;
 openSheet(r.topic,`<div class="ref">${t('gHost',{n:esc(r.host_name||'—')})}</div><div class="small" id="rs"></div><div id="rz"></div><div id="rppl"></div>`,root=>{
  const rs=root.querySelector('#rs'),rz=root.querySelector('#rz'),pp=root.querySelector('#rppl');groupLogged=false;
  const drawPeople=()=>{const p=roomPeople();pp.innerHTML=peopleHTML(p.names,p.anon);};
  const extra=()=>t('roomCount',{n:nf(total)});
  joinRoomChannel(r.id,drawPeople,n=>{total+=n;todayAll+=n;dhikrListeners.forEach(f=>f());});
  const tick=()=>{const now=Date.now();
   if(now<st){rs.textContent=t('roomWait',{t:mmss(st-now)});if(!rz.innerHTML)rz.innerHTML=dhikrHTML('lailaha');return;}
   if(now>=endT){rs.textContent='';if(stop){stop();stop=null;}rz.innerHTML=`<div class="verse">${t('roomEnded')}</div><div class="small">${extra()}</div>`;clearInterval(iv);return;}
   rs.textContent=t('gLiveLeft',{t:mmss(endT-now)});
   if(!started){started=true;chime(587.33,.3);rz.innerHTML='';stop=mountTasbih(rz,{mode:'free',phrase:'lailaha',room:true,group:true,extra,onTap:()=>{total++;}});}};
  tick();iv=setInterval(tick,1000);
  return()=>{clearInterval(iv);if(stop)stop();leaveRoom();};});}
$('#group').onclick=openGroup;

/* ---------- map / teleport ---------- */
const PLACES=[['pGate',{x:0,z:18.4,yaw:0}],['pKaaba',{x:0,z:8.2,yaw:0}],['pRows',{x:-8.6,z:8.6,yaw:yawTo(-8.6,8.6)}],['pStone',{x:4.7,z:4.7,yaw:yawTo(4.7,4.7)}],['pQuran',{x:-6,z:-16.2,yaw:0}],['pWall',{x:6,z:-17.2,yaw:0}],['pTasbih',{x:-16.8,z:0,yaw:Math.PI/2}],['pSafa',{x:18.2,z:-11.6,yaw:Math.PI}]];
function goDo(kind){
 if(kind==='salah')return sitQuick(()=>openSalah());
 if(kind==='tasbih')return tele(-17.2,0,Math.PI/2,()=>sitCushion());
 if(kind==='group')return openGroup();
 if(kind==='wall')return tele(6,-17.2,0,()=>openWall());
 if(kind==='quran')return tele(-6,-16.2,0,()=>openQuran());
 if(kind==='hajj')return tele(17.6,0,-Math.PI/2,()=>openHajj());
 if(kind==='support')return openSupport();}
document.querySelectorAll('#dock [data-go]').forEach(b=>b.onclick=e=>{e.stopPropagation();goDo(b.dataset.go);});
function openMenu(){openSheet(t('menuT'),`<div class="sec" style="margin-top:4px;border:none;padding-top:0">${t('goT')}</div><div class="tele">${PLACES.map((p,i)=>`<button class="btn" data-i="${i}">${t(p[0])}<small>${t(p[0]+'S')}</small></button>`).join('')}</div>
 <div class="sec">${t('mSettings')}</div>
 <div class="row" style="justify-content:flex-start"><button class="btn" id="mlang">🌐 ${LANG==='zh'?'English':'中文'}</button><button class="btn" id="mamb">🌙 ${t('mAmbient')} · ${audioOn?t('mOn'):t('mOff')}</button><button class="btn" id="msup">🤍 ${t('support')}</button></div>
 <div class="note"><a href="/privacy.html" style="color:#c9b27a">${t('privacy')}</a> · ${t('goTip')}<br>${t('disclaimer')}</div>`,root=>{
 root.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const tg=PLACES[+b.dataset.i][1];tele(tg.x,tg.z,tg.yaw);});
 root.querySelector('#mlang').onclick=()=>{store.set('lang',LANG==='zh'?'en':'zh');location.reload();};
 root.querySelector('#mamb').onclick=()=>{setAudio(!audioOn);store.set('amb',audioOn);openMenu();};
 root.querySelector('#msup').onclick=()=>openSupport();});}
$('#menubtn').onclick=openMenu;
function fade(mid){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#050c0b;z-index:15;opacity:0;transition:opacity .35s;pointer-events:none';document.body.appendChild(o);requestAnimationFrame(()=>o.style.opacity=1);setTimeout(()=>{mid();o.style.opacity=0;setTimeout(()=>o.remove(),400);},380);}

/* ---------- audio: soft night wind (no music) + gentle chimes ---------- */
let ac=null,master=null,audioOn=false;
function initAudio(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
 master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
 const len=ac.sampleRate*6,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}
 const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=520;const g=ac.createGain();g.gain.value=.5;
 const lfo=ac.createOscillator();lfo.frequency.value=.07;const lg=ac.createGain();lg.gain.value=.22;lfo.connect(lg);lg.connect(g.gain);
 src.connect(lp);lp.connect(g);g.connect(master);src.start();lfo.start();}
function setAudio(on){initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();audioOn=on;master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(on?.5:0,ac.currentTime+1.5);}
function chime(f,vol){if(!ac)initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();vol=vol||.25;const t0=ac.currentTime;[[1,1],[2,.25]].forEach(([m,a])=>{const o=ac.createOscillator();o.type='sine';o.frequency.value=f*m;const g=ac.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol*a,t0+.015);g.gain.exponentialRampToValueAtTime(.0001,t0+1.6/m);o.connect(g);g.connect(ac.destination);o.start(t0);o.stop(t0+2);});}

/* ---------- loop ---------- */
const clock=new THREE.Clock();let lastZone='',hintT=0;
function update(dt,tm){
 if(anim){anim.t+=dt/anim.dur;const k=Math.min(1,anim.t),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const a=anim.from,b=anim.to;P.x=a.x+(b.x-a.x)*e;P.z=a.z+(b.z-a.z)*e;P.eye=a.eye+(b.eye-a.eye)*e;P.yaw=angLerp(a.yaw,b.yaw,e);P.pitch=a.pitch+(b.pitch-a.pitch)*e;if(k>=1){const th=anim.then;anim=null;th&&th();}}
 else if(auto){auto.t+=dt*auto.speed;const k=Math.min(1,auto.t/auto.dur);const p=auto.fn(k);P.x=p.x;P.z=p.z;P.yaw=angLerp(P.yaw,p.yaw,Math.min(1,dt*6));P.eye=1.65;P.pitch+=(.05-P.pitch)*Math.min(1,dt*3);P.bob+=dt*8*Math.min(2,auto.speed);auto.onStep&&auto.onStep(k);if(k>=1){const d=auto.done;auto=null;P.mode='walk';d&&d();}}
 else if(P.mode==='walk'){let f=0,s=0;if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyA||keys.ArrowLeft)s-=1;if(keys.KeyD||keys.ArrowRight)s+=1;f-=jy;s+=jx;
  const mag=Math.hypot(f,s);if(mag>.05){if(mag>1){f/=mag;s/=mag;}const sp=(keys.ShiftLeft?4.2:2.8)*dt;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);const dx=(-sy*f+cy*s)*sp,dz=(-cy*f-sy*s)*sp;
   if(!blocked(P.x+dx,P.z))P.x+=dx;if(!blocked(P.x,P.z+dz))P.z+=dz;P.bob+=dt*Math.min(1,mag)*8;}
  P.eye+=(1.65-P.eye)*Math.min(1,dt*6);}
 else if(P.mode==='locked'){if(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||Math.abs(jx)+Math.abs(jy)>.5){if(!sheetOpen)standUp();}}
 camera.position.set(P.x,P.eye+((P.mode==='walk'||P.mode==='auto')?Math.sin(P.bob)*.025:0),P.z);camera.rotation.set(P.pitch,P.yaw,0);
 curSpot=null;if(P.mode==='walk'&&!anim){for(const sp of spots){if(sp.test(P.x,P.z)){curSpot=sp;break;}}}
 renderActions();
 const z=P.mode==='locked'&&lockKind==='row'?t('zRow'):zoneAt(P.x,P.z);if(z!==lastZone){lastZone=z;$('#zone').textContent=z;}
 const fl=1+Math.sin(tm*1.3)*.04;for(let i=0;i<lamps.length;i++){const s=.9*(fl+Math.sin(tm*2.1+i)*.03);lamps[i].scale.set(s,s,1);}
 if(hintT>0){hintT-=dt;if(hintT<=0)$('#hint').style.opacity=0;}
 const now=performance.now();netTick(now,dt);pillTick(now);}
let fpsN=0,fpsT=performance.now(),frameN=0;
function adapt(now){fpsN++;const el=now-fpsT;if(el<2000)return;const fps=fpsN*1000/el;fpsN=0;fpsT=now;if(document.hidden)return;
 if(fps<42&&PR>.5){PR=Math.max(.5,PR*.8);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}
 else if(fps>57&&PR<MAX_PR){PR=Math.min(MAX_PR,PR*1.1);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}}
function loop(){requestAnimationFrame(loop);const now=performance.now();const dt=Math.min(.05,clock.getDelta());update(dt,clock.elapsedTime);frameN++;
 const idle=sheetOpen&&!anim&&!auto&&P.mode!=='walk';if(idle&&frameN%3)return;renderer.render(scene,camera);adapt(now);}

/* ---------- start ---------- */
camera.position.set(P.x,P.eye,P.z);renderer.render(scene,camera);
$('#loading').textContent=sb?t('connecting'):'';
loop();connect();loadConfig();refreshToday();
loadMe().then(checkReturn);
{const np=nextPrayer();if(np)$('#tSalahS').textContent=t('nextP',{p:t(np.key),t:fmtT(np.at)});}
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
let deferredPrompt=null;const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installLink').style.display='inline';});
if(isIOS&&!standalone)$('#installLink').style.display='inline';
$('#installLink').onclick=e=>{e.preventDefault();if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;}else if(isIOS)toast(t('iosInstall'));};
function begin(kind){$('#intro').classList.add('hide');document.body.classList.add('in');if(store.get('amb',true))setAudio(true);else initAudio();
 if(resume){const r=resume;resume=null;setTimeout(()=>finishOrder(r.id,r.kind),500);return;}
 if(kind&&kind!=='explore'){goDo(kind);return;}
 const h=$('#hint');h.textContent=t(isTouch?'hintTouch':'hintDesk');h.style.opacity=1;hintT=7;
 P.mode='anim';P.z=20;moveTo({x:0,z:16.6,eye:1.65,yaw:0,pitch:.06},2.4,()=>{P.mode='walk';});}
document.querySelectorAll('#intro [data-go]').forEach(b=>b.onclick=()=>begin(b.dataset.go));
window.__mecca={P,goDo,openSalah,openTasbih,openQuran,openHajj,runCourse,openWall,openGroup};
})();
