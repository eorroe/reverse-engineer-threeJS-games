// This is the only owner of persisted SSR settings. UI drafts stay outside the
// store until Apply; opening a panel or repairing a read never writes storage.
export const SETTINGS_KEY = 'super-smash-royale.settings.v1';
export const LEGACY_MUTE_KEY = 'skybreak-royale.muted';
export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume:.7, musicVolume:.3, effectsVolume:.75, voiceVolume:.65,
  muted:false, sensitivity:1, invertY:false, aimAssist:true, alwaysRadar:false,
  gamepadEnabled:true, gamepadLayout:'default', gamepadSensitivity:4, gamepadDeadzone:.12, gamepadInvertY:false, gamepadVibration:true,
});
export default DEFAULT_SETTINGS;

const fields = Object.keys(DEFAULT_SETTINGS);
const ranges = Object.freeze({masterVolume:[0,1],musicVolume:[0,1],effectsVolume:[0,1],voiceVolume:[0,1],sensitivity:[.2,3],gamepadSensitivity:[1,10],gamepadDeadzone:[0,.4]});
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function normalize(value,base,{strict=false}={}) {
  if(!isRecord(value)) {
    if(strict) throw new TypeError('Settings update must be an object.');
    return {settings:base,invalidFields:['$record'],normalized:false};
  }
  const next={...base}, invalidFields=[];let normalized=false;
  for(const key of fields) {
    if(!own(value,key)) continue;
    const descriptor=Object.getOwnPropertyDescriptor(value,key),input=descriptor?.value;
    const valid=!!descriptor&&own(descriptor,'value')&&(key==='gamepadLayout'?['default','tactical'].includes(input):ranges[key]?typeof input==='number'&&Number.isFinite(input):typeof input==='boolean');
    if(!valid) {
      if(strict) throw new TypeError(`Invalid setting: ${key}.`);
      invalidFields.push(key);continue;
    }
    next[key]=ranges[key]?Math.max(ranges[key][0],Math.min(ranges[key][1],input)):input;
    if(next[key]!==input) normalized=true;
  }
  return {settings:Object.freeze(next),invalidFields,normalized};
}
const sameSettings=(a,b)=>fields.every(key=>a[key]===b[key]);

/**
 * snapshot() is immutable settings only. status() describes the initial read
 * and latest write separately. A failed write keeps the user's in-memory choice.
 * subscribe(fn) calls fn(snapshot,status) after an explicit update/reset, never
 * on registration. Subscriber exceptions are isolated and counted in status().
 */
export function createSettingsStore({storage}={}) {
  let target=storage,unavailable=false;
  if(target===undefined) { try {target=globalThis.localStorage;} catch {unavailable=true;} }
  let current=DEFAULT_SETTINGS;
  let metadata={source:'defaults',read:'missing',write:'not-requested',legacyImported:false,normalized:false,invalidFields:Object.freeze([]),notificationErrors:0,disposed:false};
  try {
    if(unavailable||!target||typeof target.getItem!=='function') throw Error('Storage unavailable.');
    const raw=target.getItem(SETTINGS_KEY);
    if(raw===null) {
      const legacy=target.getItem(LEGACY_MUTE_KEY);
      if(legacy==='true'||legacy==='false') {current=Object.freeze({...DEFAULT_SETTINGS,muted:legacy==='true'});metadata.source='legacy';metadata.legacyImported=true;}
    } else {
      let decoded;
      try {if(typeof raw!=='string')throw Error('Invalid stored settings.');decoded=JSON.parse(raw);} catch {decoded=null;}
      const result=normalize(decoded,DEFAULT_SETTINGS);
      current=result.settings;metadata={...metadata,source:'stored',read:result.invalidFields.length?'invalid':'loaded',normalized:result.normalized,invalidFields:Object.freeze(result.invalidFields)};
    }
  } catch {metadata.read='unavailable';}
  let status=Object.freeze(metadata),disposed=false,notifying=false;
  const listeners=new Set(),events=[];
  const requireActive=()=>{if(disposed)throw Error('Settings store is disposed.');};
  function notify() {
    if(notifying)return;notifying=true;
    try {
      while(events.length&&!disposed) {
        const event=events.shift();
        for(const listener of [...listeners]) {
          if(disposed)break;if(!listeners.has(listener))continue;
          try {listener(event.settings,event.status);} catch {status=Object.freeze({...status,notificationErrors:status.notificationErrors+1});}
        }
      }
    } finally {notifying=false;}
  }
  function apply(value,source) {
    requireActive();
    // Normalize completely before changing memory or attempting persistence.
    const result=normalize(value,source==='reset'?DEFAULT_SETTINGS:current,{strict:true});
    const previous=current,previousStatus=status;current=sameSettings(current,result.settings)?current:result.settings;
    let write='unavailable';
    try {if(target&&typeof target.setItem==='function') {target.setItem(SETTINGS_KEY,JSON.stringify(current));write='saved';}}
    catch {write='failed';}
    status=Object.freeze({...status,source,write,normalized:result.normalized});
    if(previous!==current||JSON.stringify(previousStatus)!==JSON.stringify(status))events.push({settings:current,status});
    notify();return current;
  }
  return Object.freeze({
    snapshot:()=>current,
    status:()=>status,
    update:partial=>apply(partial,'applied'),
    reset:()=>apply(DEFAULT_SETTINGS,'reset'),
    subscribe(listener) {requireActive();if(typeof listener!=='function')throw new TypeError('Settings subscriber must be a function.');listeners.add(listener);return()=>listeners.delete(listener);},
    dispose() {if(disposed)return;disposed=true;listeners.clear();events.length=0;status=Object.freeze({...status,disposed:true});},
  });
}
