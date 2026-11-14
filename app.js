/* مكة في السحاب · 云上麦加 — app */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('mecca_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{if(v==null)localStorage.removeItem('mecca_'+k);else localStorage.setItem('mecca_'+k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`;};

/* ---------- language: Arabic first, Chinese second ---------- */
const LANG=(()=>{const s=store.get('lang',null);return s==='zh'?'zh':'ar';})();
const AR=LANG==='ar',DICT=window.I18N[LANG],DH=window.DHIKR,LOCALE=AR?'ar-SA':'zh-CN';
function t(k,v){let s=DICT[k];if(s==null)s=window.I18N.ar[k];if(s==null)return k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s;}
document.documentElement.lang=AR?'ar':'zh-CN';document.documentElement.dir=AR?'rtl':'ltr';
document.title=AR?'مكة في السحاب · 云上麦加':'云上麦加 · مكة في السحاب';
document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
const nf=n=>{try{return Number(n||0).toLocaleString(LOCALE);}catch(e){return String(n);}};
function switchLang(){store.set('lang',AR?'zh':'ar');location.reload();}
$('#langbtn').textContent=AR?'中':'ع';$('#langbtn').onclick=switchLang;$('#introLang').textContent=t('other');$('#introLang').onclick=switchLang;
let CUR=store.get('cur',null);
if(CUR!=='eur'&&CUR!=='usd'&&CUR!=='sar'){let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}CUR=/^Europe\//.test(tz)?'eur':'usd';}
function price(c){try{return new Intl.NumberFormat(LOCALE,{style:'currency',currency:CUR.toUpperCase(),minimumFractionDigits:c%100?2:0,maximumFractionDigits:2}).format(c/100);}catch(e){return (CUR==='eur'?'€':'$')+(c/100).toFixed(2);}}
const PRICE={support:100,course:990};
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;if(isTouch)document.body.classList.add('touch');
const photoURL=(slug,w)=>window.PHOTO_BASE+slug+'-'+(w||800)+'.jpg';
const ST=window.STEP_TEXT[LANG],STEPS=window.STEPS,SM=window.STEP_META;

/* ---------- backend (Supabase, mecca_* objects) ---------- */
const SB_URL='https://smwqqiebkdaheikihbrg.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtd3FxaWVia2RhaGVpa2loYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzU2NzksImV4cCI6MjEwNzU1MTY3OX0.ouoYJ_OTLp4aazXn7H9xcwGJQOQ-pF1fttwR7U5WaG4';
let sb=null;
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:8}}});}catch(e){sb=null;}
async function rpc(fn,args){if(!sb)throw new Error('offline');const r=await sb.rpc(fn,args||{});if(r.error)throw r.error;return r.data;}
const myId=(()=>{let id=null;try{id=sessionStorage.getItem('mecca_id');}catch(e){}if(!id){id=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('mecca_id',id);}catch(e){}}return id;})();
let token=store.get('tok',null),me=null,payOn=false;
function myName(){return me&&me.show_name?me.name:null;}
function setAcctBtn(){const b=$('#acctbtn');b.textContent=me?(me.name||'?').slice(0,1).toUpperCase():'👤';b.classList.toggle('in',!!me);}
function logoutLocal(){token=null;me=null;store.set('tok',null);setAcctBtn();retrack();}
async function loadMe(){if(!token||!sb){setAcctBtn();return;}try{const u=await rpc('mecca_me',{p_token:token});if(u){me=u;}else logoutLocal();}catch(e){}setAcctBtn();retrack();}
async function loadConfig(){if(!sb)return;try{const c=await rpc('mecca_public_config');payOn=!!(c&&c.payments);}catch(e){}}

/* ---------- location & prayer settings ---------- */
const PT=window.PT;
const devTZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){return'UTC';}})();
const cityName=c=>AR?c[0]:c[1];
function cityLoc(c){return{name:cityName(c),lat:c[3],lng:c[4],tz:c[5],city:c[2]};}
let loc=store.get('loc',null);
if(!loc||typeof loc.lat!=='number'){const c=window.CITIES.find(c=>c[5]===devTZ)||window.CITIES[0];loc=cityLoc(c);}
if(loc.city){const c=window.CITIES.find(c=>c[2]===loc.city);if(c)loc.name=cityName(c);}else if(loc.mine)loc.name=t('locMine');
let METHOD=store.get('method','Makkah');if(!PT.METHODS[METHOD])METHOD='Makkah';
let ASR=store.get('asr',1);
function nextPrayer(){try{return PT.next(loc,METHOD,ASR);}catch(e){return null;}}
const fmtT=d=>PT.fmt(d,loc.tz,LANG);

/* ---------- intro: photo hero, journey cards, next Hajj ---------- */
const HERO=['kaaba-hajj','haram-hajj','arafat-mount','mina','jamarat-stoning','kaaba-night'];
{const h=$('#hero');HERO.forEach((s,i)=>{const im=document.createElement('img');im.alt='';im.decoding='async';im.onerror=()=>im.remove();im.src=photoURL(s,innerWidth>900?1600:800);if(i===0)im.className='on';h.appendChild(im);});
 let hi=0;const credit=()=>{const P=window.PHOTOS[HERO[hi]];$('#heroCredit').innerHTML=`📷 <a href="${P.p}" target="_blank" rel="noopener">${esc(P.a)}</a> · ${esc(P.l)}`;};credit();
 setInterval(()=>{if($('#intro').classList.contains('hide'))return;const ims=h.querySelectorAll('img');ims[hi].classList.remove('on');hi=(hi+1)%ims.length;ims[hi].classList.add('on');credit();},7000);
 const d=PT.nextArafah&&PT.nextArafah(new Date());if(d){let s='';try{s=d.toLocaleDateString(LOCALE,{year:'numeric',month:'long',day:'numeric'});}catch(e){s=d.toDateString();}$('#nextHajj').textContent=t('nextHajj',{d:s});$('#nextHajj').title=t('nextHajjNote');}else $('#nextHajj').style.display='none';
 $('#jrow').innerHTML=STEPS.map((id,i)=>{const m=SM[id],x=ST[id];return`<button class="jcard" data-step="${id}">${m.photo?`<img loading="lazy" src="${photoURL(m.photo,800)}" alt="" onerror="this.remove()">`:''}<div class="ov"></div><span class="n">${nf(i+1)}</span><div class="tx"><small>${esc(x.d)}</small><b>${esc(x.t)}</b></div></button>`;}).join('');}

/* ---------- start: everything below needs the 3D engine ---------- */
if(typeof THREE==='undefined'){$('#loading').textContent=t('engineFail');
 document.querySelectorAll('[data-go],[data-step]').forEach(b=>b.onclick=()=>{});return;}

const renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<1.5&&!isTouch,powerPreference:'high-performance'});
const MAX_PR=Math.min(devicePixelRatio,isTouch?1:1.25);let PR=MAX_PR;
renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
$('#stage').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xcfe0ec);scene.fog=new THREE.FogExp2(0xdbe7ef,.0016);
const camera=new THREE.PerspectiveCamera(isTouch&&innerWidth<innerHeight?75:65,innerWidth/innerHeight,.1,1600);camera.rotation.order='YXZ';
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=isTouch&&innerWidth<innerHeight?75:65;camera.updateProjectionMatrix();renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);});

/* ---------- procedural textures ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
function toTex(c,srgb){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb!==false)t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;return t;}
function grain(g,w,h,amt,r){const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);}
const hsl=(h,s,l)=>`hsl(${h},${s}%,${l}%)`;
function star8(g,cx,cy,R){g.beginPath();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rr=k%2?R*.55:R;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}g.closePath();}
function tiles(base,line,seed,veins){const[c,g]=mkC(512,512),r=rng(seed);const n=4,s=128;for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=base(r);g.fillRect(i*s,j*s,s,s);
  if(veins)for(let k=0;k<4;k++){g.strokeStyle=`rgba(120,125,130,${.05+r()*.08})`;g.lineWidth=.6+r()*1.4;g.beginPath();g.moveTo(i*s+r()*s,j*s+r()*s);g.bezierCurveTo(i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s);g.stroke();}}
 g.strokeStyle=line;g.lineWidth=2;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,512);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(512,i*s);g.stroke();}grain(g,512,512,8,r);return toTex(c);}
function noiseTex(col,amt,seed,specks){const[c,g]=mkC(512,512),r=rng(seed);g.fillStyle=col;g.fillRect(0,0,512,512);for(let i=0;i<(specks||1500);i++){g.fillStyle=`rgba(${r()<.5?'0,0,0':'255,255,255'},${r()*.12})`;const s=1+r()*4;g.fillRect(r()*512,r()*512,s,s);}grain(g,512,512,amt,r);return toTex(c);}
function kiswaTexture(){const[c,g]=mkC(256,256);g.fillStyle='#0b0b0c';g.fillRect(0,0,256,256);g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=2;
 for(let i=-256;i<512;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i+256,256);g.stroke();g.beginPath();g.moveTo(i+256,0);g.lineTo(i,256);g.stroke();}return toTex(c);}
function bandTexture(){const[c,g]=mkC(512,64);g.fillStyle='#0f0c07';g.fillRect(0,0,512,64);const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#8a6526');gr.addColorStop(.5,'#e0bb62');gr.addColorStop(1,'#8a6526');g.fillStyle=gr;g.fillRect(0,3,512,5);g.fillRect(0,56,512,5);
 for(let x=32;x<512;x+=64){g.strokeStyle='#e2bd66';g.lineWidth=2.5;star8(g,x,32,18);g.stroke();g.fillStyle='rgba(226,189,102,.3)';g.fill();g.beginPath();g.arc(x,32,4,0,7);g.fillStyle='#e2bd66';g.fill();
  g.beginPath();g.moveTo(x+24,16);g.quadraticCurveTo(x+32,32,x+24,48);g.moveTo(x+40,16);g.quadraticCurveTo(x+32,32,x+40,48);g.stroke();}return toTex(c);}
function doorTexture(){const[c,g]=mkC(128,256);const gr=g.createLinearGradient(0,0,128,0);gr.addColorStop(0,'#8a6526');gr.addColorStop(.5,'#e8c770');gr.addColorStop(1,'#8a6526');g.fillStyle=gr;g.fillRect(0,0,128,256);
 g.strokeStyle='#6b4c18';g.lineWidth=3;g.strokeRect(6,6,116,244);g.beginPath();g.moveTo(64,6);g.lineTo(64,250);g.stroke();for(let y=36;y<240;y+=52)[34,94].forEach(x=>{star8(g,x,y,15);g.stroke();});return toTex(c);}
function facadeTexture(seed,tint){const[c,g]=mkC(256,256),r=rng(seed);g.fillStyle=tint;g.fillRect(0,0,256,256);for(let y=8;y<256;y+=32)for(let x=8;x<256;x+=32){g.fillStyle=`rgba(${40+r()*30},${60+r()*30},${80+r()*30},${.55+r()*.3})`;g.fillRect(x,y,18,20);}grain(g,256,256,10,r);return toTex(c);}
function clockTexture(){const[c,g]=mkC(512,512);g.fillStyle='#1a5f4d';g.fillRect(0,0,512,512);g.beginPath();g.arc(256,256,230,0,7);g.fillStyle='#f6f2e6';g.fill();g.lineWidth=14;g.strokeStyle='#d4a94e';g.stroke();
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;g.save();g.translate(256,256);g.rotate(a);g.fillStyle='#0f4d3e';g.fillRect(-7,-212,14,44);g.restore();}
 g.lineCap='round';g.strokeStyle='#0f4d3e';g.lineWidth=16;g.beginPath();g.moveTo(256,256);g.lineTo(256+Math.cos(-2.2)*120,256+Math.sin(-2.2)*120);g.stroke();g.lineWidth=10;g.beginPath();g.moveTo(256,256);g.lineTo(256+Math.cos(-.95)*180,256+Math.sin(-.95)*180);g.stroke();
 g.beginPath();g.arc(256,256,16,0,7);g.fillStyle='#d4a94e';g.fill();return toTex(c);}
function rugTexture(base,accent){const[c,g]=mkC(128,192);g.fillStyle=base;g.fillRect(0,0,128,192);g.strokeStyle=accent;g.lineWidth=6;g.strokeRect(6,6,116,180);g.lineWidth=3;g.beginPath();g.moveTo(24,176);g.lineTo(24,70);g.quadraticCurveTo(24,30,64,22);g.quadraticCurveTo(104,30,104,70);g.lineTo(104,176);g.stroke();return toTex(c);}
function glowTexture(){const[c,g]=mkC(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,240,210,.5)');gr.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return toTex(c);}
function skyTexture(stops,stars,seed){const[c,g]=mkC(1024,512),r=rng(seed||3);const gr=g.createLinearGradient(0,0,0,512);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,1024,512);
 if(stars)for(let i=0;i<1100;i++){const y=r()*240;g.fillStyle=`rgba(255,255,240,${(.25+r()*.75)*(1-y/250)})`;g.fillRect(r()*1024,y,r()<.06?2:1,r()<.06?2:1);}
 else for(let i=0;i<14;i++){const x=r()*1024,y=120+r()*110,w=80+r()*200;const cg=g.createRadialGradient(x,y,0,x,y,w);cg.addColorStop(0,'rgba(255,255,255,.35)');cg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=cg;g.fillRect(x-w,y-w,2*w,2*w);}return toTex(c);}
function labelTexture(text,sub,dark){const[c,g]=mkC(1024,256);g.fillStyle=dark?'rgba(11,107,82,.92)':'rgba(255,255,255,0)';if(dark){const r=36;g.beginPath();g.moveTo(r,0);g.arcTo(1024,0,1024,256,r);g.arcTo(1024,256,0,256,r);g.arcTo(0,256,0,0,r);g.arcTo(0,0,1024,0,r);g.fill();}
 g.direction=/[؀-ۿ]/.test(text)?'rtl':'ltr';g.textAlign='center';g.fillStyle=dark?'#fff':'#0b4d3c';g.font='700 '+(sub?96:112)+'px "Noto Kufi Arabic","Noto Sans SC",sans-serif';g.fillText(text,512,sub?120:160);
 if(sub){g.font='54px "Noto Naskh Arabic","Noto Sans SC",sans-serif';g.fillStyle=dark?'#e9f5f0':'#2c4a42';g.fillText(sub,512,205);}return toTex(c);}
function signTexture(text,bg,fg){const[c,g]=mkC(1024,384);g.fillStyle=bg;g.fillRect(0,0,1024,384);g.strokeStyle=fg;g.lineWidth=14;g.strokeRect(18,18,988,348);g.direction='rtl';g.textAlign='center';g.fillStyle=fg;g.font='700 130px "Noto Kufi Arabic",sans-serif';g.fillText(text,512,190);g.font='600 70px "Noto Sans SC","Noto Sans",sans-serif';g.direction='ltr';g.fillText(window.I18N.zh[text===window.I18N.ar.lblArafatB?'lblArafatB':'lblMina']||'',512,300);return toTex(c);}

const FAC=[0,1,2,3].map(i=>null);
const TX={
 marble:tiles(r=>hsl(38,6+r()*4,80+r()*7),'rgba(150,150,150,.55)',7,true),kiswa:kiswaTexture(),band:bandTexture(),door:doorTexture(),glow:glowTexture(),
 sand:noiseTex('#d8c4a0',22,11,2600),gravel:noiseTex('#8b8070',30,13,5000),asphalt:noiseTex('#b9b3a8',14,17,1800),rock:noiseTex('#8a7a68',40,19,4000),
 concrete:tiles(r=>hsl(35,6,78+r()*6),'rgba(120,120,120,.4)',23,false),lime:noiseTex('#e8e1d2',10,29,900),
 clock:clockTexture(),rugR:rugTexture('#8a1f28','#d9b45f'),rugG:rugTexture('#1f5a43','#d9b45f')};
TX.band.repeat.set(1/8,1);
const SKY={
 day:skyTexture([[0,'#3f7fc0'],[.3,'#7fb2dd'],[.48,'#cfe3f2'],[.52,'#e8eef0'],[1,'#cdbf9e']],false,5),
 dusk:skyTexture([[0,'#2d3c6b'],[.3,'#a26b7a'],[.46,'#f0a463'],[.52,'#f7c98a'],[1,'#5a4a3a']],false,8),
 night:skyTexture([[0,'#02040b'],[.35,'#0a1630'],[.5,'#1d3350'],[.56,'#0b1622'],[1,'#05080c']],true,9)};

/* ---------- materials ---------- */
const PH=o=>new THREE.MeshPhongMaterial(Object.assign({shininess:6,specular:0x111111},o));
const LB=o=>new THREE.MeshLambertMaterial(o);
const M={
 marble:PH({map:TX.marble,shininess:50,specular:0x444444}),marbleW:PH({color:0xf3f1ec,shininess:40,specular:0x333333}),
 kiswa:PH({map:TX.kiswa,shininess:12,specular:0x1a1a1a}),band:PH({map:TX.band,shininess:70,specular:0x8a6a30,emissive:0x1a1206}),door:PH({map:TX.door,shininess:80,specular:0x9a7a3a,emissive:0x1a1206}),
 gold:PH({color:0xb8913c,shininess:60,specular:0x7a5a20}),silver:PH({color:0xd8dcdf,shininess:90,specular:0x888888}),black:PH({color:0x151515,shininess:30}),
 lime:LB({map:TX.lime}),limeD:LB({map:TX.lime,side:THREE.DoubleSide}),stone:LB({color:0xd9cfbd}),stoneD:LB({color:0xd9cfbd,side:THREE.DoubleSide}),plaster:LB({color:0xf4f1ea}),
 sand:LB({map:TX.sand}),gravel:LB({map:TX.gravel}),asphalt:LB({map:TX.asphalt}),rock:LB({map:TX.rock}),concrete:LB({map:TX.concrete}),
 tent:LB({color:0xf7f7f4}),trunk:LB({color:0x6b5038}),leaf:LB({color:0x5f8f3e}),pillar:LB({color:0xf7f6f2}),jamrah:LB({color:0xc9c2b4}),
 green:new THREE.MeshBasicMaterial({color:0x37e08a}),greenDark:LB({color:0x1d6b52}),glass:PH({color:0x8fb4c6,shininess:90,specular:0xffffff}),
 clock:new THREE.MeshBasicMaterial({map:TX.clock}),rugR:LB({map:TX.rugR}),rugG:LB({map:TX.rugG}),yellow:LB({color:0xf2c230})};
