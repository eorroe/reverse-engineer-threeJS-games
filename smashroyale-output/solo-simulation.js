import {createSoloSharedDecoder} from './solo-shared-state.js';
// Structured cloning changes object identity even when stationary loot is
// unchanged. Preserve those identities so presentation caches and accumulated
// turns survive worker snapshots. Compare every field, including weapon data;
// moved, collected or replaced items must use their new snapshot.
function sameLootValue(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);if(keys.length!==Object.keys(b).length)return false;
 for(const key of keys)if(!Object.hasOwn(b,key)||!sameLootValue(a[key],b[key]))return false;
 return true;
}
export function shareUnchangedSoloLoot(previous,next){
 if(previous===next)return next;
 if(!Array.isArray(previous)||!Array.isArray(next))return next;
 const items=new Map(previous.map(item=>[item.id,item]));
 return next.map(item=>{const before=items.get(item.id);return before&&sameLootValue(before,item)?before:item;});
}
// A small display delay gives the physics worker time to finish each fixed
// step. It preserves interpolation instead of tying drawing to CPU completion.
export class SoloSimulation {
 constructor({WorkerClass=globalThis.Worker,delayMs=1000/30,onError=()=>{}}={}){
  this.worker=new WorkerClass(new URL('./solo-simulation-worker.js',import.meta.url),{type:'module',name:'Solo physics'});
  this.delayMs=delayMs;this.onError=onError;this.epoch=0;this.queue=[];this.active=false;this.lastAt=null;this.expectedTick=null;this.disposed=false;
  this.sharedState=createSoloSharedDecoder();
  this.worker.onmessage=({data})=>{
   if(this.disposed||data.epoch!==this.epoch)return;
   if(data.kind==='ready'){this.ready?.resolve();this.ready=null;return;}
   if(data.kind==='error'){this.fail(Error(data.message));return;}
   if(data.kind!=='step'||!this.active)return;
   if(data.state?.tick!==this.expectedTick||!Number.isFinite(data.at)||this.queue.length>=8){this.fail(Error('Physics worker step order invalid'));return;}
   try{if(data.shared)data.state=this.sharedState.decode(data.state,data.shared);}catch(error){this.fail(error);return;}
   this.expectedTick++;this.queue.push(data);
  };
  this.worker.onerror=event=>this.fail(Error(event.message||'Physics worker failed'));
 }
 fail(error){this.ready?.reject(error);this.ready=null;this.stop();this.onError(error);}
 reset(state){
  this.epoch++;this.queue.length=0;this.lastAt=null;this.expectedTick=state.tick+1;
  this.sharedState.reset();
  this.lastLoot=state.loot;
  this.worker.postMessage({kind:'reset',epoch:this.epoch,state});
 }
 prepare(state){
  if(this.disposed)return Promise.reject(Error('Physics worker disposed'));
  this.ready?.reject(new DOMException('Preparation replaced','AbortError'));
  const ready=new Promise((resolve,reject)=>{this.ready={resolve,reject};});this.active=false;this.reset(state);return ready;
 }
 start(state){this.reset(state);this.active=true;this.worker.postMessage({kind:'start',epoch:this.epoch});}
 input(input){if(this.active)this.worker.postMessage({kind:'input',epoch:this.epoch,input});}
 take(now){
  const target=now-this.delayMs,rows=[];
  while(this.queue.length&&this.queue[0].at<=target){const row=this.queue.shift();row.state.loot=shareUnchangedSoloLoot(this.lastLoot,row.state.loot);this.lastLoot=row.state.loot;rows.push(row);this.lastAt=row.at;this.worker.postMessage({kind:'ack',epoch:this.epoch});}
  return {rows,alpha:this.lastAt===null?1:Math.max(0,Math.min(1,(target-this.lastAt)/(1000/60)))};
 }
 stop(){if(this.disposed)return;this.ready?.reject(new DOMException('Physics preparation cancelled','AbortError'));this.ready=null;this.worker.postMessage({kind:'stop',epoch:this.epoch});this.epoch++;this.active=false;this.queue.length=0;this.lastAt=null;}
 dispose(){if(this.disposed)return;this.stop();this.disposed=true;this.ready?.reject(new DOMException('Physics worker disposed','AbortError'));this.ready=null;this.worker.terminate();}
}
