/* 云上麦加 · prayer times, qibla & hijri date (astronomical formulas after PrayTimes.org, simplified). */
(function(root){
'use strict';
const D2R=Math.PI/180,R2D=180/Math.PI;
const sin=d=>Math.sin(d*D2R),cos=d=>Math.cos(d*D2R),tan=d=>Math.tan(d*D2R);
const asin=x=>R2D*Math.asin(x),acos=x=>R2D*Math.acos(x),atan2=(y,x)=>R2D*Math.atan2(y,x),acot=x=>R2D*Math.atan(1/x);
const fix=(a,b)=>{a=a-b*Math.floor(a/b);return a<0?a+b:a;};
const METHODS={MWL:{fajr:18,isha:17},ISNA:{fajr:15,isha:15},Egypt:{fajr:19.5,isha:17.5},Makkah:{fajr:18.5,ishaMin:90},Karachi:{fajr:18,isha:18}};
const KAABA=[21.4225,39.8262];
function julian(y,m,d){if(m<=2){y-=1;m+=12;}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5;}
function sunPos(jd){const D=jd-2451545,g=fix(357.529+.98560028*D,360),q=fix(280.459+.98564736*D,360),L=fix(q+1.915*sin(g)+.020*sin(2*g),360),e=23.439-.00000036*D;
 const RA=fix(atan2(cos(e)*sin(L),cos(L))/15,24);return{decl:asin(sin(e)*sin(L)),eqt:q/15-RA};}
/* returns UTC Date objects for the given local calendar day at lat/lng */
function compute(y,m,d,lat,lng,method,asrFactor){
 const M=METHODS[method]||METHODS.MWL,jd0=julian(y,m,d)-lng/(15*24);
 const midDay=t=>fix(12-sunPos(jd0+t).eqt,24);
 const angleTime=(ang,t,ccw)=>{const decl=sunPos(jd0+t).decl,noon=midDay(t);const T=acos((-sin(ang)-sin(decl)*sin(lat))/(cos(decl)*cos(lat)))/15;return noon+(ccw?-T:T);};
 const asrTime=(f,t)=>{const decl=sunPos(jd0+t).decl;return angleTime(-acot(f+tan(Math.abs(lat-decl))),t);};
 let tm={fajr:5,sunrise:6,dhuhr:12,asr:13,sunset:18,isha:18};
 for(let it=0;it<2;it++){const p={};for(const k in tm)p[k]=(isNaN(tm[k])?12:tm[k])/24;
  tm={fajr:angleTime(M.fajr,p.fajr,true),sunrise:angleTime(.833,p.sunrise,true),dhuhr:midDay(p.dhuhr),asr:asrTime(asrFactor||1,p.asr),sunset:angleTime(.833,p.sunset),isha:M.isha!=null?angleTime(M.isha,p.isha):NaN};}
 if(isNaN(tm.sunrise)||isNaN(tm.sunset))return null; // polar day/night
 if(M.ishaMin)tm.isha=tm.sunset+M.ishaMin/60;
 const night=24-(tm.sunset-tm.sunrise);
 const adj=(time,base,angle,ccw)=>{const portion=angle/60*night;const diff=ccw?base-time:time-base;return(isNaN(time)||diff>portion)?base+(ccw?-portion:portion):time;};
 tm.fajr=adj(tm.fajr,tm.sunrise,M.fajr,true);if(!M.ishaMin)tm.isha=adj(tm.isha,tm.sunset,M.isha,false);
 tm.maghrib=tm.sunset;
 const base=Date.UTC(y,m-1,d),out={};
 ['fajr','sunrise','dhuhr','asr','maghrib','isha'].forEach(k=>{if(isNaN(tm[k])){out[k]=null;return;}const h=tm[k]-lng/15;out[k]=new Date(base+Math.round(h*3600)*1000);});
 return out;}
function ymdIn(tz,date){try{const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const g=k=>+p.find(x=>x.type===k).value;return[g('year'),g('month'),g('day')];}
 catch(e){return[date.getFullYear(),date.getMonth()+1,date.getDate()];}}
function day(loc,date,method,asr){const[y,m,d]=ymdIn(loc.tz,date);return compute(y,m,d,loc.lat,loc.lng,method,asr);}
const ORDER=['fajr','dhuhr','asr','maghrib','isha'];
function next(loc,method,asr,now){now=now||new Date();const a=day(loc,now,method,asr);
 if(a)for(const k of ORDER){if(a[k]&&a[k]>now)return{key:k,at:a[k],today:a};}
 const b=day(loc,new Date(now.getTime()+864e5),method,asr);return b&&b.fajr?{key:'fajr',at:b.fajr,today:a}:null;}
function qibla(lat,lng){const dl=KAABA[1]-lng;return fix(atan2(sin(dl),cos(lat)*tan(KAABA[0])-sin(lat)*cos(dl)),360);}
function distKm(lat,lng){const dLat=(KAABA[0]-lat)*D2R,dLng=(KAABA[1]-lng)*D2R;const a=Math.sin(dLat/2)**2+Math.cos(lat*D2R)*Math.cos(KAABA[0]*D2R)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
const LOC={zh:'zh-CN',ar:'ar-SA',en:'en'};
function hijri(date,lang){const loc=(LOC[lang]||'en')+'-u-ca-islamic-umalqura';let s='',month=0;
 try{s=new Intl.DateTimeFormat(loc,{day:'numeric',month:'long',year:'numeric'}).format(date);}catch(e){}
 try{const p=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{month:'numeric'}).formatToParts(date);month=+(p.find(x=>x.type==='month')||{}).value||0;}catch(e){}
 return{text:s,month};}
function fmt(date,tz,lang){if(!date)return'—';try{return date.toLocaleTimeString(lang==='zh'?'zh-CN':lang==='ar'?'ar-SA':'en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:tz});}catch(e){return date.toTimeString().slice(0,5);}}
function nextArafah(from){const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{month:'numeric',day:'numeric'});let d=new Date(from||Date.now());d.setHours(12,0,0,0);
 for(let i=0;i<400;i++){try{const p=f.formatToParts(d);const m=+p.find(x=>x.type==='month').value,dd=+p.find(x=>x.type==='day').value;if(m===12&&dd===9)return new Date(d);}catch(e){return null;}d=new Date(d.getTime()+864e5);}return null;}
root.PT={nextArafah,compute,day,next,qibla,distKm,hijri,fmt,ymdIn,METHODS,ORDER};
})(typeof window!=='undefined'?window:globalThis);
