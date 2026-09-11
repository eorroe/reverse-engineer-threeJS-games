import {createPrivateLobbyUI} from './private-lobby-ui.js';
import {inviteLobbyId} from './private-lobby-state.js';

/** Entry plumbing owns only its added screen. The solo button retains the
 * existing game handler, and the caller owns the multiplayer match runtime. */
export function installPrivateLobbyEntry({
 document=globalThis.document, soloButton, entryGate, entryTitle,
 createTransport, getPlayableCharacters, createPicker, renderMap,
 prepareMatch, onStarted, onSnapshot, onReplayReady, onOpen=()=>{}, onLeave=()=>{}, onCue=()=>{}, onAnnounce=()=>{}, onGesture=()=>{}, onStateChange=()=>{}, onError=()=>{},
 initialUsername=()=>'', saveUsername=()=>{}, isReady=()=>true,
 href=document.defaultView.location.href,
}={}) {
 if(!soloButton||!entryGate||!createTransport)throw new TypeError('Private lobby entry requires its existing solo surface and configured transport');
 let disposed=false,active=null,opening=false,generation=0,ready=false;
 const host=document.createElement('section');host.id='private-lobby';host.hidden=true;document.body.append(host);
 const existingButton=document.getElementById('host-private-lobby'),button=existingButton??document.createElement('button');button.id='host-private-lobby';button.type='button';button.textContent='Host private lobby';button.disabled=true;button.setAttribute('aria-busy','true');if(!existingButton)soloButton.after(button);
 const status=document.createElement('p');status.className='pl-entry-status';status.setAttribute('role','status');status.hidden=true;button.after(status);
 const prior={label:soloButton.textContent,title:entryTitle?.textContent};
 const abort=new AbortController();
 function hide(){host.hidden=true;entryGate.inert=false;active=null;opening=false;button.disabled=!ready;onLeave();button.focus();}
 async function open(){
  if(disposed||opening||active||!ready||!isReady())return;
  opening=true;const token=++generation;button.disabled=true;status.hidden=false;status.textContent='Preparing your lobby…';
  try{
   const characters=await getPlayableCharacters({signal:abort.signal});if(disposed||token!==generation)return;
   const transport=createTransport();host.hidden=false;entryGate.inert=true;onOpen();
   active=createPrivateLobbyUI(host,{transport,playableCharacters:characters,href,createPicker,renderMap,prepareMatch,onStarted,onSnapshot,onReplayReady,onLeave:hide,onCue,onAnnounce,onGesture,onStateChange,onError,initialUsername:initialUsername(),saveUsername});status.hidden=true;
  }catch{if(!disposed){status.textContent='Private lobbies could not open. Try again.';status.hidden=false;host.hidden=true;entryGate.inert=false;}}
  finally{opening=false;if(!disposed)button.disabled=!ready||!!active;}
 }
 button.addEventListener('click',open);
 const api={
  enable(){if(disposed)return;ready=true;button.disabled=false;button.setAttribute('aria-busy','false');soloButton.textContent='Play solo';if(entryTitle)entryTitle.textContent='Choose how you play.';if(inviteLobbyId(href))void open();},
  open,
  async leave(){if(disposed)return;if(active)await active.leave();else{generation++;hide();}},
  showSpectator(game){active?.showSpectator(game);},
  get active(){return active;},
  dispose(){if(disposed)return;disposed=true;generation++;abort.abort();active?.dispose();active=null;button.removeEventListener('click',open);if(existingButton){button.disabled=true;button.setAttribute('aria-busy','false');}else button.remove();status.remove();host.remove();entryGate.inert=false;if(soloButton.textContent==='Play solo')soloButton.textContent=prior.label;if(entryTitle?.textContent==='Choose how you play.')entryTitle.textContent=prior.title;}
 };
 return api;
}

export async function loadLobbyPortraits({ids,loadRegistry,fetchAsset=fetch,catalogueURL,signal}={}) {
 const [registry,response]=await Promise.all([loadRegistry({signal}),fetchAsset(catalogueURL,{signal})]);
 if(!response.ok)throw Error('Fighter portraits could not load');
 const catalogue=await response.json(),portraits=new Map(catalogue.rows.map(row=>[row.id,row]));
 const allowed=new Set(ids);
 return registry.rows.filter(row=>allowed.has(row.id)&&row.availability.combat).map(row=>{
  const portrait=portraits.get(row.id);if(!portrait||portrait.name!==row.name)throw Error('Fighter portrait identity differs');
  const url=new URL(portrait.portrait,catalogueURL);if(url.origin!==new URL(catalogueURL).origin)throw Error('Fighter portrait origin differs');
  return{id:row.id,name:row.name,portrait:url.href};
 });
}

export function abortableReady(promise,signal){
 if(signal?.aborted)return Promise.reject(new DOMException('Loading cancelled','AbortError'));
 return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(new DOMException('Loading cancelled','AbortError'));},cleanup=()=>signal?.removeEventListener('abort',abort);signal?.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});
}