TX.marble.repeat.set(1,1);
function facade(i){i=i%4;if(!FAC[i])FAC[i]=new THREE.MeshLambertMaterial({map:facadeTexture(40+i,['#e7dcc7','#ece4d3','#efe8da','#e3d8c4'][i])});return FAC[i];}
const glowMat=new THREE.SpriteMaterial({map:TX.glow,color:0xfff1d0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});

/* ---------- geometry helpers ---------- */
function worldUV(geo,w,h,d,s){const uv=geo.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/s,uv.getY(i)*dims[f][1]/s);}uv.needsUpdate=true;}
let R=null; // current build root (scene record)
function box(w,h,d,mat,x,y,z,o){o=o||{};const g=new THREE.BoxGeometry(w,h,d);if(mat.map&&o.uv!==false)worldUV(g,w,h,d,o.s||4);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);if(o.ry)m.rotation.y=o.ry;(o.parent||R.group).add(m);if(o.col)R.cols.push([x-w/2,x+w/2,z-d/2,z+d/2]);return m;}
function cyl(rt,rb,h,mat,x,y,z,seg,o){o=o||{};const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16,1,!!o.open,o.ts||0,o.tl||Math.PI*2),mat);m.position.set(x,y,z);(o.parent||R.group).add(m);if(o.col)R.circ.push([x,z,Math.max(rt,rb)+.1]);return m;}
function plane(w,d,mat,x,y,z,rep){const g=new THREE.PlaneGeometry(w,d);if(rep){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/rep,uv.getY(i)*d/rep);}const m=new THREE.Mesh(g,mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);R.group.add(m);return m;}
function label(text,sub,x,y,z,ry,w,dark){const m=new THREE.Mesh(new THREE.PlaneGeometry(w||6,(w||6)/4),new THREE.MeshBasicMaterial({map:labelTexture(text,sub,dark),transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry||0;m.userData.dyn=true;R.group.add(m);return m;}
function glowAt(x,y,z,s,col){const sp=new THREE.Sprite(glowMat.clone());if(col)sp.material.color.set(col);sp.scale.set(s,s,1);sp.position.set(x,y,z);R.group.add(sp);return sp;}
function mergeGeos(list){let nv=0,ni=0;list.forEach(g=>{nv+=g.attributes.position.count;ni+=g.index.count;});const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=new Uint32Array(ni);let vo=0,io=0;
 list.forEach(g=>{pos.set(g.attributes.position.array,vo*3);nor.set(g.attributes.normal.array,vo*3);uv.set(g.attributes.uv.array,vo*2);for(let i=0;i<g.index.count;i++)idx[io+i]=g.index.getX(i)+vo;vo+=g.attributes.position.count;io+=g.index.count;});
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();return geo;}
function mergeStatic(root){root.updateMatrixWorld(true);const groups=new Map(),remove=[];
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.dyn||Array.isArray(o.material))return;let p=o.parent;while(p&&p!==root){if(p.userData.dyn)return;p=p.parent;}
  const g=o.geometry;if(!g.index||!g.attributes.uv||!g.attributes.normal)return;const k=o.material.uuid;if(!groups.has(k))groups.set(k,{mat:o.material,items:[]});groups.get(k).items.push(o);remove.push(o);});
 const v=new THREE.Vector3(),nm=new THREE.Matrix3(),inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),mw=new THREE.Matrix4();
 groups.forEach(({mat,items})=>{let nv=0,ni=0;items.forEach(o=>{nv+=o.geometry.attributes.position.count;ni+=o.geometry.index.count;});
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
  items.forEach(o=>{const g=o.geometry,Pa=g.attributes.position,Na=g.attributes.normal,Ua=g.attributes.uv,Ia=g.index;mw.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(mw);
   for(let i=0;i<Pa.count;i++){const j=(vo+i)*3;v.fromBufferAttribute(Pa,i).applyMatrix4(mw);pos[j]=v.x;pos[j+1]=v.y;pos[j+2]=v.z;v.fromBufferAttribute(Na,i).applyMatrix3(nm).normalize();nor[j]=v.x;nor[j+1]=v.y;nor[j+2]=v.z;uv[(vo+i)*2]=Ua.getX(i);uv[(vo+i)*2+1]=Ua.getY(i);}
   for(let i=0;i<Ia.count;i++)idx[io+i]=Ia.getX(i)+vo;vo+=Pa.count;io+=Ia.count;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,mat);m.matrixAutoUpdate=false;root.add(m);});
 remove.forEach(o=>o.parent.remove(o));}
function jitter(geo,amt,seed){const p=geo.attributes.position,h=(x,y,z,k)=>{const v=Math.sin(Math.round(x*10)*12.9898+Math.round(y*10)*78.233+Math.round(z*10)*37.719+seed*7.13+k*19.1)*43758.5453;return v-Math.floor(v)-.5;};
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const top=geo.parameters&&geo.parameters.height?y>=geo.parameters.height/2-.01:false;if(top)continue;const base=geo.parameters&&geo.parameters.height?y<=-geo.parameters.height/2+.01:false;const k=base?.25:1;p.setXYZ(i,x+h(x,y,z,1)*amt*k,y+(base?0:h(x,y,z,2)*amt*.6),z+h(x,y,z,3)*amt*k);}geo.computeVertexNormals();return geo;}
function hill(rad,h,x,z,seed,mat){const g=jitter(new THREE.ConeGeometry(rad,h,20,6),rad*.18,seed);const m=new THREE.Mesh(g,mat||M.rock);m.position.set(x,h/2-1,z);R.group.add(m);return m;}

