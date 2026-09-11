import {readDevicePolicy} from './device-policy.js';
const loadRoute=path=>path==='./mobile-gallery.js'?import('./mobile-gallery.js'):import('./main.js');

export function loadDesktopStyles(document){
 return Promise.all(['combat-hud.css','controller.css'].map(file=>new Promise(resolve=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../'+file,import.meta.url).href;
  // As with ordinary head styles, a failed stylesheet does not block entry.
  link.onload=link.onerror=()=>{link.onload=link.onerror=null;resolve();};document.head.insertBefore(link,document.querySelector('script[type="importmap"]'));
 })));
}

// Decide before importing desktop modules or starting background match work.
export async function startDeviceEntry({host=globalThis,policy=readDevicePolicy(host),loadModule=loadRoute,loadStyles=()=>loadDesktopStyles(host.document)}={}){
 host.document?.documentElement?.setAttribute('data-device-mode',policy.galleryOnly?'gallery':'desktop');
 if(!policy.galleryOnly)await loadStyles();
 return loadModule(policy.galleryOnly?'./mobile-gallery.js':'./main.js');
}
if(typeof window!=='undefined'&&typeof document!=='undefined')void startDeviceEntry().catch(error=>{
 console.error('Entry could not start',error);
 const status=document.getElementById('loading');if(status)status.textContent='This page could not start. Reload to try again.';
});
