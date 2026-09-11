// Shared, fail-closed event contract. No names, email, lobby codes, URLs or free text.
export const EVENTS = Object.freeze(['page_view','session_started','menu_ready','match_requested','match_started','match_heartbeat','match_ended','character_selected','input_changed','match_load_failed','runtime_error']);
export const MAX_BATCH = 32;
export const MAX_BYTES = 32768;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const characters = new Set('mario donkey-kong link samus yoshi kirby fox pikachu luigi ness captain-falcon jigglypuff peach bowser popo nana sheik zelda dr-mario pichu falco marth young-link ganondorf mewtwo roy mr-game-and-watch meta-knight pit zero-suit-samus wario snake ike squirtle ivysaur charizard diddy-kong lucas sonic king-dedede olimar lucario rob toon-link wolf'.split(' '));
const enums = {
  mode: ['solo','private'], input_device: ['keyboard','keyboard-mouse','gamepad','touch','unknown'],
  controller_layout: ['default','tactical','unknown'], controller_kind: ['xbox','playstation','nintendo','generic','unknown'],
  reason: ['completed','death','win','quit','restart','disconnect','pagehide','error','unknown'],
  route: ['home','invite','other'], device_type: ['desktop','mobile','tablet'],
  browser: ['chrome','safari','firefox','edge','other'], os: ['windows','macos','linux','android','ios','other'],
  error_kind: ['load','network','asset','runtime','unknown'],
};
const numbers = {kills:10000,placement:1000,active_seconds:86400,active_seconds_delta:60,duration_seconds:86400,load_ms:600000,first_seen_age_days:36500,visit_number:1000000,fps_avg:1000,fps_min:1000,frame_ms_p95:10000,performance_samples:1000000,humans:1000,bots:1000};
const bools = new Set(['won','returning_visitor','arrived_via_invite','is_automated']);
// Campaign slugs only; common email/address/token shapes and long strings are rejected.
export function campaignSlug(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/.test(value) && !/^(ph[xc]_|eyJ)/.test(value) ? value : undefined;
}
export function sanitizeProperties(input = {}) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    if (Object.hasOwn(enums,key) && enums[key].includes(value)) out[key] = value;
    else if (key === 'character' && characters.has(value)) out[key] = value;
    else if (Object.hasOwn(numbers,key) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= numbers[key]) out[key] = Math.round(value * 100) / 100;
    else if (bools.has(key) && typeof value === 'boolean') out[key] = value;
    else if (['match_id','session_id'].includes(key) && typeof value === 'string' && UUID.test(value)) out[key] = value;
    else if (['utm_source','utm_medium','utm_campaign'].includes(key)) { const slug=campaignSlug(value); if(slug) out[key]=slug; }
    else if (key === 'referrer_domain' && typeof value === 'string' && value.length <= 120 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/.test(value)) out[key]=value;
  }
  return out;
}