/* crowds of pilgrims (instanced) */
const FIG=(()=>{const a=new THREE.CylinderGeometry(.19,.25,1.42,8);a.translate(0,.71,0);const b=new THREE.SphereGeometry(.12,8,6);b.translate(0,1.56,0);return mergeGeos([a,b]);})();
const crowdMat=LB({color:0xffffff});
const CROWD_K=isTouch?.55:1;
const dummy=new THREE.Object3D(),tmpC=new THREE.Color();
function crowd(n,place,seed){n=Math.round(n*CROWD_K);const m=new THREE.InstancedMesh(FIG,crowdMat,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.userData.dyn=true;const r=rng(seed||1);
 for(let i=0;i<n;i++){const q=r();tmpC.set(q<.7?(r()<.5?0xf5f4ef:0xe9e6dc):q<.85?0x262626:[0xc9b9a4,0x7a8c99,0xe3d2b8,0x9a6f5a][Math.floor(r()*4)]);m.setColorAt(i,tmpC);dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(dummy,i,r);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
 dummy.scale.set(1,1,1);R.group.add(m);return m;}

/* ---------- scene registry ---------- */
const SC={};let cur=null;
function newScene(id,o){const g=new THREE.Group();g.visible=false;scene.add(g);const S=Object.assign({id,group:g,cols:[],circ:[],block:null,spots:[],places:{},update:null,zone:()=>t('sc'+id[0].toUpperCase()+id.slice(1)),sky:'day',sunI:.85,hemiI:.62,fog:0xd3e1ea,fogD:.0013,exp:.88,sunDir:[-.4,1,.3],bounds:600},o);SC[id]=S;R=S;return S;}
const BUILD={};
const yawLook=(fx,fz,tx,tz)=>Math.atan2(fx-tx,fz-tz);
const yawTo=(x,z)=>Math.atan2(x,z);

/* ===== المسجد الحرام ===== */
const KW=11,KD=12.5,KH=13.1,KB=.5,RI=44,RO=58,TAWAF_R=20.5;
const MASA={x0:60,x1:76,z0:-95,z1:95,safa:-88,marwa:88,greenA:-35,greenB:-15};
BUILD.haram=()=>{const S=newScene('haram',{sky:'day',fogD:.0011});
 plane(900,900,M.marble,0,0,0,4.8);
 // Kaaba
 box(KW+1.4,KB,KD+1.4,M.marbleW,0,KB/2,0,{uv:false});
 box(KW,KH,KD,M.kiswa,0,KB+KH/2,0,{s:4});S.cols.push([-KW/2-.9,KW/2+.9,-KD/2-.9,KD/2+.9]);
 box(KW+.1,1.0,KD+.1,M.band,0,KB+KH*.68,0,{s:1});
 box(KW+.06,.12,KD+.06,M.gold,0,KB+KH*.68-1.6,0,{uv:false});
 box(1.7,3.0,.14,M.door,KW/2-2.6,KB+2.2+1.5,KD/2+.07,{uv:false});box(2.1,.18,.3,M.gold,KW/2-2.6,KB+2.2,KD/2+.15,{uv:false});
 {const ring=new THREE.Mesh(new THREE.TorusGeometry(.32,.08,8,24),M.silver);ring.position.set(KW/2+.03,1.5,KD/2+.03);ring.rotation.y=Math.PI/4;R.group.add(ring);
  const st=new THREE.Mesh(new THREE.SphereGeometry(.26,12,8),M.black);st.position.set(KW/2-.05,1.5,KD/2-.05);R.group.add(st);}
 // Hijr Ismail (Hatim)
 {const cx=-KW/2,rx=8.5,rz=5.7,N=16;for(let k=0;k<N;k++){const a0=(100+k*160/N)*Math.PI/180,a1=(100+(k+1)*160/N)*Math.PI/180;const x0=cx+Math.cos(a0)*rx,z0=Math.sin(a0)*rz,x1=cx+Math.cos(a1)*rx,z1=Math.sin(a1)*rz;
   const len=Math.hypot(x1-x0,z1-z0)+.08,xm=(x0+x1)/2,zm=(z0+z1)/2;const m=box(.9,1.3,len,M.marbleW,xm,.65,zm,{uv:false});m.rotation.y=Math.atan2(x1-x0,z1-z0);S.circ.push([xm,zm,.8]);}}
 // Maqam Ibrahim
 box(1.6,.4,1.6,M.marbleW,2.0,.2,KD/2+11,{uv:false});cyl(.75,.75,2.0,M.gold,2.0,1.4,KD/2+11,16);{const d=new THREE.Mesh(new THREE.SphereGeometry(.75,16,8,0,Math.PI*2,0,Math.PI/2),M.gold);d.position.set(2.0,2.4,KD/2+11);R.group.add(d);}cyl(.05,.05,.6,M.gold,2.0,3.3,KD/2+11,6);S.circ.push([2.0,KD/2+11,1.2]);
 // prayer rugs between mataf and galleries
 {const geo=new THREE.PlaneGeometry(.7,1.1);[37.5,39,40.5,42].forEach((Rr,ri)=>{const n=Math.floor(Math.PI*2*Rr/.82);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const m=new THREE.Mesh(geo,ri%2?M.rugG:M.rugR);m.rotation.order='YXZ';m.rotation.set(-Math.PI/2,Math.PI/2-a,0);m.position.set(Rr*Math.cos(a),.015,Rr*Math.sin(a));R.group.add(m);}});}
 // circular galleries, three storeys
 const NC=48;for(let lv=0;lv<3;lv++){const y0=lv*8;
  for(let i=0;i<NC;i++){const a=i/NC*Math.PI*2,x=RI*Math.sin(a),z=RI*Math.cos(a);cyl(.55,.6,6.6,M.stone,x,y0+3.3,z,12);if(lv===0)S.circ.push([x,z,.75]);
   const arc=new THREE.Mesh(new THREE.TorusGeometry(RI*Math.PI/NC-.2,.28,6,14,Math.PI),M.stone);const am=a+Math.PI/NC;arc.position.set(RI*Math.sin(am),y0+5.2,RI*Math.cos(am));arc.rotation.y=am;R.group.add(arc);}
  cyl(RI+.4,RI+.4,1.4,M.limeD,0,y0+7.3,0,96,{open:true});
  const slab=new THREE.Mesh(new THREE.RingGeometry(RI-.2,RO+.3,96,1),M.stoneD);slab.rotation.x=-Math.PI/2;slab.position.y=y0+8;R.group.add(slab);}
 cyl(RI+.2,RI+.2,1.2,M.limeD,0,24.6,0,96,{open:true});
 cyl(RO,RO,25,M.limeD,0,12.5,0,96,{open:true,ts:Math.PI/2+.26,tl:Math.PI*2-.52});
 // small domes on the roof
 {const dg=new THREE.SphereGeometry(2.2,14,8,0,Math.PI*2,0,Math.PI/2);for(let i=0;i<NC;i+=2){const a=(i+.5)/NC*Math.PI*2,rr=(RI+RO)/2;const d=new THREE.Mesh(dg,M.plaster);d.position.set(rr*Math.sin(a),24,rr*Math.cos(a));R.group.add(d);}}
 // minarets
 function minaret(x,z,h){box(5.2,18,5.2,M.stone,x,9,z,{uv:false});cyl(2.0,2.4,h-18,M.plaster,x,18+(h-18)/2,z,16);[.42,.62,.82].forEach(f=>{cyl(3.0,2.6,1.2,M.stone,x,h*f,z,16);cyl(2.1,2.1,3,M.plaster,x,h*f+2,z,16);});
  cyl(0,1.9,9,M.greenDark,x,h+4.5,z,16);cyl(.12,.12,4,M.gold,x,h+11,z,6);const cr=new THREE.Mesh(new THREE.TorusGeometry(.9,.18,6,16,Math.PI*1.4),M.gold);cr.position.set(x,h+14,z);cr.rotation.z=Math.PI*.8;R.group.add(cr);}
 [Math.PI*.12,Math.PI*.38,Math.PI*.75,Math.PI*1.0,Math.PI*1.25,Math.PI*1.62,Math.PI*1.88].forEach(a=>minaret(63*Math.sin(a),63*Math.cos(a),88));
 // the clock-tower complex to the south and surrounding hotels
 box(150,48,70,M.stone,-20,24,-200,{uv:false});[[-80,140],[40,170],[-60,210],[20,230]].forEach(([x,h],i)=>{box(30,h,30,facade(i),x,h/2,-205,{s:12});});
 box(36,300,36,facade(1),-20,150,-200,{s:14});box(46,48,46,M.stone,-20,324,-200,{uv:false});
 [[0,0,23.2,0],[0,0,-23.2,Math.PI],[23.2,0,0,Math.PI/2],[-23.2,0,0,-Math.PI/2]].forEach(([dx,_,dz,ry])=>{const f=new THREE.Mesh(new THREE.PlaneGeometry(40,40),M.clock);f.position.set(-20+dx,324,-200+dz);f.rotation.y=ry;f.userData.dyn=true;R.group.add(f);});
 cyl(16,22,26,M.stone,-20,361,-200,8);cyl(3,12,40,M.greenDark,-20,394,-200,8);cyl(.8,.8,30,M.gold,-20,428,-200,8);{const cr=new THREE.Mesh(new THREE.TorusGeometry(5,1,8,24,Math.PI*1.4),M.gold);cr.position.set(-20,448,-200);cr.rotation.z=Math.PI*.8;R.group.add(cr);}
 {const r=rng(77);for(let i=0;i<34;i++){const a=r()*Math.PI*2,d=120+r()*170;const x=d*Math.sin(a),z=d*Math.cos(a);if(x>50&&Math.abs(z)<130)continue;if(z<-140&&Math.abs(x+20)<110)continue;const h=30+r()*90,w=20+r()*30;box(w,h,w*(.7+r()*.6),facade(i),x,h/2,z,{s:10});}}
 // the Mas'a (Safa–Marwa gallery)
 {const {x0,x1,z0,z1}=MASA,W=x1-x0,cx=(x0+x1)/2,H=12;
  box(.6,H,(-12)-z0,M.lime,x0,H/2,(z0-12)/2,{col:true});box(.6,H,z1-12,M.lime,x0,H/2,(z1+12)/2,{col:true});box(.6,H,z1-z0,M.lime,x1,H/2,0,{col:true});
  box(W,H,.6,M.lime,cx,H/2,z0-2,{col:true});box(W,H,.6,M.lime,cx,H/2,z1+2,{col:true});box(W+1,.6,z1-z0+4,M.plaster,cx,H,0,{uv:false});
  box(4,.6,24,M.plaster,58,H,0,{uv:false});
  for(let z=z0+8;z<z1;z+=10){[65,71].forEach(x=>{cyl(.6,.6,H,M.stone,x,H/2,z,12,{col:true});});}
  for(let z=MASA.greenA;z<=MASA.greenB;z+=2.5)box(W-1,.12,.35,M.green,cx,H-.4,z,{uv:false});[65,71].forEach(x=>{[MASA.greenA,MASA.greenB].forEach(z=>cyl(.66,.66,1.2,M.green,x,4,z,12));});
  [[MASA.safa,'lblSafa'],[MASA.marwa,'lblMarwa']].forEach(([z,k])=>{const rk=new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(4,1),.8,z>0?3:4),M.rock);rk.scale.set(1.3,.5,1);rk.position.set(cx,.6,z+(z>0?3:-3));R.group.add(rk);S.cols.push([cx-5,cx+5,z+(z>0?0:-6),z+(z>0?6:0)]);
   const dm=new THREE.Mesh(new THREE.SphereGeometry(7,20,10,0,Math.PI*2,0,Math.PI/2),M.plaster);dm.position.set(cx,H,z+(z>0?2:-2));R.group.add(dm);label(t(k),'',cx,8,z+(z>0?-4:4),z>0?Math.PI:0,8,true);});
  label(t('lblGreen'),'',cx,9.6,(MASA.greenA+MASA.greenB)/2,0,9,true);
 }
 // lights
 [[-30,-30],[30,-30],[-30,30],[30,30]].forEach(([x,z])=>{const l=new THREE.PointLight(0xfff4de,.45,90,1.2);l.position.set(x,30,z);R.group.add(l);});
 // crowds: tawaf (anticlockwise) and sa'y
 const NT=1100,tw=[];S.tawaf=crowd(NT,(d,i,r)=>{let rr,a;do{rr=10+Math.pow(r(),.8)*26;a=r()*Math.PI*2;}while((rr<16&&Math.cos(a)<-.3)||(Math.hypot(rr*Math.cos(a)-2,-rr*Math.sin(a)-17.25)<2));tw.push({r:rr,a,w:(.55+r()*.5)/rr});d.position.set(rr*Math.cos(a),0,-rr*Math.sin(a));d.rotation.set(0,a,0);},31);
 const NS=180,sw=[];S.sai=crowd(NS,(d,i,r)=>{const go=r()<.5;const o={x:go?66+r()*2:69+r()*3,z:MASA.safa+6+r()*(MASA.marwa-MASA.safa-12),v:(go?1:-1)*(1.1+r()*.6)};sw.push(o);d.position.set(o.x,0,o.z);d.rotation.set(0,go?Math.PI:0,0);},37);
 S.update=(dt)=>{for(let i=0;i<S.tawaf.count;i++){const o=tw[i];o.a+=o.w*dt;dummy.position.set(o.r*Math.cos(o.a),0,-o.r*Math.sin(o.a));dummy.rotation.set(0,o.a,0);dummy.updateMatrix();S.tawaf.setMatrixAt(i,dummy.matrix);}S.tawaf.instanceMatrix.needsUpdate=true;
  for(let i=0;i<S.sai.count;i++){const o=sw[i];o.z+=o.v*dt;if(o.z>MASA.marwa-5){o.v=-Math.abs(o.v);o.x=69+Math.random()*3;}if(o.z<MASA.safa+5){o.v=Math.abs(o.v);o.x=66+Math.random()*2;}const g=o.z>MASA.greenA&&o.z<MASA.greenB?1.7:1;o.z+=o.v*dt*(g-1);dummy.position.set(o.x,0,o.z);dummy.rotation.set(0,o.v>0?Math.PI:0,0);dummy.updateMatrix();S.sai.setMatrixAt(i,dummy.matrix);}S.sai.instanceMatrix.needsUpdate=true;};
 S.block=(x,z)=>{const r=Math.hypot(x,z),inGap=x>0&&Math.abs(z)<12;if(r>RO-.8&&!inGap&&x<MASA.x0-.3)return true;if(x>MASA.x1-.5)return true;return false;};
 S.zone=(x,z)=>{const r=Math.hypot(x,z);if(x>MASA.x0)return z<MASA.safa+12?t('zSafa'):z>MASA.marwa-12?t('zMarwa'):t('zMasa');if(r<36)return t('zMataf');if(r<RI)return t('zSahn');if(r<RO)return t('zRiwaq');return t('zHaram');};
 S.spots=[{test:(x,z)=>Math.hypot(x,z)<13,label:'aKaaba',act:()=>info('kaaba')},{test:(x,z)=>{const r=Math.hypot(x,z);return r>36.5&&r<43.3;},label:'aPray',act:()=>prayRow()},{test:(x,z)=>x>MASA.x0+.5,label:'aMasa',act:()=>info('masa')}];
 S.places={spawn:{x:0,z:34,yaw:0},gate:{x:0,z:50,yaw:0},kaaba:{x:3,z:27,yaw:yawTo(3,27)},stone:{x:TAWAF_R*Math.cos(-Math.PI/4),z:-TAWAF_R*Math.sin(-Math.PI/4),yaw:yawTo(14.5,14.5)},maqam:{x:2.5,z:21.5,yaw:yawTo(2.5,21.5)},rows:{x:-26,z:30,yaw:yawTo(-26,30)},safa:{x:67,z:MASA.safa+6,yaw:Math.PI},marwa:{x:69,z:MASA.marwa-6,yaw:0},masa:{x:68,z:MASA.marwa-8,yaw:0}};
 S.menu=['gate','kaaba','stone','maqam','rows','safa','marwa'];
 mergeStatic(S.group);return S;};

/* ===== منى ===== */
const TENT=12,TN=14;const isRoad=(i,j)=>i%5===0||j%5===0;
BUILD.mina=()=>{const S=newScene('mina',{sky:'day',fogD:.0014,bounds:330});
 plane(1400,1400,M.asphalt,0,0,0,8);
 const tg=(()=>{const a=new THREE.BoxGeometry(9,3,9);a.translate(0,1.5,0);const b=new THREE.ConeGeometry(6.36,3.2,4,1);b.rotateY(Math.PI/4);b.translate(0,4.6,0);const c=new THREE.CylinderGeometry(.08,.08,1.2,6);c.translate(0,6.6,0);return mergeGeos([a,b,c]);})();
 const cells=[];for(let i=-TN;i<=TN;i++)for(let j=-TN;j<=TN;j++)if(!isRoad(i,j))cells.push([i,j]);
 const tm=new THREE.InstancedMesh(tg,M.tent,cells.length);cells.forEach(([i,j],k)=>{dummy.position.set(i*TENT,0,j*TENT);dummy.rotation.set(0,0,0);dummy.updateMatrix();tm.setMatrixAt(k,dummy.matrix);});tm.userData.dyn=true;R.group.add(tm);
 for(let i=-TN;i<=TN;i+=5)for(let j=-TN;j<=TN;j+=2){const x=i*TENT+5.6,z=j*TENT;cyl(.12,.16,9,M.silver,x,4.5,z,6);box(1.2,.2,.4,M.silver,x-.4,9,z,{uv:false});}
 {const r=rng(5);for(let k=0;k<22;k++){const a=k/22*Math.PI*2+r()*.2,d=300+r()*120;hill(70+r()*80,50+r()*90,d*Math.sin(a),d*Math.cos(a),k+3);}}
 box(240,38,70,M.concrete,0,19,-330,{s:8});label(t('scJamarat'),'',0,48,-294,0,60,true);
 {const sg=new THREE.Mesh(new THREE.PlaneGeometry(14,5.25),new THREE.MeshBasicMaterial({map:signTexture(window.I18N.ar.lblMinaSign,'#0b6b52','#ffffff'),side:THREE.DoubleSide}));sg.position.set(0,8,-30);sg.userData.dyn=true;R.group.add(sg);cyl(.25,.25,8,M.silver,-6,4,-30,8);cyl(.25,.25,8,M.silver,6,4,-30,8);}
 const walk=[];S.walk=crowd(260,(d,i,r)=>{const alongX=r()<.5,lane=(Math.floor(r()*7)-3)*5*TENT+(r()-.5)*5;const o={alongX,lane,p:(r()-.5)*2*TN*TENT,v:(r()<.5?-1:1)*(1+r()*.6)};walk.push(o);if(alongX)d.position.set(o.p,0,lane);else d.position.set(lane,0,o.p);},41);
 S.update=dt=>{const L=TN*TENT;for(let i=0;i<S.walk.count;i++){const o=walk[i];o.p+=o.v*dt;if(o.p>L)o.p=-L;if(o.p<-L)o.p=L;if(o.alongX){dummy.position.set(o.p,0,o.lane);dummy.rotation.set(0,o.v>0?-Math.PI/2:Math.PI/2,0);}else{dummy.position.set(o.lane,0,o.p);dummy.rotation.set(0,o.v>0?Math.PI:0,0);}dummy.updateMatrix();S.walk.setMatrixAt(i,dummy.matrix);}S.walk.instanceMatrix.needsUpdate=true;};
 S.block=(x,z)=>{const i=Math.round(x/TENT),j=Math.round(z/TENT);if(Math.abs(i)>TN||Math.abs(j)>TN)return Math.hypot(x,z)>320;if(isRoad(i,j))return false;return Math.abs(x-i*TENT)<5&&Math.abs(z-j*TENT)<5;};
 S.zone=(x,z)=>{const i=Math.round(x/TENT),j=Math.round(z/TENT);return isRoad(i,j)?t('zMinaRoad'):t('zMina');};
 S.spots=[{test:()=>true,label:'aMina',act:()=>info('mina')}];
 S.places={spawn:{x:0,z:60,yaw:0}};S.menu=['spawn'];
 mergeStatic(S.group);return S;};

