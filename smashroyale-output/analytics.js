import { EVENTS, MAX_BATCH, MAX_BYTES, UUID, sanitizeProperties } from './analytics-schema.js';
export { EVENTS } from './analytics-schema.js';

// Explicit events, small batches, and a 15-second timer. No SDK, autocapture, replay,
// canvas reads, raw URLs, names, email, controller IDs, or work in the render loop.
export function createAnalytics({win=globalThis.window,doc=globalThis.document,now=()=>Date.now(),randomUUID=()=>globalThis.crypto.randomUUID(),fetcher=globalThis.fetch?.bind(globalThis)}={}) {
  const health={initialized:false,disabled:false,queued:0,sent:0,dropped:0,errors:0,lastEvent:null,autocapture:false,replay:false};
  let automated=false;
  let identity,session,context={},match=null,queue=[],timer=null,inflight=false,lastClock=now(),playing=false,visibility=true;
  const read=(storage,key)=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};
  const write=(storage,key,value)=>{try{storage?.setItem(key,JSON.stringify(value));}catch{/* Private-mode storage still gets an in-memory identity. */}};
  const local=()=>{try{return win.localStorage;}catch{return null;}};
  const tab=()=>{try{return win.sessionStorage;}catch{return null;}};
  function touchSession() {
    const time=now();
    if(!session || time-session.last>30*60000){
      session={id:randomUUID(),last:time};identity.visits=(identity.visits||0)+1;
      write(local(),'ssr_analytics_visitor_v1',identity);
      write(tab(),'ssr_analytics_session_v1',session);
      capture('session_started');
    }else{session.last=time;write(tab(),'ssr_analytics_session_v1',session);}
  }
  function capture(event,properties={}) {
    if(!health.initialized || health.disabled || !EVENTS.includes(event))return false;
    const props=sanitizeProperties({...context,...properties,is_automated:automated,session_id:session.id,returning_visitor:identity.visits>1,visit_number:identity.visits,first_seen_age_days:Math.max(0,Math.floor((now()-identity.first)/86400000))});
    const row={event,uuid:randomUUID(),distinct_id:identity.id,timestamp:new Date(now()).toISOString(),properties:props};
    if(queue.length>=96){health.dropped++;return false;}
    queue.push(row);health.queued=queue.length;health.lastEvent=event;
    return true;
  }
  function advanceClock(){
    const time=now();
    // Timer suspension/sleep is not gameplay. Count at most one ordinary timer interval plus jitter.
    if(match&&playing&&visibility){const delta=Math.max(0,Math.min(20,(time-lastClock)/1000));match.active+=delta;match.delta+=delta;}
    lastClock=time;
  }
  function perfSummary(){
    if(!match?.samples.length)return {};
    const values=[...match.samples].sort((a,b)=>a-b);
    return {fps_avg:match.fpsSum/match.sampleCount,fps_min:match.fpsMin,frame_ms_p95:values[Math.min(values.length-1,Math.ceil(values.length*.95)-1)],performance_samples:match.sampleCount};
  }
  function matchProps(){return {...match.context,match_id:match.id,active_seconds:match.active,active_seconds_delta:Math.min(60,match.delta),duration_seconds:Math.min(86400,(now()-match.start)/1000),...perfSummary()};}
  async function flush({beacon=false}={}) {
    if(!queue.length||health.disabled||inflight)return;
    let count=Math.min(MAX_BATCH,queue.length),payload=JSON.stringify({events:queue.slice(0,count)});
    while(new TextEncoder().encode(payload).length>MAX_BYTES&&count>1){count--;payload=JSON.stringify({events:queue.slice(0,count)});}
    const rows=queue.splice(0,count);health.queued=queue.length;
    if(beacon&&win.navigator?.sendBeacon){
      try {if(win.navigator.sendBeacon('/api/analytics',new Blob([payload],{type:'application/json'}))){health.sent+=count;return;}}catch{health.errors++;}
    }
    inflight=true;
    try {
      const response=await fetcher('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,credentials:'omit',keepalive:true,signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new Error('analytics delivery failed');
      health.sent+=count;
    }catch{health.errors++;queue=[...rows,...queue].slice(0,96);health.queued=queue.length;}
    finally{inflight=false;}
  }
  function heartbeat(){
    if(!health.initialized||health.disabled)return;
    advanceClock();
    if(visibility)touchSession();
    if(match&&match.delta>0&&capture('match_heartbeat',matchProps()))match.delta=0;
    void flush();
  }
  function init({readMatchEnd=()=>({})}={}){
    if(health.initialized||!win||!doc)return;
    health.initialized=true;win.SMASH_ANALYTICS=health;
    const url=new URL(win.location.href);
    health.disabled=url.searchParams.get('analytics')==='0'||win.navigator?.globalPrivacyControl===true||win.navigator?.doNotTrack==='1';
    if(health.disabled)return;
    // Explicit browser automation signal only; never infer from identity or input.
    automated=win.navigator?.webdriver===true;
    identity=read(local(),'ssr_analytics_visitor_v1');
    if(!identity||!UUID.test(identity.id||'')||!Number.isFinite(identity.first))identity={id:randomUUID(),first:now(),visits:0};
    session=read(tab(),'ssr_analytics_session_v1');
    if(!session||!UUID.test(session.id||'')||!Number.isFinite(session.last))session=null;
    const ua=win.navigator?.userAgent||'';
    context={route:url.pathname==='/invite'?'invite':url.pathname==='/'||url.pathname==='/index.html'?'home':'other',arrived_via_invite:url.pathname==='/invite'||url.searchParams.has('join')||url.searchParams.has('lobby'),device_type:/iPad|Tablet/i.test(ua)?'tablet':/Mobile|Android/i.test(ua)?'mobile':'desktop',browser:/Edg\//.test(ua)?'edge':/Firefox\//.test(ua)?'firefox':/Chrome\//.test(ua)?'chrome':/Safari\//.test(ua)?'safari':'other',os:/iPhone|iPad/.test(ua)?'ios':/Android/.test(ua)?'android':/Windows/.test(ua)?'windows':/Mac/.test(ua)?'macos':/Linux/.test(ua)?'linux':'other'};
    for(const key of ['utm_source','utm_medium','utm_campaign'])context[key]=url.searchParams.get(key);
    try{const ref=new URL(doc.referrer);if(ref.hostname!==url.hostname)context.referrer_domain=ref.hostname.toLowerCase();}catch{/* Direct arrival. */}
    context=sanitizeProperties(context);visibility=doc.visibilityState!=='hidden';lastClock=now();
    touchSession();capture('page_view');
    doc.addEventListener('visibilitychange',()=>{advanceClock();visibility=doc.visibilityState!=='hidden';if(!visibility){if(match&&match.delta>0&&capture('match_heartbeat',matchProps()))match.delta=0;void flush({beacon:true});}else touchSession();});
    win.addEventListener('pagehide',event=>{if(event.persisted){heartbeat();return;}let result={};try{result=readMatchEnd();}catch{health.errors++;}endMatch({...result,reason:'pagehide'});void flush({beacon:true});});
    timer=win.setInterval(heartbeat,15000);void flush();
  }
  function startMatch(properties={}){
    if(!health.initialized||health.disabled)return;
    if(match)endMatch({reason:'restart'});
    touchSession();lastClock=now();playing=true;
    match={id:randomUUID(),start:now(),active:0,delta:0,context:sanitizeProperties(properties),samples:[],sampleCount:0,fpsSum:0,fpsMin:1000};
    capture('match_started',matchProps());void flush();
  }
  function endMatch(properties={}){
    if(!match)return false;
    advanceClock();capture('match_ended',{...matchProps(),...sanitizeProperties(properties)});match=null;playing=false;return true;
  }
  return {health,init,track:(event,properties)=>{if(health.initialized&&!health.disabled)touchSession();return capture(event,properties);},setContext:properties=>{context={...context,...sanitizeProperties(properties)};},startMatch,endMatch,heartbeat,flush,
    setPlaying(value){advanceClock();playing=!!value;},
    samplePerformance({fps,frame_ms}={}){if(!match||!playing||!visibility||!Number.isFinite(fps)||fps<=0||fps>1000)return;match.sampleCount++;match.fpsSum+=fps;match.fpsMin=Math.min(match.fpsMin,fps);match.samples.push(Number.isFinite(frame_ms)&&frame_ms>0?Math.min(10000,frame_ms):1000/fps);if(match.samples.length>120)match.samples.shift();},
    dispose(){endMatch({reason:'quit'});if(timer)win.clearInterval(timer);void flush({beacon:true});},
  };
}
export const analytics=createAnalytics();