/* ===== عرفات ===== */
const HILL={x:0,z:-210,r:72,h:62};
BUILD.arafat=()=>{const S=newScene('arafat',{sky:'day',fogD:.0011,fog:0xe9dfc9,bounds:700,sunDir:[-.5,1,.2]});
 plane(1800,1800,M.sand,0,0,0,12);
 hill(HILL.r,HILL.h,HILL.x,HILL.z,61);hill(40,24,HILL.x+60,HILL.z-30,62);hill(36,20,HILL.x-58,HILL.z-24,63);
 box(2.4,9,2.4,M.pillar,HILL.x,HILL.h-1+4.5,HILL.z,{uv:false});
 for(let k=0;k<26;k++){const f=k/26;box(6,.5,2.4,M.stone,HILL.x,f*HILL.h*.92,HILL.z+HILL.r*(1-f)-1,{uv:false});}
 {const r=rng(71),n=Math.round(420*CROWD_K),pts=[];for(let i=0;i<n;i++){let x,z;do{x=(r()-.5)*1100;z=(r()-.5)*1100;}while(Math.hypot(x-HILL.x,z-HILL.z)<HILL.r+15||Math.hypot(x,z+40)<30);pts.push([x,z,.8+r()*.5]);}
  const tg=new THREE.CylinderGeometry(.25,.35,3.2,6);tg.translate(0,1.6,0);const cg=new THREE.SphereGeometry(2.6,8,6);cg.translate(0,4.6,0);
  const T=new THREE.InstancedMesh(tg,M.trunk,n),C=new THREE.InstancedMesh(cg,M.leaf,n);pts.forEach(([x,z,s],i)=>{dummy.position.set(x,0,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(s);dummy.updateMatrix();T.setMatrixAt(i,dummy.matrix);C.setMatrixAt(i,dummy.matrix);});dummy.scale.setScalar(1);T.userData.dyn=C.userData.dyn=true;R.group.add(T);R.group.add(C);}
 // Masjid Namirah
 box(180,22,120,M.stone,-360,11,160,{uv:false});[[-450,100],[-450,220],[-270,100],[-270,220],[-360,95],[-360,225]].forEach(([x,z])=>{cyl(2,2.4,60,M.plaster,x,30,z,12);cyl(0,2,8,M.greenDark,x,64,z,12);});
 label(t('lblNamirah'),'',-268,30,160,Math.PI/2,40,true);
 [[0,300],[220,120],[-180,-60]].forEach(([x,z],i)=>{const sg=new THREE.Mesh(new THREE.PlaneGeometry(16,6),new THREE.MeshBasicMaterial({map:signTexture(window.I18N.ar.lblArafatB,'#f2c230','#1d1d1d'),side:THREE.DoubleSide}));sg.position.set(x,9,z);sg.rotation.y=yawTo(x,z)+Math.PI;sg.userData.dyn=true;R.group.add(sg);cyl(.3,.3,9,M.silver,x-6,4.5,z,8);cyl(.3,.3,9,M.silver,x+6,4.5,z,8);});
 S.stand=crowd(1700,(d,i,r)=>{let x,z;do{const a=r()*Math.PI*2,dd=HILL.r+4+Math.pow(r(),.7)*260;x=HILL.x+dd*Math.sin(a);z=HILL.z+dd*Math.cos(a);}while(Math.hypot(x-30,z+80)<6);d.position.set(x,0,z);d.rotation.set(0,yawLook(x,z,HILL.x,HILL.z)+Math.PI+(r()-.5)*1.2,0);},73);
 S.block=(x,z)=>Math.hypot(x-HILL.x,z-HILL.z)<HILL.r-6||Math.hypot(x+360,z-160)<100;
 S.zone=(x,z)=>Math.hypot(x-HILL.x,z-HILL.z)<HILL.r+40?t('zRahmah'):Math.hypot(x+360,z-160)<160?t('zNamirah'):t('zArafat');
 S.spots=[{test:(x,z)=>Math.hypot(x-HILL.x,z-HILL.z)<HILL.r+30,label:'aRahmah',act:()=>info('rahmah')},{test:(x,z)=>Math.hypot(x+360,z-160)<150,label:'aNamirah',act:()=>info('namirah')},{test:()=>true,label:'aArafat',act:()=>info('arafat')}];
 S.places={spawn:{x:30,z:-80,yaw:yawLook(30,-80,HILL.x,HILL.z)}};S.menu=['spawn'];
 mergeStatic(S.group);return S;};

/* ===== مزدلفة ===== */
BUILD.muzdalifah=()=>{const S=newScene('muzdalifah',{sky:'night',sunI:.06,hemiI:.32,fog:0x0e1724,fogD:.0035,exp:1.2,bounds:500});
 plane(1400,1400,M.gravel,0,0,0,6);
 {const r=rng(83);for(let k=0;k<26;k++){const a=k/26*Math.PI*2,d=60+r()*260,x=d*Math.sin(a),z=d*Math.cos(a);cyl(.4,.6,28,M.silver,x,14,z,8);box(4,1.5,1,M.silver,x,28,z,{uv:false});glowAt(x,27.5,z,26,0xfff3d6);}}
 [[-60,-60],[60,-60],[0,80],[0,-180]].forEach(([x,z])=>{const l=new THREE.PointLight(0xffefd2,.9,140,1.3);l.position.set(x,26,z);R.group.add(l);});
 box(120,18,60,M.stone,0,9,-260,{uv:false});{const d=new THREE.Mesh(new THREE.SphereGeometry(14,20,10,0,Math.PI*2,0,Math.PI/2),M.plaster);d.position.set(0,18,-260);R.group.add(d);}[[-70,-232],[70,-232]].forEach(([x,z])=>{cyl(2,2.4,70,M.plaster,x,35,z,12);cyl(0,2,8,M.greenDark,x,74,z,12);glowAt(x,60,z,18,0xd8ffe8);});
 label(t('lblMashar'),'',0,26,-228,0,40,true);glowAt(0,10,-228,60,0xfff0d0);
 {const r=rng(88);for(let k=0;k<16;k++){const a=r()*Math.PI*2,d=420+r()*150;hill(60+r()*60,40+r()*60,d*Math.sin(a),d*Math.cos(a),k+90);}}
 S.lie=crowd(1500,(d,i,r)=>{let x,z;do{x=(r()-.5)*700;z=(r()-.5)*600;}while(Math.hypot(x,z-40)<8||z<-225);const lying=r()<.6;d.position.set(x,lying?.2:0,z);d.rotation.set(lying?-Math.PI/2:0,r()*Math.PI*2,0);if(!lying)d.scale.set(1,.62,1);},87);dummy.scale.setScalar(1);
 S.block=(x,z)=>z<-226&&Math.abs(x)<64&&z>-292;
 S.zone=(x,z)=>z<-180?t('zMashar'):t('zMuzd');
 S.spots=[{test:()=>true,label:'aMuzd',act:()=>info('muzd')}];
 S.places={spawn:{x:0,z:40,yaw:0}};S.menu=['spawn'];
 mergeStatic(S.group);return S;};

/* ===== منشأة الجمرات ===== */
const JAM=[{k:'sughra',x:-110,lbl:'lblSughra',z:'zSughra'},{k:'wusta',x:-20,lbl:'lblWusta',z:'zWusta'},{k:'aqabah',x:110,lbl:'lblAqabah',z:'zAqabah'}];
BUILD.jamarat=()=>{const S=newScene('jamarat',{sky:'day',fogD:.0016,bounds:400});
 plane(1000,500,M.concrete,0,0,0,6);
 JAM.forEach(j=>{box(26,46,2.4,M.jamrah,j.x,23,0,{uv:false});[-1,1].forEach(s=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,46,12),M.jamrah);c.position.set(j.x+s*13,23,0);R.group.add(c);});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.06,6,40),M.stone);ring.scale.set(16,4.6,14);ring.rotation.x=Math.PI/2;ring.position.set(j.x,.9,0);R.group.add(ring);
  const basin=new THREE.Mesh(new THREE.CircleGeometry(1,40),M.gravel);basin.scale.set(16,4.6,1);basin.rotation.x=-Math.PI/2;basin.position.set(j.x,.03,0);R.group.add(basin);
  label(t(j.lbl),'',j.x,10.4,1.4,0,11,true);label(t(j.lbl),'',j.x,10.4,-1.4,Math.PI,11,true);});
 const gaps=JAM.map(j=>[j.x-19,j.x+19]);[12,24,36].forEach(y=>{let x=-200;gaps.concat([[230,230]]).forEach(([a,b])=>{if(a>x)box(a-x,1.2,70,M.concrete,(x+a)/2,y,0,{s:8});x=b;});});
 for(let x=-190;x<=220;x+=20){if(gaps.some(([a,b])=>x>a-2&&x<b+2))continue;[-32,32].forEach(z=>cyl(1,1,36,M.concrete,x,18,z,10,{col:true}));}
 box(420,4,.6,M.concrete,10,2,-36,{col:true});box(420,4,.6,M.concrete,10,2,36,{col:true});
 [[-60],[50],[170]].forEach(([x])=>{const l=new THREE.PointLight(0xfff4e0,.6,70,1.4);l.position.set(x,10,0);R.group.add(l);});
 const wk=[];S.walk=crowd(520,(d,i,r)=>{const o={x:-200+r()*420,z:(r()-.5)*58,v:.8+r()*.6};wk.push(o);d.position.set(o.x,0,o.z);d.rotation.set(0,-Math.PI/2,0);},93);
 S.update=dt=>{for(let i=0;i<S.walk.count;i++){const o=wk[i];let v=o.v;for(const j of JAM){const dx=o.x-j.x;if(Math.abs(dx)<20)v*=.35;}o.x+=v*dt;if(o.x>225)o.x=-200;let zz=o.z;for(const j of JAM){const e=((o.x-j.x)/17)**2+(o.z/5.4)**2;if(e<1)zz=Math.sign(o.z||1)*5.4*Math.sqrt(Math.max(0,1-((o.x-j.x)/17)**2));}dummy.position.set(o.x,0,zz);dummy.rotation.set(0,-Math.PI/2,0);dummy.updateMatrix();S.walk.setMatrixAt(i,dummy.matrix);}S.walk.instanceMatrix.needsUpdate=true;};
 S.block=(x,z)=>{for(const j of JAM){if(((x-j.x)/16.5)**2+(z/5)**2<1)return true;}return x<-205||x>232;};
 S.zone=(x,z)=>{for(const j of JAM)if(Math.abs(x-j.x)<26)return t(j.z);return t('zJamarat');};
 S.spots=JAM.map(j=>({test:(x,z)=>Math.abs(x-j.x)<21&&Math.abs(z)<11,label:'aStone',act:()=>openStoning(j.k,null)})).concat([{test:()=>true,label:'aJamarat',act:()=>info('jamarat')}]);
 S.places={spawn:{x:-170,z:0,yaw:-Math.PI/2},sughra:{x:-110,z:16,yaw:0},wusta:{x:-20,z:16,yaw:0},aqabah:{x:110,z:16,yaw:0}};S.menu=['spawn','sughra','wusta','aqabah'];
 mergeStatic(S.group);return S;};

/* ---------- global lights & sky ---------- */
const hemi=new THREE.HemisphereLight(0xe6f0ff,0xa8946e,.62);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dc,1.0);scene.add(sun);
const sky=new THREE.Mesh(new THREE.SphereGeometry(1400,32,16),new THREE.MeshBasicMaterial({map:SKY.day,side:THREE.BackSide,fog:false,depthWrite:false}));scene.add(sky);
const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xfff3d0,fog:false,depthWrite:false,transparent:true,blending:THREE.AdditiveBlending}));sunSprite.scale.set(220,220,1);scene.add(sunSprite);
let tint={sky:new THREE.Color(1,1,1),sun:new THREE.Color(1,.95,.86)};
function applySky(S){sky.material.map=SKY[S.sky];sky.material.color.setRGB(1,1,1);sky.material.needsUpdate=true;hemi.intensity=S.hemiI;sun.intensity=S.sunI;sun.color.setRGB(1,.95,.86);
 hemi.color.set(S.sky==='night'?0x6d86b5:0xe6f0ff);hemi.groundColor.set(S.sky==='night'?0x2a2620:0xa8946e);
 sun.position.set(S.sunDir[0]*100,S.sunDir[1]*100,S.sunDir[2]*100);scene.fog.color.set(S.fog);scene.fog.density=S.fogD;scene.background.set(S.fog);renderer.toneMappingExposure=S.exp;
 sunSprite.visible=S.sky!=='night';sunSprite.position.set(S.sunDir[0]*1100,S.sunDir[1]*700,S.sunDir[2]*1100);}
/* time of day for time-lapses: k 0 = noon, .8 = sunset, 1 = dusk */
function setDayPhase(k){const c=new THREE.Color();const sk=sky.material.color;
 if(k<.7){sk.setRGB(1,1-k*.25,1-k*.4);}else{const f=(k-.7)/.3;sk.setRGB(1-.45*f,.82-.42*f,.72-.25*f);}
 const el=Math.max(.02,1-k);sun.position.set(-60,el*100,30);sun.intensity=.2+el*.85;sun.color.setRGB(1,.75+el*.22,.55+el*.35);hemi.intensity=.35+el*.5;sunSprite.position.set(-900,el*600+10,450);sunSprite.material.color.setRGB(1,.7+el*.25,.5+el*.4);
 scene.fog.color.copy(c.setRGB(.86,.78-k*.2,.66-k*.25));scene.background.copy(scene.fog.color);}
function setNightPhase(k){/* Mina: 0 day → .5 night → 1 morning */const n=Math.sin(Math.PI*Math.min(1,Math.max(0,k)));sky.material.color.setRGB(1-.8*n,1-.78*n,1-.6*n);sun.intensity=1-n*.95;hemi.intensity=.85-.55*n;sunSprite.visible=n<.6;scene.fog.color.setRGB(.86-.75*n,.9-.78*n,.94-.75*n);scene.background.copy(scene.fog.color);}

/* ---------- other visitors (realtime presence) ---------- */
const ghosts=new Map();const ghostRobe=new THREE.CylinderGeometry(.19,.27,1.42,12),ghostHead=new THREE.SphereGeometry(.13,12,10);
function nameSprite(text){const[c,g]=mkC(256,64);g.font='600 30px "Noto Naskh Arabic","Noto Sans SC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(11,107,82,.85)';g.fillRect(20,12,216,44);g.fillStyle='#fff';g.fillText(text.slice(0,16),128,35);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:toTex(c),transparent:true,depthWrite:false}));sp.scale.set(1.0,.25,1);return sp;}
function makeGhost(){const g=new THREE.Group();const mat=LB({color:0xffffff,emissive:0x203a33});const robe=new THREE.Mesh(ghostRobe,mat);robe.position.y=.71;g.add(robe);const head=new THREE.Mesh(ghostHead,mat);head.position.y=1.56;g.add(head);
 const mk=new THREE.Mesh(new THREE.ConeGeometry(.12,.25,8),new THREE.MeshBasicMaterial({color:0x10896a}));mk.position.y=2.0;mk.rotation.x=Math.PI;g.add(mk);g.visible=false;scene.add(g);return{g,mat,robe,head,x:0,z:0,yaw:0,tx:0,tz:0,tyaw:0,s:'walk',sc:'',seen:0,fresh:true,n:null,ns:null};}
function setGhostName(o,n){n=n?String(n).slice(0,24):null;if(o.n===n)return;o.n=n;if(o.ns){o.g.remove(o.ns);o.ns.material.map.dispose();o.ns.material.dispose();o.ns=null;}if(n){o.ns=nameSprite(n);o.ns.position.y=2.35;o.g.add(o.ns);}}
function removeGhost(id){const o=ghosts.get(id);if(!o)return;setGhostName(o,null);scene.remove(o.g);o.mat.dispose();ghosts.delete(id);}
let onlineN=1;
function myState(){return P.mode==='locked'?'sit':'walk';}
const net={ch:null,ready:false,last:{x:0,z:0,y:0,s:'',t:0,sc:''},send(ev,p){if(this.ch&&this.ready){try{this.ch.send({type:'broadcast',event:ev,payload:Object.assign({id:myId},p||{})});}catch(e){}}}};
function retrack(){if(net.ch&&net.ready&&!document.hidden){try{net.ch.track({n:myName()});}catch(e){}net.last.t=0;}}
function onPos(p){if(!p||p.id===myId)return;let o=ghosts.get(p.id);if(!o){if(ghosts.size>=40)return;o=makeGhost();ghosts.set(p.id,o);}
 o.tx=+p.x||0;o.tz=+p.z||0;o.tyaw=+p.y||0;o.s=p.s||'walk';o.sc=p.sc||'';o.seen=performance.now();if(o.fresh){o.x=o.tx;o.z=o.tz;o.yaw=o.tyaw;o.fresh=false;}setGhostName(o,p.n);o.robe.scale.y=o.s==='sit'?.6:1;o.robe.position.y=.71*o.robe.scale.y;o.head.position.y=o.s==='sit'?.98:1.56;}
function updateOnline(){const el=$('#online');if(!net.ready){el.classList.remove('show');return;}el.classList.add('show');el.querySelector('span').textContent=t('onlineN',{n:nf(onlineN)});
 if(!$('#intro').classList.contains('hide'))$('#loading').textContent=onlineN>1?t('introOnline',{n:nf(onlineN)}):t('introQuiet');}
let todayAll=0;const dhikrListeners=new Set();
function onDhikr(n){n=Math.max(0,Math.min(300,n|0));if(!n)return;todayAll+=n;dhikrListeners.forEach(f=>f());}
function connect(){if(!sb)return;try{const ch=sb.channel('mecca-main',{config:{presence:{key:myId},broadcast:{self:false}}});net.ch=ch;
 ch.on('presence',{event:'sync'},()=>{const st=ch.presenceState();onlineN=Math.max(1,Object.keys(st).length);ghosts.forEach((o,id)=>{if(!st[id])removeGhost(id);});updateOnline();});
 ch.on('presence',{event:'leave'},({key})=>removeGhost(key));ch.on('broadcast',{event:'pos'},({payload})=>onPos(payload));ch.on('broadcast',{event:'dhikr'},({payload})=>onDhikr(payload&&payload.n));ch.on('broadcast',{event:'hello'},()=>{net.last.t=0;});
 ch.subscribe(st=>{if(st==='SUBSCRIBED'){net.ready=true;retrack();net.send('hello');updateOnline();}else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){net.ready=false;updateOnline();}});}catch(e){net.ch=null;}}
document.addEventListener('visibilitychange',()=>{if(!net.ch||!net.ready)return;try{if(document.hidden)net.ch.untrack();else retrack();}catch(e){}});
function netTick(now,dt){if(net.ready&&!document.hidden&&cur){const l=net.last,s=myState();const moved=Math.hypot(P.x-l.x,P.z-l.z)>.1||Math.abs(P.yaw-l.y)>.08||s!==l.s||l.sc!==cur.id;
 if((moved&&now-l.t>250)||now-l.t>4000){l.x=P.x;l.z=P.z;l.y=P.yaw;l.s=s;l.t=now;l.sc=cur.id;net.send('pos',{x:+P.x.toFixed(1),z:+P.z.toFixed(1),y:+P.yaw.toFixed(2),s,sc:cur.id,n:myName()});}}
 const k=1-Math.exp(-dt*7);ghosts.forEach(o=>{o.g.visible=!!cur&&o.sc===cur.id&&now-o.seen<15000;o.x+=(o.tx-o.x)*k;o.z+=(o.tz-o.z)*k;o.yaw=angLerp(o.yaw,o.tyaw,k);o.g.position.set(o.x,0,o.z);o.g.rotation.y=o.yaw;});}

/* ---------- player ---------- */
const P={x:0,z:52,eye:1.65,yaw:0,pitch:.08,mode:'walk',bob:0};
let anim=null,saved=null,lockKind=null,auto=null;const keys={};
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;keys[e.code]=true;if(e.code==='KeyE'||e.code==='Enter'){const b=$('#actions button');if(b)b.click();}if(e.code==='Escape')closeSheet();if(e.code==='Space'&&tapTarget){e.preventDefault();tapTarget();}});
addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const cvs=renderer.domElement;let lookId=null,lx=0,ly=0;
cvs.addEventListener('pointerdown',e=>{if(lookId!==null)return;lookId=e.pointerId;lx=e.clientX;ly=e.clientY;try{cvs.setPointerCapture(e.pointerId);}catch(_){} });
cvs.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const k=e.pointerType==='touch'?.0055:.0035;P.yaw-=(e.clientX-lx)*k;P.pitch-=(e.clientY-ly)*k;P.pitch=Math.max(-1.2,Math.min(1.3,P.pitch));lx=e.clientX;ly=e.clientY;});
const endLook=e=>{if(e.pointerId===lookId)lookId=null;};cvs.addEventListener('pointerup',endLook);cvs.addEventListener('pointercancel',endLook);
const joy=$('#joy'),knob=$('#knob');let joyId=null,jx=0,jy=0;
function joyMove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy),m=44;if(d>m){dx*=m/d;dy*=m/d;}jx=dx/m;jy=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;try{joy.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);e.preventDefault();});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;jx=jy=0;knob.style.transform='';};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
function blocked(x,z){if(!cur)return false;const r=.3;for(const c of cur.cols){if(x>c[0]-r&&x<c[1]+r&&z>c[2]-r&&z<c[3]+r)return true;}for(const c of cur.circ){if(Math.hypot(x-c[0],z-c[1])<c[2]+r)return true;}if(cur.block&&cur.block(x,z))return true;return Math.hypot(x,z)>cur.bounds;}
function moveTo(tg,dur,then){anim={from:{x:P.x,z:P.z,eye:P.eye,yaw:P.yaw,pitch:P.pitch},to:tg,t:0,dur:dur||1.2,then};}
function angLerp(a,b,k){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*k;}
function fade(mid){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#f4f1ea;z-index:15;opacity:0;transition:opacity .35s;pointer-events:none';document.body.appendChild(o);requestAnimationFrame(()=>o.style.opacity=1);setTimeout(()=>{mid();o.style.opacity=0;setTimeout(()=>o.remove(),400);},380);}
async function fontsReady(){try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);}catch(e){}}
function ensure(id){return SC[id]||BUILD[id]();}
function goScene(id,place,cb,keepSheet){if(!keepSheet)closeSheet();stopAuto();saved=null;lockKind=null;P.mode='anim';
 fade(()=>{const S=ensure(id);if(cur&&cur!==S)cur.group.visible=false;cur=S;S.group.visible=true;applySky(S);const p=typeof place==='object'?place:(S.places[place]||S.places.spawn);P.x=p.x;P.z=p.z;P.yaw=p.yaw;P.pitch=.06;P.eye=1.65;P.mode='walk';lastZone='';if(cb)setTimeout(cb,180);});}

/* ---------- actions near hotspots ---------- */
let curSpot=null,actionsKey='';
function renderActions(){let key,html=[];
 if(P.mode==='locked'){key='locked';html=[[t('aTimes'),()=>openSalah()],[t('aDhikr'),()=>openTasbih('after')],[t('aStand'),standUp,'sec']];}
 else if(curSpot&&cur){key=cur.id+cur.spots.indexOf(curSpot);html=[[t(curSpot.label),curSpot.act]];}else key='none';
 if(sheetOpen)key+='-s';if(key===actionsKey)return;actionsKey=key;const el=$('#actions');el.innerHTML='';if(sheetOpen)return;
 html.forEach(([tx,fn,cls])=>{const b=document.createElement('button');b.textContent=tx;if(cls)b.className=cls;b.onclick=e=>{e.stopPropagation();fn();};el.appendChild(b);});}
function prayRow(){if(P.mode==='walk')saved={x:P.x,z:P.z};const r=Math.hypot(P.x,P.z),a=Math.atan2(P.z,P.x),rr=Math.max(37,Math.min(42.6,r));const x=rr*Math.cos(a),z=rr*Math.sin(a);P.mode='anim';moveTo({x,z,eye:1.0,yaw:yawTo(x,z),pitch:.22},1.2,()=>{P.mode='locked';lockKind='row';openSalah();});}
function standUp(){closeSheet();if(!saved){P.mode='walk';lockKind=null;return;}P.mode='anim';moveTo({x:saved.x,z:saved.z,eye:1.65,yaw:P.yaw,pitch:.05},1.0,()=>{P.mode='walk';lockKind=null;saved=null;});}

/* ---------- sheet ---------- */
let sheetOpen=false,sheetCleanup=null,tapTarget=null;
function openSheet(title,html,init){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}tapTarget=null;$('#sheet').classList.remove('mini');$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#sheetBody').scrollTop=0;$('#sheet').classList.add('open');document.body.classList.add('sheet');sheetOpen=true;actionsKey='';if(init)sheetCleanup=init($('#sheetBody'))||null;}
function closeSheet(){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}tapTarget=null;$('#sheet').classList.remove('open','mini');document.body.classList.remove('sheet');sheetOpen=false;actionsKey='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}
$('#sheetX').onclick=closeSheet;['pointerdown','touchstart','keydown'].forEach(ev=>$('#sheet').addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
function toast(tx){const el=$('#toast');el.textContent=tx;el.style.opacity=1;clearTimeout(toast._t);toast._t=setTimeout(()=>el.style.opacity=0,2600);}
function dhikrHTML(k,sm){const d=DH[k];return`<div class="ar${sm?' sm':''}">${d.ar}</div><div class="tr">${d.tr}</div><div class="mean">${AR?d.m:d.zh}</div>`;}
function arCard(o,title){return`<div class="card">${title?`<div class="sec" style="margin:0 0 4px">${title}</div>`:''}<div class="ar sm">${o.ar}</div>${o.tr?`<div class="tr">${o.tr}</div>`:''}${!AR&&o.zh?`<div class="mean" style="margin-top:6px">${o.zh}</div>`:''}${o.src?`<div class="small">${o.src}</div>`:''}</div>`;}

/* ---------- information about places ---------- */
const INFO={kaaba:['kaabaT','kaabaP','kaabaNote'],masa:['masaT','masaP'],mina:['minaT','minaP'],arafat:['arafatT','arafatP'],rahmah:['rahmahT','rahmahP'],namirah:['namirahT','namirahP'],muzd:['muzdT','muzdP'],jamarat:['jamaratT','jamaratP']};
function info(k){const[a,b,c]=INFO[k];openSheet(t(a),`<div class="p">${t(b)}</div>${c?`<div class="note">${t(c)}</div>`:''}<div class="row"><button class="btn pri" id="ij">🕋 ${t('jT')}</button></div><div class="note">${t('disclaimer')}</div>`,r=>{r.querySelector('#ij').onclick=openJourney;});}

/* ---------- prayer times & qibla ---------- */
function openSalah(){let heading=null,compassOn=false,handler=null;
 const render=root=>{const now=new Date();const np=nextPrayer();const day=np&&np.today?np.today:PT.day(loc,now,METHOD,ASR);const hj=PT.hijri(now,LANG);const q=PT.qibla(loc.lat,loc.lng);
  const rows=['fajr','sunrise','dhuhr','asr','maghrib','isha'].map(k=>`<tr class="${np&&np.key===k&&day&&np.at===day[k]?'nx':''}${k==='sunrise'?' sr':''}"><td>${t(k)}</td><td>${day?fmtT(day[k]):'—'}</td></tr>`).join('');
  root.innerHTML=`<div class="small">${esc(hj.text)}${hj.month===9?` · ${t('hijriRamadan')}`:''} · ${esc(loc.name)}</div>
   ${np?`<div class="big">${t(np.key)} ${fmtT(np.at)}</div><div class="small" id="cd">${t('inT',{t:mmss(np.at-now)})}</div>`:''}<table class="ptable">${rows}</table>
   <div class="sec">${t('qiblaT')}</div><div class="dial"><div class="rose" id="rose"><b>N</b><i id="qa"></i><em></em></div></div>
   <div class="small">${t('qiblaDeg',{d:nf(Math.round(q))})} · ${t('qiblaDist',{k:nf(Math.round(PT.distKm(loc.lat,loc.lng)))})}</div>
   <div class="row"><button class="btn" id="cmp">${t('compassOn')}</button></div><div class="small" id="cmpH" style="display:none">${t('compassHint')}</div>
   <div class="sec">${t('locCity')}</div><div class="row" style="justify-content:flex-start"><button class="btn" id="geo">${t('locUse')}</button>
   <select class="field" id="city" style="width:auto;flex:1;min-width:150px"><option value="">${t('locCity')}</option>${window.CITIES.map((c,i)=>`<option value="${i}" ${loc.city===c[2]?'selected':''}>${cityName(c)}</option>`).join('')}</select></div>
   <label class="lbl">${t('method')}</label><select class="field" id="meth">${Object.keys(PT.METHODS).map(m=>`<option value="${m}" ${m===METHOD?'selected':''}>${t('m'+m)}</option>`).join('')}</select>
   <label class="lbl">${t('asrM')}</label><div class="row" style="justify-content:flex-start"><button class="btn ${ASR===1?'pri':''}" data-asr="1">${t('asrStd')}</button><button class="btn ${ASR===2?'pri':''}" data-asr="2">${t('asrHan')}</button></div>
   <div class="note">${t('salahNote')}</div>`;
  const draw=()=>{const rose=root.querySelector('#rose'),qa=root.querySelector('#qa');if(!rose)return;rose.style.transform=`rotate(${heading==null?0:-heading}deg)`;qa.style.transform=`rotate(${q}deg)`;};draw();render.draw=draw;
  root.querySelector('#city').onchange=e=>{const c=window.CITIES[+e.target.value];if(!c)return;loc=cityLoc(c);store.set('loc',loc);render(root);};
  root.querySelector('#meth').onchange=e=>{METHOD=e.target.value;store.set('method',METHOD);render(root);};
  root.querySelectorAll('[data-asr]').forEach(b=>b.onclick=()=>{ASR=+b.dataset.asr;store.set('asr',ASR);render(root);});
  root.querySelector('#geo').onclick=()=>{if(!navigator.geolocation){toast(t('locFail'));return;}toast(t('locWait'));navigator.geolocation.getCurrentPosition(p=>{loc={name:t('locMine'),lat:+p.coords.latitude.toFixed(4),lng:+p.coords.longitude.toFixed(4),tz:devTZ,mine:true};store.set('loc',loc);render(root);},()=>toast(t('locFail')),{timeout:12000,maximumAge:6e5});};
  root.querySelector('#cmp').onclick=async()=>{if(compassOn)return;try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const s=await DeviceOrientationEvent.requestPermission();if(s!=='granted'){toast(t('compassFail'));return;}}}catch(_){toast(t('compassFail'));return;}
   compassOn=true;handler=e=>{let h=null;if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;else if(e.absolute&&e.alpha!=null)h=360-e.alpha;if(h!=null){const so=(screen.orientation&&screen.orientation.angle)||window.orientation||0;heading=(h+so+360)%360;render.draw&&render.draw();}};
   addEventListener('deviceorientationabsolute',handler,true);addEventListener('deviceorientation',handler,true);root.querySelector('#cmpH').style.display='block';setTimeout(()=>{if(heading==null&&compassOn)toast(t('compassFail'));},3500);};};
 openSheet(t('salahT'),'<div id="sal"></div>',root=>{const el=root.querySelector('#sal');render(el);const iv=setInterval(()=>{const np=nextPrayer(),cd=el.querySelector('#cd');if(np&&cd)cd.textContent=t('inT',{t:mmss(np.at-Date.now())});},1000);
  return()=>{clearInterval(iv);if(handler){removeEventListener('deviceorientationabsolute',handler,true);removeEventListener('deviceorientation',handler,true);}};});}
let pNext=0;function pillTick(now){if(now<pNext)return;pNext=now+1000;const np=nextPrayer(),el=$('#npill');if(np){el.classList.add('show');el.textContent=t('pillNext',{p:t(np.key),t:fmtT(np.at)})+' · '+mmss(np.at-Date.now());}}
$('#npill').onclick=()=>openSalah();

/* ---------- tasbih ---------- */
const AFTER=[['subhanallah',33],['alhamdulillah',33],['allahuakbar',34]];
let pend={},pendN=0,flushT=null,bcast=0,bcastT=null;
function queueDhikr(k){pend[k]=(pend[k]||0)+1;pendN++;todayAll++;if(!flushT)flushT=setTimeout(flushDhikr,3000);bcast++;if(!bcastT)bcastT=setTimeout(()=>{bcastT=null;if(bcast){net.send('dhikr',{n:bcast});bcast=0;}},1000);}
async function flushDhikr(){clearTimeout(flushT);flushT=null;const p=pend;pend={};pendN=0;for(const k in p){let r=null;try{r=await rpc('mecca_add_dhikr',{p_token:token,p_phrase:k,p_n:p[k],p_group:false});}catch(_){}if(r){let s=0;for(const x in r)s+=+r[x]||0;todayAll=Math.max(todayAll,s);}}
 if(me)me.dhikr=(me.dhikr||0)+Object.values(p).reduce((a,b)=>a+b,0);dhikrListeners.forEach(f=>f());}
function refreshToday(){if(!sb)return;rpc('mecca_dhikr_today').then(r=>{let s=0;for(const x in r||{})s+=+r[x]||0;todayAll=Math.max(todayAll,s);dhikrListeners.forEach(f=>f());}).catch(()=>{});}
function openTasbih(mode){refreshToday();let md=mode||'free',phrase='subhanallah',count=0,seq=0;const vib=store.get('vib',true);
 openSheet(t('tasbihT'),`<div class="p">${t('tasbihP')}</div><div id="tz"></div>`,root=>{const el=root.querySelector('#tz');
  const curK=()=>md==='after'?AFTER[seq][0]:phrase,target=()=>md==='after'?AFTER[seq][1]:33;
  const tot=()=>{const e=el.querySelector('#tot');if(!e)return;const parts=[t('todayAll',{n:nf(todayAll)})];if(me)parts.push(t('mine',{n:nf((me.dhikr||0)+pendN)}));e.innerHTML=parts.join('<br>');};
  const render=()=>{el.innerHTML=`<div class="chips"><span class="chip ${md==='after'?'on':''}" data-m="after">${t('afterSalah')}</span><span class="chip ${md==='free'?'on':''}" data-m="free">${t('free')}</span></div>
    ${md==='free'?`<div class="chips" style="margin-top:6px">${Object.keys(DH).map(k=>`<span class="chip ${phrase===k?'on':''}" data-p="${k}">${DH[k].ar}</span>`).join('')}</div>`:`<div class="steps">${AFTER.map((a,i)=>`<i class="${i<=seq?'on':''}"></i>`).join('')}</div>`}
    <div id="dz">${dhikrHTML(curK())}</div><button class="tap" id="tap"><span class="n" id="cnt">${nf(count)}</span><span class="of">${md==='after'?'/ '+nf(target()):t('tap')}</span></button>
    <div class="row"><button class="btn" id="rst">${t('reset')}</button></div><div class="small" id="tot"></div>`;
   el.querySelectorAll('[data-m]').forEach(c=>c.onclick=()=>{md=c.dataset.m;count=0;seq=0;render();});el.querySelectorAll('[data-p]').forEach(c=>c.onclick=()=>{phrase=c.dataset.p;count=0;render();});
   el.querySelector('#rst').onclick=()=>{count=0;seq=0;render();};el.querySelector('#tap').onclick=tap;tot();};
  function tap(){count++;queueDhikr(curK());const n=el.querySelector('#cnt');if(n)n.textContent=nf(count);if(vib&&navigator.vibrate){try{navigator.vibrate(count%33===0?40:8);}catch(_){}}
   if(md==='after'&&count>=target()){chime(659.25,.2);if(seq<AFTER.length-1){seq++;count=0;setTimeout(render,250);}else{setTimeout(()=>{el.querySelector('#dz').innerHTML=`<div class="big2">${t('tasbihDone')}</div>`;},250);seq=0;count=0;md='free';setTimeout(render,2200);}}else if(count%33===0)chime(659.25,.16);tot();}
  render();tapTarget=tap;const lis=()=>tot();dhikrListeners.add(lis);return()=>{dhikrListeners.delete(lis);if(pendN)flushDhikr();};});}

/* ---------- accounts ---------- */
function requireLogin(after){if(me){after();return;}openAccount(t('needLogin'),after);}
function openAccount(reason,after){if(me){openProfile();return;}let mode='login',email='';
 const render=root=>{root.innerHTML=`${reason?`<div class="p">${reason}</div>`:''}<div class="tabs"><button data-m="login" class="${mode==='login'?'on':''}">${t('login')}</button><button data-m="register" class="${mode==='register'?'on':''}">${t('register')}</button></div>
  <input class="field" id="ae" type="email" dir="ltr" autocomplete="email" placeholder="${t('email')}" value="${esc(email)}">${mode==='register'?`<input class="field" id="an" maxlength="24" placeholder="${t('dname')}" style="margin-top:8px">`:''}
  <input class="field" id="ap" type="password" dir="ltr" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="${t('password')}" style="margin-top:8px">
  <div class="row"><button class="btn pri" id="ago">${mode==='login'?t('loginBtn'):t('regBtn')}</button></div><div class="note"><a href="/privacy.html">${t('privacy')}</a></div>`;
  root.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{email=root.querySelector('#ae').value;mode=b.dataset.m;render(root);});
  root.querySelector('#ago').onclick=async()=>{const btn=root.querySelector('#ago');const e=root.querySelector('#ae').value.trim(),p=root.querySelector('#ap').value;let r;btn.disabled=true;
   try{r=mode==='login'?await rpc('mecca_login',{p_email:e,p_password:p}):await rpc('mecca_register',{p_email:e,p_password:p,p_name:root.querySelector('#an').value.trim(),p_lang:LANG==='zh'?'zh':'en'});}catch(_){r={error:'offline'};}
   btn.disabled=false;if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}token=r.token;store.set('tok',token);me=r.user;setAcctBtn();retrack();closeSheet();toast(t('welcome',{n:me.name}));if(after)setTimeout(after,350);};};
 openSheet(t('acctT'),'<div id="acc"></div>',root=>{render(root.querySelector('#acc'));});}
function openProfile(){const u=me;const st=[t('statDhikr',{n:nf(u.dhikr)}),t('statHajj',{n:nf(u.hajj_done)})];if(u.supports)st.push(t('statSupport',{n:nf(u.supports)}));
 openSheet(t('acctT'),`<div class="p" dir="ltr" style="text-align:start">${esc(u.email)}</div><div>${st.map(s=>`<span class="chip">${s}</span>`).join('')}${u.hajj_course?`<span class="chip on">🕋 ${t('fullHave')}</span>`:''}</div>
  <label class="lbl">${t('dname')}</label><input class="field" id="pn" maxlength="24" value="${esc(u.name)}"><label class="chk"><input type="checkbox" id="ps" ${u.show_name?'checked':''}> ${t('showName')}</label>
  <label class="chk"><input type="checkbox" id="pv" ${store.get('vib',true)?'checked':''}> ${t('vibrate')}</label>
  <label class="lbl">${t('currency')}</label><div class="row" style="justify-content:flex-start">${['eur','usd'].map(c=>`<button class="btn ${CUR===c?'pri':''}" data-c="${c}">${c.toUpperCase()}</button>`).join('')}</div>
  <div class="row"><button class="btn pri" id="psave">${t('saveBtn')}</button><button class="btn" id="pout">${t('logout')}</button></div>`,root=>{
  root.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{CUR=b.dataset.c;store.set('cur',CUR);root.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('pri',x===b));});
  root.querySelector('#pv').onchange=e=>store.set('vib',e.target.checked);
  root.querySelector('#psave').onclick=async()=>{let r;try{r=await rpc('mecca_update_profile',{p_token:token,p_name:root.querySelector('#pn').value.trim(),p_show_name:root.querySelector('#ps').checked,p_lang:LANG==='zh'?'zh':'en'});}catch(_){r={error:'offline'};}
   if(r&&r.user){me=r.user;setAcctBtn();retrack();toast(t('saved'));}else{if(r&&r.error==='auth')logoutLocal();toast(t('aErr_'+((r&&r.error)||'offline')));}};
  root.querySelector('#pout').onclick=async()=>{try{await rpc('mecca_logout',{p_token:token});}catch(_){}logoutLocal();closeSheet();};});}
$('#acctbtn').onclick=()=>openAccount();

/* ---------- payments (PayPal; free during beta) ---------- */
async function buy(kind){if(!sb){toast(t('aErr_offline'));return null;}let r;
 try{r=await rpc('mecca_create_order',{p_token:token,p_kind:kind,p_currency:CUR});}catch(_){toast(t('aErr_offline'));return null;}
 if(!r||r.error){if(r&&r.error==='auth'){logoutLocal();openAccount(t('needLogin'));}else toast(t('aErr_'+((r&&r.error)||'offline')));return null;}
 if(r.status==='beta_free')return r.id;
 try{const res=await fetch(SB_URL+'/functions/v1/mecca-paypal-checkout',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:r.id,lang:LANG==='zh'?'zh':'en',origin:location.origin})});
  const j=await res.json();if(j&&j.url){store.set('pend',{id:r.id,kind,ts:Date.now()});location.href=j.url;return null;}}catch(_){}toast(t('payFail'));return null;}
async function useOrder(id){let r;try{r=await rpc('mecca_use_order',{p_token:token,p_id:id});}catch(_){r={error:'offline'};}if(r&&r.user){me=r.user;setAcctBtn();}return r;}
let resume=null;
async function checkReturn(){const q=new URLSearchParams(location.search);const p=store.get('pend',null);if(!q.has('pay')&&!p)return;if(q.has('pay'))history.replaceState(null,'',location.pathname);
 if(!p||!token)return;if(q.get('pay')==='cancel'||Date.now()-p.ts>36e5){store.set('pend',null);if(q.get('pay')==='cancel')toast(t('payCancel'));return;}
 if(q.get('pay')==='ok'){toast(t('payWaiting'));try{await fetch(SB_URL+'/functions/v1/mecca-paypal-capture',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:p.id})});}catch(_){}}
 for(let i=0;i<12;i++){let s=null;try{s=await rpc('mecca_order_status',{p_token:token,p_id:p.id});}catch(_){}if(s==='paid'){store.set('pend',null);resume=p;toast(t('payDone'));return;}if(s==='used'||s==='failed'||s==null){store.set('pend',null);return;}await new Promise(r=>setTimeout(r,1500));}}
const priceNote=()=>payOn?t('payNote'):t('betaFree');
async function finishOrder(id,kind){const r=await useOrder(id);if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}
 if(kind==='support'){chime(783.99,.25);openSheet(t('supportT'),`<div class="big2">🤍 ${t('supportThanks')}</div><div class="row"><button class="btn" id="x">${t('close')}</button></div>`,r2=>{r2.querySelector('#x').onclick=closeSheet;});}else startFull(true);}
function openSupport(){openSheet(t('supportT'),`<div class="p">${t('supportP')}</div><div class="row"><button class="btn pri" id="sp">${t('supportBtn',{p:price(PRICE.support)})}</button></div><div class="note">${t('supportNote')}<br>${priceNote()}</div>`,root=>{
 root.querySelector('#sp').onclick=()=>requireLogin(async()=>{const id=await buy('support');if(id)finishOrder(id,'support');});});}

/* ---------- du'a wall ---------- */
function openWall(){const mine=store.get('wall',[]);const amined=store.get('amined',{});const reported=store.get('reported',{});let items=[],state=sb?'loading':'offline';
 const draw=root=>{const bx=root.querySelector('#cards');let h='';
  mine.forEach(c=>{h+=`<div class="card"><div class="t">${esc(c.t)}</div><div class="m"><span>${t('yourReq')}<span class="tag">${t('reviewing')}</span></span><span>${new Date(c.at).toLocaleDateString(LOCALE)}</span></div></div>`;});
  if(state==='loading')h+=`<div class="small" style="padding:14px">${t('wallLoading')}</div>`;else if(state==='offline')h+=`<div class="small" style="padding:14px">${t('wallOffline')}</div>`;else if(!items.length)h+=`<div class="small" style="padding:14px">${t('wallEmpty')}</div>`;
  items.forEach(c=>{if(reported[c.id])return;const done=amined[c.id];h+=`<div class="card"><div class="t">${esc(c.body)}</div><div class="m"><span>${t('anon')} · ${new Date(c.created_at).toLocaleDateString(LOCALE)} · <a href="#" data-r="${c.id}" style="color:var(--muted)">${t('report')}</a></span><button class="btn" data-id="${c.id}">${done?t('amined'):t('amin')} · ${nf(c.amin_count)}</button></div></div>`;});
  bx.innerHTML=h;
  bx.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id;if(amined[id])return;amined[id]=1;store.set('amined',amined);chime(587.33,.2);toast(t('aminToast'));const it=items.find(x=>x.id===id);if(it)it.amin_count++;draw(root);try{const n=await rpc('mecca_amin',{p_id:id});if(it&&n>=0){it.amin_count=n;draw(root);}}catch(_){}});
  bx.querySelectorAll('[data-r]').forEach(a=>a.onclick=async e=>{e.preventDefault();const id=a.dataset.r;reported[id]=1;store.set('reported',reported);draw(root);toast(t('reportedToast'));try{await rpc('mecca_report',{p_id:id});}catch(_){}});};
 const load=async root=>{if(!sb){state='offline';draw(root);return;}try{items=await rpc('mecca_list_duas')||[];state='ok';}catch(_){state='offline';}draw(root);};
 openSheet(t('wallT'),`<div class="p">${t('wallP')}</div><textarea class="field" id="wt" maxlength="120" placeholder="${t('wallPh')}" style="margin-top:10px"></textarea><div class="row"><button class="btn pri" id="wp">${t('wallSubmit')}</button></div><div id="cards"></div><div class="note">${t('wallRules')}</div>`,root=>{draw(root);load(root);
  root.querySelector('#wp').onclick=async()=>{const ta=root.querySelector('#wt'),v=ta.value.trim();if(v.length<2){toast(t('moreWords'));return;}const btn=root.querySelector('#wp');btn.disabled=true;let r='offline';try{r=await rpc('mecca_submit_dua',{p_body:v});}catch(_){}btn.disabled=false;
   toast(DICT['eRes_'+r]?t('eRes_'+r):t('eRes_fail'));if(r==='pending'){mine.unshift({t:v,at:Date.now()});mine.splice(10);store.set('wall',mine);ta.value='';draw(root);}};});}

/* ---------- Qur'an ---------- */
const QAPI='https://api.alquran.cloud/v1',QTR=AR?'ar.muyassar':'zh.majian';const qcache=new Map();
async function qget(path){if(qcache.has(path))return qcache.get(path);const r=await fetch(QAPI+path);if(!r.ok)throw new Error(r.status);const j=await r.json();if(!j||j.code!==200)throw new Error('bad');qcache.set(path,j.data);return j.data;}
const dayIdx=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);let ayahOff=0;
function openQuran(tab){tab=tab||'daily';let surahs=null,filter='';
 openSheet(t('quranT'),`<div class="tabs"><button data-t="daily">${t('qDaily')}</button><button data-t="read">${t('qRead')}</button></div><div id="qz"></div><div class="note">${t('qSrc')} · <a href="https://quran.com" target="_blank" rel="noopener">${t('qOpen')}</a></div>`,root=>{
  const qz=root.querySelector('#qz');let alive=true;
  const fail=retry=>{qz.innerHTML=`<div class="small" style="padding:14px">${t('qFail')}</div><div class="row"><button class="btn" id="rt">${t('qRetry')}</button></div>`;qz.querySelector('#rt').onclick=retry;};
  const loading=()=>{qz.innerHTML=`<div class="small" style="padding:14px">${t('qLoading')}</div>`;};
  async function daily(){loading();const L=window.DAILY_AYAHS,ref=L[(dayIdx+ayahOff)%L.length];
   try{const d=await qget(`/ayah/${ref}/editions/quran-uthmani,${QTR}`);if(!alive)return;const ar=d[0],tr=d[1];
    qz.innerHTML=`<div class="ar" style="font-size:26px;margin-top:6px">${esc(ar.text)}</div><div class="ref">﴿ ${esc(ar.surah.name)} · ${nf(ar.numberInSurah)} ﴾</div>${AR?`<div class="sec">${t('qTafsir')}</div>`:''}<div class="p">${esc(tr.text)}</div>
     <div class="row"><button class="btn" id="nx">${t('qNext')}</button><button class="btn" id="rs">${t('qRead')} · ${esc(AR?ar.surah.name:ar.surah.englishName)}</button></div>`;
    qz.querySelector('#nx').onclick=()=>{ayahOff++;daily();};qz.querySelector('#rs').onclick=()=>{setTab('read');readSurah(ar.surah.number);};}catch(_){if(alive)fail(daily);}}
  async function list(){if(!surahs){loading();try{surahs=await qget('/surah');}catch(_){if(alive)fail(list);return;}}if(!alive)return;
   qz.innerHTML=`<input class="field" id="qs" placeholder="${t('qSearch')}" value="${esc(filter)}"><div class="slist" id="sl"></div>`;
   const drawL=()=>{const f=filter.trim().toLowerCase();qz.querySelector('#sl').innerHTML=surahs.filter(s=>!f||String(s.number)===f||s.englishName.toLowerCase().includes(f)||s.name.includes(filter.trim())).map(s=>`<button class="btn" data-s="${s.number}"><span>${nf(s.number)}. <span class="ar sm" style="font-size:18px;line-height:1">${esc(s.name)}</span>${AR?'':` <small>${esc(s.englishName)}</small>`}</span><small>${t('qAyahs',{n:nf(s.numberOfAyahs)})}</small></button>`).join('');
    qz.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>readSurah(+b.dataset.s));};drawL();qz.querySelector('#qs').oninput=e=>{filter=e.target.value;drawL();};}
  async function readSurah(n){loading();try{const d=await qget(`/surah/${n}/editions/quran-uthmani,${QTR}`);if(!alive)return;const ar=d[0],tr=d[1];
    qz.innerHTML=`<div class="row" style="justify-content:space-between"><button class="btn" id="bk">${t('qBack')}</button><div class="ar sm" style="font-size:20px">${esc(ar.name)}</div></div>`+ar.ayahs.map((a,i)=>`<div class="ayah"><div class="ar">${esc(a.text)} ﴿${nf(a.numberInSurah)}﴾</div><div class="tx"><span class="no">${nf(a.numberInSurah)}</span>${esc((tr.ayahs[i]||{}).text||'')}</div></div>`).join('');
    qz.querySelector('#bk').onclick=list;$('#sheetBody').scrollTop=0;}catch(_){if(alive)fail(()=>readSurah(n));}}
  function setTab(tb){root.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tb));}
  root.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{setTab(b.dataset.t);b.dataset.t==='daily'?daily():list();});setTab(tab);tab==='daily'?daily():list();return()=>{alive=false;};});}

/* ---------- requirements & photos ---------- */
function openReq(){const D=DICT.reqSec||window.I18N.ar.reqSec;openSheet(t('reqT'),`<div class="stephead"><img src="${photoURL('supplicating',800)}" alt="" onerror="this.remove()"><div><b>${t('reqT')}</b></div></div><div class="note" style="border:none;margin-top:0;padding-top:0">${t('reqNote')}</div>
 ${D.map(([h,list])=>`<div class="sec">${h}</div><ul class="st">${list.map(x=>`<li>${x}</li>`).join('')}</ul>`).join('')}
 <div class="sec">${t('typeH')}</div><ul class="st"><li>${t('typeTam')}</li><li>${t('typeQir')}</li><li>${t('typeIfr')}</li></ul>
 <div class="note"><b>${t('reqSrc')}</b><br>${window.REQ_SOURCES.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener" dir="ltr">${esc(n)}</a>`).join('<br>')}<br><br>${t('disclaimer')}</div>`);}
function openGallery(){openSheet(t('galT'),`<div class="p">${t('galNote')}</div><div class="gal">${Object.keys(window.PHOTOS).map(k=>{const P=window.PHOTOS[k];return`<img loading="lazy" src="${photoURL(k,800)}" alt="${esc(P[LANG])}"><div class="cap">${esc(P[LANG])}</div><div class="cr">📷 <a href="${P.p}" target="_blank" rel="noopener">${esc(P.a)}</a> · ${P.lu?`<a href="${P.lu}" target="_blank" rel="noopener">${esc(P.l)}</a>`:esc(P.l)} · Wikimedia Commons</div>`;}).join('')}</div>`);}

/* ---------- Hajj journey ---------- */
function stepHead(id,i){const m=SM[id],x=ST[id];return`<div class="stephead">${m.photo?`<img src="${photoURL(m.photo,800)}" alt="" onerror="this.remove()">`:''}<div><small>${t('stepN',{n:nf(i+1),m:nf(STEPS.length)})} · ${esc(x.d)}</small><b>${esc(x.t)}</b></div></div>`;}
function openJourney(){const have=me&&me.hajj_course;const prog=store.get('jprog',0);
 openSheet(t('jT'),`<div class="p">${t('jP')}</div>
  ${STEPS.map((id,i)=>`<button class="card" data-s="${id}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:start;cursor:pointer"><span class="chip ${i<prog?'on':''}" style="margin:0">${nf(i+1)}</span><span><small style="color:var(--muted)">${esc(ST[id].d)}</small><br><b>${esc(ST[id].t)}</b></span></button>`).join('')}
  <div class="sec">${have?t('fullHave'):t('fullBuy',{p:price(PRICE.course)})}</div>${have?'':`<ul class="st">${(DICT.fullInc||[]).map(x=>`<li>${x}</li>`).join('')}</ul>`}
  <div class="row"><button class="btn pri" id="full">${have?t('fullOpen'):t('fullBuy',{p:price(PRICE.course)})}</button><button class="btn" id="req">📋 ${t('tReq')}</button></div>
  <div class="note">${t('freeNote')}${have?'':'<br>'+priceNote()}<br>${t('disclaimer')}</div>`,root=>{
  root.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>openStep(b.dataset.s,false));root.querySelector('#req').onclick=openReq;
  root.querySelector('#full').onclick=()=>{if(me&&me.hajj_course){startFull(false);return;}requireLogin(async()=>{if(me.hajj_course){startFull(false);return;}const id=await buy('hajj_course');if(id)finishOrder(id,'hajj_course');});};});}
function startFull(fresh){let i=fresh?0:store.get('jprog',0);if(i>=STEPS.length)i=0;openStep(STEPS[i],true);}
function stopAuto(){if(auto){auto=null;if(P.mode==='auto')P.mode='walk';}}
function startAuto(fn,dur,onStep,done){P.mode='auto';auto={fn,dur,t:0,speed:1,onStep,done};}
function tawafPos(k){const a=-Math.PI/4+k*Math.PI*14;return{x:TAWAF_R*Math.cos(a),z:-TAWAF_R*Math.sin(a),yaw:a+.45};}
function saiPos(k){const leg=Math.min(6,Math.floor(k*7)),f=k*7-leg,go=leg%2===0,a=MASA.safa+6,b=MASA.marwa-6;return{x:go?67:69,z:go?a+(b-a)*f:b-(b-a)*f,yaw:go?Math.PI:0,leg};}
function openStep(id,full){const i=STEPS.indexOf(id),m=SM[id],x=ST[id];let done=!m.interact||m.interact==='talbiyah';
 const go=cb=>{if(cur&&cur.id===m.scene&&!full){cb&&cb();return;}goScene(m.scene,m.at,cb,true);};
 const nav=()=>full?`<div class="row">${i>0?`<button class="btn" id="pv">${t('back')}</button>`:''}<button class="btn pri" id="nx" ${done?'':'disabled'}>${i<STEPS.length-1?t('cont'):t('done')}</button></div>`:`<div class="row"><button class="btn" id="gs">📍 ${t('goScene')}</button><button class="btn" id="jl">🕋 ${t('jT')}</button></div>`;
 openSheet(full?t('jT'):x.t,`${full?`<div class="steps">${STEPS.map((s,k)=>`<i class="${k<=i?'on':''}"></i>`).join('')}</div>`:''}${stepHead(id,i)}<div class="p">${esc(x.p)}</div><div class="sec">${t('keyPoints')}</div><ul class="st">${x.k.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><div id="ia"></div><div id="nv"></div><div class="note">${t('disclaimer')}</div>`,root=>{
  const ia=root.querySelector('#ia'),nv=root.querySelector('#nv');let cleanup=null;
  const renderNav=()=>{nv.innerHTML=nav();const nx=nv.querySelector('#nx'),pv=nv.querySelector('#pv'),gs=nv.querySelector('#gs'),jl=nv.querySelector('#jl');
   if(nx)nx.onclick=()=>{if(i<STEPS.length-1){store.set('jprog',i+1);openStep(STEPS[i+1],true);}else finishJourney();};if(pv)pv.onclick=()=>openStep(STEPS[i-1],true);if(gs)gs.onclick=()=>goScene(m.scene,m.at,()=>openStep(id,false));if(jl)jl.onclick=openJourney;};
  const complete=()=>{done=true;renderNav();};
  if(full)go();renderNav();
  cleanup=interact(m.interact,ia,complete,id,full);
  return()=>{cleanup&&cleanup();stopAuto();};});}
function interact(kind,ia,complete,id,full){if(!kind)return null;
 if(kind==='talbiyah'){let n=0;ia.innerHTML=`${arCard(window.TALBIYAH,t('talbiyahT'))}<div class="row"><button class="btn pri" id="lb">${t('talbiyahBtn')}</button></div><div class="small" id="lc"></div>`;ia.querySelector('#lb').onclick=()=>{n++;chime(587.33,.2);ia.querySelector('#lc').textContent=t('talbiyahCount',{n:nf(n)});};return null;}
 if(kind==='tawaf'||kind==='wada'){ia.innerHTML=`${arCard(window.BISMILLAH_TAKBIR)}<div class="big2" id="an"></div><div class="row"><button class="btn pri" id="go">${kind==='wada'?t('wadaBtn'):t('tawafBtn')}</button><button class="btn" id="fast" style="display:none">${t('faster')}</button><button class="btn" id="sk">${t('skip')}</button></div>`;
  const an=ia.querySelector('#an'),fast=ia.querySelector('#fast');
  ia.querySelector('#go').onclick=e=>{e.target.style.display='none';fast.style.display='';$('#sheet').classList.add('mini');const p0=tawafPos(0);
   const run=()=>{P.x=p0.x;P.z=p0.z;P.yaw=yawTo(p0.x,p0.z);let last=0;startAuto(tawafPos,56,k=>{const lap=Math.min(7,Math.floor(k*7)+1);if(lap!==last){last=lap;an.textContent=t('lap',{n:nf(lap)});if(lap>1)chime(659.25,.16);}},()=>{chime(783.99,.25);an.textContent=t('lapsDone');fast.style.display='none';$('#sheet').classList.remove('mini');complete();});};
   if(cur&&cur.id==='haram')run();else goScene('haram','stone',run,true);};
  fast.onclick=()=>{if(auto)auto.speed=auto.speed>1?1:3;};ia.querySelector('#sk').onclick=()=>{stopAuto();$('#sheet').classList.remove('mini');complete();};return null;}
 if(kind==='sai'){ia.innerHTML=`<div class="big2" id="an"></div><div class="small" id="gz"></div><div class="row"><button class="btn pri" id="go">${t('saiBtn')}</button><button class="btn" id="fast" style="display:none">${t('faster')}</button><button class="btn" id="sk">${t('skip')}</button></div>`;
  const an=ia.querySelector('#an'),gz=ia.querySelector('#gz'),fast=ia.querySelector('#fast');let boost=1;
  ia.querySelector('#go').onclick=e=>{e.target.style.display='none';fast.style.display='';$('#sheet').classList.add('mini');
   const run=()=>{let last=-1;startAuto(saiPos,70,k=>{const p=saiPos(k);if(p.leg!==last){last=p.leg;an.textContent=t('leg',{n:nf(p.leg+1)});if(p.leg>0)chime(659.25,.16);}const g=p.z>MASA.greenA&&p.z<MASA.greenB;gz.textContent=g?t('green'):'';if(auto)auto.speed=boost*(g?1.7:1);},()=>{chime(783.99,.25);an.textContent=t('legsDone');gz.textContent='';fast.style.display='none';$('#sheet').classList.remove('mini');complete();});};
   if(cur&&cur.id==='haram'){const p=saiPos(0);P.x=p.x;P.z=p.z;P.yaw=p.yaw;run();}else goScene('haram','safa',run,true);};
  fast.onclick=()=>{boost=boost>1?1:3;};ia.querySelector('#sk').onclick=()=>{stopAuto();$('#sheet').classList.remove('mini');complete();};return null;}
 if(kind==='mina'){ia.innerHTML=`<div class="small">${t('minaPrayers')}</div><div class="big2" id="an"></div><div class="row"><button class="btn pri" id="go">${t('minaBtn')}</button></div>`;let raf=0,t0=0;
  ia.querySelector('#go').onclick=e=>{e.target.disabled=true;$('#sheet').classList.add('mini');const run=()=>{t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/16000);setNightPhase(k);const pr=['dhuhr','asr','maghrib','isha','fajr'][Math.min(4,Math.floor(k*5))];ia.querySelector('#an').textContent=t(pr);if(k<1)raf=requestAnimationFrame(step);else{ia.querySelector('#an').textContent=t('minaDone');setNightPhase(0);$('#sheet').classList.remove('mini');complete();}};step();};
   if(cur&&cur.id==='mina')run();else goScene('mina','spawn',run,true);};return()=>{cancelAnimationFrame(raf);if(cur&&cur.id==='mina')setNightPhase(0);};}
 if(kind==='arafah'){ia.innerHTML=`${arCard(window.ARAFAH_DUA)}<div class="big2" id="an"></div><div class="row"><button class="btn pri" id="go">${t('arafahBtn')}</button><button class="btn" id="fast" style="display:none">${t('faster')}</button></div>`;let raf=0,k=0,sp=1,last=performance.now();
  ia.querySelector('#go').onclick=e=>{e.target.style.display='none';ia.querySelector('#fast').style.display='';$('#sheet').classList.add('mini');
   const run=()=>{last=performance.now();const step=()=>{const now=performance.now();k=Math.min(1,k+(now-last)/60000*sp);last=now;setDayPhase(k*.98);const left=(1-k)*6.3*3600e3;ia.querySelector('#an').textContent=k<1?t('arafahLeft',{t:mmss(left)}):t('arafahDone');if(k<1)raf=requestAnimationFrame(step);else{ia.querySelector('#fast').style.display='none';$('#sheet').classList.remove('mini');chime(783.99,.25);complete();}};step();};
   if(cur&&cur.id==='arafat')run();else goScene('arafat','spawn',run,true);};ia.querySelector('#fast').onclick=()=>{sp=sp>1?1:4;};
  return()=>{cancelAnimationFrame(raf);if(cur&&cur.id==='arafat')applySky(cur);};}
 if(kind==='pebbles'){let target=0,n=0;const draw=()=>{if(!target){ia.innerHTML=`<div class="sec">${t('pebbleChoose')}</div><div class="row"><button class="btn" data-n="49">${t('peb49')}</button><button class="btn" data-n="70">${t('peb70')}</button></div>`;ia.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{target=+b.dataset.n;store.set('pebbles',target);draw();});return;}
   ia.innerHTML=`<div class="big2" id="pc">${t('pebbleCount',{n:nf(n),m:nf(target)})}</div><div class="row"><button class="btn pri" id="pk">${t('pebbleBtn')}</button><button class="btn" id="p7">+٧</button></div>`;
   const add=d=>{n=Math.min(target,n+d);chime(880,.08);ia.querySelector('#pc').textContent=n>=target?t('pebbleDone'):t('pebbleCount',{n:nf(n),m:nf(target)});if(n>=target){ia.querySelector('#pk').disabled=true;ia.querySelector('#p7').disabled=true;complete();}};ia.querySelector('#pk').onclick=()=>add(1);ia.querySelector('#p7').onclick=()=>add(7);};draw();return null;}
 if(kind==='aqabah'){ia.innerHTML=`<div class="row"><button class="btn pri" id="gj">🪨 ${t('aStone')} · ${t('lblAqabah')}</button></div>`;ia.querySelector('#gj').onclick=()=>{const g=()=>openStoning('aqabah',{onDone:()=>openStep(id,full),full});if(cur&&cur.id==='jamarat')g();else goScene('jamarat','aqabah',g,true);};if(full&&store.get('stoned_nahr',false))complete();return null;}
 if(kind==='three'){ia.innerHTML=`<div class="small">${t('orderHint')}</div><div class="row"><button class="btn pri" id="gj">🪨 ${t('aStone')} · ${t('lblSughra')}</button></div>`;ia.querySelector('#gj').onclick=()=>{const g=()=>openStoning('sughra',{seq:true,onDone:()=>openStep(id,full),full});if(cur&&cur.id==='jamarat')g();else goScene('jamarat','sughra',g,true);};if(full&&store.get('stoned_three',false))complete();return null;}
 return null;}
/* stoning */
const pebbles=[];const pebMat=new THREE.SpriteMaterial({color:0x8d8473});
function throwPebble(jk){const j=JAM.find(x=>x.k===jk);const sp=new THREE.Sprite(pebMat);sp.scale.set(.12,.12,1);const from=new THREE.Vector3(P.x,1.5,P.z);const to=new THREE.Vector3(j.x+(Math.random()-.5)*14,1.5+Math.random()*3,Math.sign(P.z||1)*1.3);scene.add(sp);pebbles.push({sp,from,to,t:0});}
function pebbleTick(dt){for(let i=pebbles.length-1;i>=0;i--){const p=pebbles[i];p.t+=dt/.7;const k=Math.min(1,p.t);p.sp.position.lerpVectors(p.from,p.to,k);p.sp.position.y+=Math.sin(Math.PI*k)*2.2;if(k>=1){scene.remove(p.sp);pebbles.splice(i,1);}}}
function openStoning(jk,opt){opt=opt||{};const j=JAM.find(x=>x.k===jk);let n=0;
 openSheet(t(j.lbl),`<div class="small">${opt.seq?t('orderHint'):''}</div>${arCard(DH.allahuakbar)}<div class="big2" id="sc">${t('thrown',{n:nf(0)})}</div><div class="row"><button class="btn pri" id="th">${t('throwBtn')}</button></div><div id="nxt"></div>`,root=>{
  $('#sheet').classList.add('mini');const sc=root.querySelector('#sc'),th=root.querySelector('#th'),nxt=root.querySelector('#nxt');
  th.onclick=()=>{if(n>=7)return;n++;throwPebble(jk);chime(523.25+n*20,.14);toast(DH.allahuakbar.ar);sc.textContent=t('thrown',{n:nf(n)});
   if(n>=7){th.disabled=true;chime(783.99,.25);$('#sheet').classList.remove('mini');sc.textContent=t('jamrahDone',{j:t(j.lbl)});
    const order=['sughra','wusta','aqabah'],idx=order.indexOf(jk);
    if(opt.seq&&idx<2){const nk=order[idx+1],nj=JAM.find(x=>x.k===nk);nxt.innerHTML=`${idx<2?`<div class="small">${t('duaPause')}</div>`:''}<div class="row"><button class="btn pri" id="gn">${t('goNextJamrah',{j:t(nj.lbl)})}</button></div>`;nxt.querySelector('#gn').onclick=()=>goScene('jamarat',nk,()=>openStoning(nk,opt),true);}
    else{if(opt.full){store.set(opt.seq?'stoned_three':'stoned_nahr',true);}if(opt.onDone)nxt.innerHTML=`<div class="row"><button class="btn pri" id="bk">${t('cont')}</button></div>`,nxt.querySelector('#bk').onclick=opt.onDone;}}};
  tapTarget=()=>th.click();});}
function finishJourney(){store.set('jprog',0);store.set('stoned_nahr',false);store.set('stoned_three',false);if(token)rpc('mecca_hajj_done',{p_token:token}).then(r=>{if(r&&r.user)me=r.user;}).catch(()=>{});chime(783.99,.3);
 openSheet(t('certTitle'),`<div class="big2">${t('journeyDone')}</div>${dhikrHTML('alhamdulillah',true)}<div class="row"><button class="btn pri" id="cb">${t('certBtn')}</button><button class="btn" id="cl">${t('close')}</button></div><div class="note">${t('certNote')}</div>`,r=>{r.querySelector('#cb').onclick=certificate;r.querySelector('#cl').onclick=closeSheet;});}
function wrapLines(g,text,maxW){const out=[];const isCJK=/[㐀-鿿]/.test(text);const parts=isCJK?Array.from(text):text.split(' ');let line='';parts.forEach(p=>{const test=line?(isCJK?line+p:line+' '+p):p;if(g.measureText(test).width>maxW&&line){out.push(line);line=p;}else line=test;});if(line)out.push(line);return out;}
function certificate(){const W=1080,H=1350,[c,g]=mkC(W,H);g.fillStyle='#fbfaf6';g.fillRect(0,0,W,H);g.strokeStyle='#0b6b52';g.lineWidth=10;g.strokeRect(40,40,W-80,H-80);g.strokeStyle='#b98d36';g.lineWidth=3;g.strokeRect(62,62,W-124,H-124);
 for(let x=120;x<W-80;x+=120){star8(g,x,110,22);g.strokeStyle='#b98d36';g.stroke();star8(g,x,H-110,22);g.stroke();}
 g.fillStyle='#0a0a0a';g.fillRect(W/2-70,170,140,150);g.fillStyle='#d4ad55';g.fillRect(W/2-70,205,140,18);
 g.textAlign='center';g.direction=AR?'rtl':'ltr';const kufi='"Noto Kufi Arabic","Noto Sans SC",sans-serif',naskh='"Noto Naskh Arabic","Noto Sans SC",sans-serif';
 g.fillStyle='#0b6b52';g.font='700 66px '+kufi;g.fillText(t('certTitle'),W/2,420);
 g.fillStyle='#5d6b66';g.font='32px '+naskh;let ds='';try{ds=new Date().toLocaleDateString(LOCALE,{year:'numeric',month:'long',day:'numeric'});}catch(e){}g.fillText(ds+' · '+PT.hijri(new Date(),LANG).text,W/2,480);
 g.fillStyle='#17221f';g.font='44px '+naskh;let y=600;wrapLines(g,t('certLine'),W-240).forEach(l=>{g.fillText(l,W/2,y);y+=72;});
 if(me&&me.show_name){g.fillStyle='#b98d36';g.font='700 52px '+kufi;g.fillText(me.name,W/2,y+50);y+=110;}
 g.direction='rtl';g.fillStyle='#0b6b52';g.font='54px '+naskh;g.fillText(window.TALBIYAH.ar.split('،')[0],W/2,y+90);
 g.direction=AR?'rtl':'ltr';g.fillStyle='#5d6b66';g.font='28px '+naskh;g.fillText(t('certNote'),W/2,H-190);g.fillText('مكة في السحاب · 云上麦加',W/2,H-145);
 try{const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='hajj-simulation.png';document.body.appendChild(a);a.click();a.remove();}catch(_){}}

/* ---------- menu ---------- */
const SCENES=['haram','mina','arafat','muzdalifah','jamarat'];const scName=id=>t('sc'+id[0].toUpperCase()+id.slice(1));
const PLACE_KEYS={gate:'pGate',kaaba:'pKaaba',stone:'pStone',maqam:'pMaqam',rows:'pRows',safa:'pSafa',marwa:'pMarwa',sughra:'lblSughra',wusta:'lblWusta',aqabah:'lblAqabah'};
function openMenu(){const S=cur;openSheet(t('menuT'),`<div class="sec" style="margin-top:0">${t('scenesT')}</div><div class="tele">${SCENES.map(id=>`<button class="btn ${S&&S.id===id?'pri':''}" data-sc="${id}">${scName(id)}</button>`).join('')}</div>
 ${S&&S.menu&&S.menu.length>1?`<div class="sec">${t('goT')} · ${scName(S.id)}</div><div class="tele">${S.menu.map(k=>`<button class="btn" data-pl="${k}">${t(PLACE_KEYS[k]||'pGate')}</button>`).join('')}</div>`:''}
 <div class="sec">${t('toolsH')}</div><div class="tele"><button class="btn" data-go="req">📋 ${t('tReq')}</button><button class="btn" data-go="gallery">🖼 ${t('tGallery')}</button><button class="btn" data-go="journey">🕋 ${t('jT')}</button><button class="btn" data-go="support">🤍 ${t('support')}</button></div>
 <div class="sec">${t('mSettings')}</div><div class="row" style="justify-content:flex-start"><button class="btn" id="mlang">🌐 ${t('other')}</button><button class="btn" id="mamb">🔊 ${t('mAmbient')} · ${audioOn?t('mOn'):t('mOff')}</button></div>
 <div class="note"><a href="/privacy.html">${t('privacy')}</a><br>${t('disclaimer')}</div>`,root=>{
 root.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>goScene(b.dataset.sc,'spawn'));root.querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>goScene(S.id,b.dataset.pl));
 root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>goDo(b.dataset.go));root.querySelector('#mlang').onclick=switchLang;root.querySelector('#mamb').onclick=()=>{setAudio(!audioOn);store.set('amb',audioOn);openMenu();};});}
$('#menubtn').onclick=openMenu;
function goDo(kind){if(kind==='journey')return openJourney();if(kind==='salah')return openSalah();if(kind==='tasbih')return openTasbih();if(kind==='wall')return openWall();if(kind==='quran')return openQuran();if(kind==='req')return openReq();if(kind==='gallery')return openGallery();if(kind==='support')return openSupport();}
document.querySelectorAll('#dock [data-go]').forEach(b=>b.onclick=e=>{e.stopPropagation();goDo(b.dataset.go);});

/* ---------- audio: soft wind/crowd murmur (no music) + gentle chimes ---------- */
let ac=null,master=null,audioOn=false;
function initAudio(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
 const len=ac.sampleRate*6,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}
 const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420;bp.Q.value=.6;const g=ac.createGain();g.gain.value=.6;const lfo=ac.createOscillator();lfo.frequency.value=.09;const lg=ac.createGain();lg.gain.value=.2;lfo.connect(lg);lg.connect(g.gain);src.connect(bp);bp.connect(g);g.connect(master);src.start();lfo.start();}
function setAudio(on){initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();audioOn=on;master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(on?.45:0,ac.currentTime+1.5);}
function chime(f,vol){if(!ac)initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();vol=vol||.2;const t0=ac.currentTime;[[1,1],[2,.25]].forEach(([m,a])=>{const o=ac.createOscillator();o.type='sine';o.frequency.value=f*m;const g=ac.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol*a,t0+.015);g.gain.exponentialRampToValueAtTime(.0001,t0+1.4/m);o.connect(g);g.connect(ac.destination);o.start(t0);o.stop(t0+1.8);});}

/* ---------- loop ---------- */
const clock=new THREE.Clock();let lastZone='',hintT=0;
function update(dt){
 if(anim){anim.t+=dt/anim.dur;const k=Math.min(1,anim.t),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const a=anim.from,b=anim.to;P.x=a.x+(b.x-a.x)*e;P.z=a.z+(b.z-a.z)*e;P.eye=a.eye+(b.eye-a.eye)*e;P.yaw=angLerp(a.yaw,b.yaw,e);P.pitch=a.pitch+(b.pitch-a.pitch)*e;if(k>=1){const th=anim.then;anim=null;th&&th();}}
 else if(auto){auto.t+=dt*auto.speed;const k=Math.min(1,auto.t/auto.dur);const p=auto.fn(k);P.x=p.x;P.z=p.z;P.yaw=angLerp(P.yaw,p.yaw,Math.min(1,dt*5));P.eye=1.65;P.pitch+=(.06-P.pitch)*Math.min(1,dt*3);P.bob+=dt*8*Math.min(2,auto.speed);auto.onStep&&auto.onStep(k);if(k>=1){const d=auto.done;auto=null;P.mode='walk';d&&d();}}
 else if(P.mode==='walk'){let f=0,s=0;if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyA||keys.ArrowLeft)s-=1;if(keys.KeyD||keys.ArrowRight)s+=1;f-=jy;s+=jx;
  const mag=Math.hypot(f,s);if(mag>.05){const run=keys.ShiftLeft||keys.ShiftRight||mag>.97;if(mag>1){f/=mag;s/=mag;}const sp=(run?6:2.8)*dt;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);const dx=(-sy*f+cy*s)*sp,dz=(-cy*f-sy*s)*sp;
   if(!blocked(P.x+dx,P.z))P.x+=dx;if(!blocked(P.x,P.z+dz))P.z+=dz;P.bob+=dt*Math.min(1,mag)*(run?11:8);}P.eye+=(1.65-P.eye)*Math.min(1,dt*6);}
 else if(P.mode==='locked'){if(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||Math.abs(jx)+Math.abs(jy)>.5){if(!sheetOpen)standUp();}}
 camera.position.set(P.x,P.eye+((P.mode==='walk'||P.mode==='auto')?Math.sin(P.bob)*.025:0),P.z);camera.rotation.set(P.pitch,P.yaw,0);
 curSpot=null;if(cur&&P.mode==='walk'&&!anim){for(const sp of cur.spots){if(sp.test(P.x,P.z)){curSpot=sp;break;}}}renderActions();
 if(cur){const z=P.mode==='locked'?t('zSahn'):cur.zone(P.x,P.z);if(z!==lastZone){lastZone=z;$('#zone').textContent=z;}if(cur.update)cur.update(dt);}
 sky.position.copy(camera.position);pebbleTick(dt);
 if(hintT>0){hintT-=dt;if(hintT<=0)$('#hint').style.opacity=0;}const now=performance.now();netTick(now,dt);pillTick(now);}
let fpsN=0,fpsT=performance.now(),frameN=0,lowQ=false;
function adapt(now){fpsN++;const el=now-fpsT;if(el<2000)return;const fps=fpsN*1000/el;fpsN=0;fpsT=now;if(document.hidden)return;
 if(fps<40&&PR>.5){PR=Math.max(.5,PR*.8);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}else if(fps>57&&PR<MAX_PR){PR=Math.min(MAX_PR,PR*1.1);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}
 if(fps<24&&PR<=.5&&!lowQ){lowQ=true;Object.values(SC).forEach(S=>{S.group.traverse(o=>{if(o.isInstancedMesh&&o.geometry===FIG)o.count=Math.floor(o.count*.5);});});}}
let introOn=true;
function loop(){requestAnimationFrame(loop);const now=performance.now();const dt=Math.min(.05,clock.getDelta());if(introOn)return;update(dt);frameN++;
 const idle=sheetOpen&&!anim&&!auto&&P.mode!=='walk'&&!pebbles.length;if(idle&&frameN%3)return;renderer.render(scene,camera);adapt(now);}

/* ---------- start ---------- */
loop();connect();loadConfig();refreshToday();loadMe().then(checkReturn);
fontsReady().then(()=>{if(!cur){const S=ensure('haram');cur=S;S.group.visible=true;applySky(S);const p=S.places.spawn;P.x=p.x;P.z=p.z;P.yaw=p.yaw;}$('#loading').textContent=sb?t('connecting'):'';});
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
let deferredPrompt=null;const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installLink').style.display='inline';});if(isIOS&&!standalone)$('#installLink').style.display='inline';
$('#installLink').onclick=e=>{e.preventDefault();if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;}else if(isIOS)toast(t('iosInstall'));};
function begin(kind,step){introOn=false;$('#intro').classList.add('hide');document.body.classList.add('in');if(store.get('amb',false))setAudio(true);else initAudio();
 if(!cur){const S=ensure('haram');cur=S;S.group.visible=true;applySky(S);}
 if(resume){const r=resume;resume=null;setTimeout(()=>finishOrder(r.id,r.kind),500);return;}
 if(step){goScene(SM[step].scene,SM[step].at,()=>openStep(step,false));return;}
 if(kind&&kind!=='explore'){goDo(kind);return;}
 const h=$('#hint');h.textContent=t(isTouch?'hintTouch':'hintDesk');h.style.opacity=1;hintT=7;const p=cur.places.spawn;P.mode='anim';P.x=p.x;P.z=p.z+6;P.yaw=p.yaw;moveTo({x:p.x,z:p.z,eye:1.65,yaw:p.yaw,pitch:.12},2.2,()=>{P.mode='walk';});}
document.querySelectorAll('#intro [data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();begin(b.dataset.go);});
document.querySelectorAll('#intro [data-step]').forEach(b=>b.onclick=()=>begin(null,b.dataset.step));
window.__mecca={P,goScene,openStep,openJourney,openSalah,openTasbih,openQuran,openReq,openGallery,openStoning,SC,get cur(){return cur;}};
})();
