// Stable identity data only. This module never loads a model, changes gameplay
// RNG or treats a portrait as a playable character. The identity rows follow
// art/super-smash-royale/roster-research.json; tests check that exact receipt.
const identities = [
  ['mario', 'Mario', 'mario', true, true],
  ['donkey-kong', 'Donkey Kong', 'donkey-kong', true, true],
  ['link', 'Link', 'link', true, true],
  ['samus', 'Samus', 'samus', true, true],
  ['yoshi', 'Yoshi', 'yoshi', true, true],
  ['kirby', 'Kirby', 'kirby', true, true],
  ['fox', 'Fox', 'fox', true, true],
  ['pikachu', 'Pikachu', 'pikachu', true, true],
  ['luigi', 'Luigi', 'luigi', true, true],
  ['ness', 'Ness', 'ness', true, true],
  ['captain-falcon', 'Captain Falcon', 'captain-falcon', true, true],
  ['jigglypuff', 'Jigglypuff', 'jigglypuff', true, true],
  ['peach', 'Peach', 'peach', true, true],
  ['bowser', 'Bowser', 'bowser', true, true],
  ['popo', 'Popo', 'ice-climbers', true, true],
  ['nana', 'Nana', 'ice-climbers', true, true],
  ['sheik', 'Sheik', 'sheik', true, true],
  ['zelda', 'Zelda', 'zelda', true, true],
  ['dr-mario', 'Dr. Mario', 'dr-mario', true, false],
  ['pichu', 'Pichu', 'pichu', true, false],
  ['falco', 'Falco', 'falco', true, true],
  ['marth', 'Marth', 'marth', true, true],
  ['young-link', 'Young Link', 'young-link', true, false],
  ['ganondorf', 'Ganondorf', 'ganondorf', true, true],
  ['mewtwo', 'Mewtwo', 'mewtwo', true, false],
  ['roy', 'Roy', 'roy', true, false],
  ['mr-game-and-watch', 'Mr. Game & Watch', 'mr-game-and-watch', true, true],
  ['meta-knight', 'Meta Knight', 'meta-knight', false, true],
  ['pit', 'Pit', 'pit', false, true],
  ['zero-suit-samus', 'Zero Suit Samus', 'zero-suit-samus', false, true],
  ['wario', 'Wario', 'wario', false, true],
  ['snake', 'Snake', 'snake', false, true],
  ['ike', 'Ike', 'ike', false, true],
  ['squirtle', 'Squirtle', 'squirtle', false, true],
  ['ivysaur', 'Ivysaur', 'ivysaur', false, true],
  ['charizard', 'Charizard', 'charizard', false, true],
  ['diddy-kong', 'Diddy Kong', 'diddy-kong', false, true],
  ['lucas', 'Lucas', 'lucas', false, true],
  ['sonic', 'Sonic', 'sonic', false, true],
  ['king-dedede', 'King Dedede', 'king-dedede', false, true],
  ['olimar', 'Olimar', 'olimar', false, true],
  ['lucario', 'Lucario', 'lucario', false, true],
  ['rob', 'R.O.B.', 'rob', false, true],
  ['toon-link', 'Toon Link', 'toon-link', false, true],
  ['wolf', 'Wolf', 'wolf', false, true],
];

function immutable(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

export const ROSTER_REVISION = 'ssr-combat-45-v1';
export const CHARACTER_ASSIGNMENT_VERSION = 1;
export const CHARACTER_ROSTER = immutable(identities.map(([id, name, formId, melee, brawl]) => ({
  id, name, formId, melee, brawl,
  availability: { status: 'not-yet-playable', playable: false, reason: 'No validated runtime character package.' },
  package: null,
  // The roster research verified identities and grouping, not silhouette pixels,
  // generated anatomy or physical dimensions. Null is deliberate, not a human
  // capsule or a generic biped adapter silently assigned to every character.
  rigFamily: { status: 'research-required', candidate: null, validated: false },
  bodyProfile: { status: 'research-required', candidate: null, measurements: null, validated: false },
})));
export const CHARACTER_ROSTER_MANIFEST = immutable({
  revision: ROSTER_REVISION,
  researchSha256: 'f74d16fffb5a98ec4c57fa9541059f8f931729288a96c71f45bb9ea0ffeb57c2',
  entries: CHARACTER_ROSTER,
});
export const MAX_ROSTER_BODIES = CHARACTER_ROSTER_MANIFEST.entries.length;

// Existing Sky saves belong to the legacy ruleset. Migration must preserve that
// fact or explicitly reject the save; this entry never participates in SSR draws.
export const LEGACY_CHARACTER = immutable({
  id: 'legacy-pilot', name: 'Legacy Skybreak soldier', modelKey: 'pilot',
  status: 'existing-legacy-runtime', eligibleForRoster: false,
});
const byId = new Map(CHARACTER_ROSTER.map(entry => [entry.id, entry]));
export function getRosterCharacter(id) { return byId.get(id) ?? null; }
const uint32 = value => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const validCount = value => Number.isInteger(value) && value >= 1 && value <= MAX_ROSTER_BODIES;

// Local Mulberry32 state is domain-separated from match.rng. Shuffling the whole
// remaining roster before taking a prefix makes 40- and 45-body plans agree on
// their shared contestants. This algorithm/order is part of assignment version 1.
function cosmeticRandom(seed) {
  let state = (seed ^ 0x53535231) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
function assignedIds(seed, selectedCharacterId, count) {
  const ids = CHARACTER_ROSTER.map(entry => entry.id).filter(id => id !== selectedCharacterId);
  const next = cosmeticRandom(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const range = i + 1, limit = 0x100000000 - (0x100000000 % range);
    let sample;
    do { sample = next(); } while (sample >= limit);
    const j = sample % range;
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return [selectedCharacterId, ...ids.slice(0, count - 1)];
}

/** Produce identity data for planning, not permission to start a match. */
export function planCharacterAssignment({ seed, selectedCharacterId, contestantCount = MAX_ROSTER_BODIES } = {}) {
  if (!uint32(seed)) throw new TypeError('Character assignment seed must be a uint32.');
  if (!getRosterCharacter(selectedCharacterId)) throw new TypeError('Unknown roster character.');
  if (!validCount(contestantCount)) throw new RangeError('Character assignment count exceeds the roster or is invalid.');
  return immutable({
    version: CHARACTER_ASSIGNMENT_VERSION, rosterRevision: ROSTER_REVISION, seed, selectedCharacterId,
    characterIds: assignedIds(seed, selectedCharacterId, contestantCount),
  });
}

// Until the complete roster is prepared, a preview contains every prepared
// fighter once. Eligibility is explicit identity data, never a soldier fallback.
export function planPreparedCharacterAssignment({seed,selectedCharacterId,preparedCharacterIds}={}) {
  if(!Array.isArray(preparedCharacterIds)||preparedCharacterIds.length<1||new Set(preparedCharacterIds).size!==preparedCharacterIds.length||Array.from(preparedCharacterIds).some(id=>!byId.has(id))||!preparedCharacterIds.includes(selectedCharacterId))throw new TypeError('Invalid prepared character roster.');
  const whole=planCharacterAssignment({seed,selectedCharacterId});
  if(preparedCharacterIds.length===MAX_ROSTER_BODIES)return whole;
  const eligibleCharacterIds=CHARACTER_ROSTER.map(c=>c.id).filter(id=>preparedCharacterIds.includes(id));
  return immutable({...whole,characterIds:whole.characterIds.filter(id=>eligibleCharacterIds.includes(id)),eligibleCharacterIds});
}

/** Validate a JSON save fragment without rewriting it or migrating legacy state. */
export function validateCharacterAssignment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== (Object.hasOwn(value,'eligibleCharacterIds')?6:5) || !['version', 'rosterRevision', 'seed', 'selectedCharacterId', 'characterIds'].every(key => Object.hasOwn(value, key))) return false;
  if (value.version !== CHARACTER_ASSIGNMENT_VERSION || value.rosterRevision !== ROSTER_REVISION || !uint32(value.seed)) return false;
  const ids = value.characterIds;
  if (!Array.isArray(ids) || !validCount(ids.length) || ids[0] !== value.selectedCharacterId) return false;
  if (ids.some(id => typeof id !== 'string' || !byId.has(id)) || new Set(ids).size !== ids.length) return false;
  let expected = assignedIds(value.seed, value.selectedCharacterId, ids.length);
  if(Object.hasOwn(value,'eligibleCharacterIds')){
    const eligible=value.eligibleCharacterIds;
    if(!Array.isArray(eligible)||eligible.length!==ids.length||new Set(eligible).size!==eligible.length||Array.from(eligible).some(id=>!byId.has(id))||!eligible.includes(value.selectedCharacterId))return false;
    const canonical=CHARACTER_ROSTER.map(c=>c.id).filter(id=>eligible.includes(id));
    if(canonical.some((id,i)=>id!==eligible[i]))return false;
    expected=assignedIds(value.seed,value.selectedCharacterId,MAX_ROSTER_BODIES).filter(id=>eligible.includes(id));
  }
  return expected.every((id, index) => id === ids[index]);
}

// The research manifest is not the runtime registry. Without renderer evidence
// it remains unavailable; a renderer supplies IDs only after decoding and rig
// validation of each concrete package, never from menu portrait availability.
export function characterAssignmentReadiness(value, preparedCharacterIds) {
  if (!validateCharacterAssignment(value)) return immutable({
    status: 'invalid-assignment', playable: false, requiresRuntimePreparation: true, unavailableCharacterIds: [],
  });
  const prepared = Array.isArray(preparedCharacterIds) ? new Set(preparedCharacterIds) : null;
  const unavailableCharacterIds = value.characterIds.filter(id => {
    if (prepared) return !prepared.has(id);
    const entry = byId.get(id);
    return entry.availability.playable !== true || entry.availability.status !== 'playable' || !entry.package;
  });
  return immutable({
    status: unavailableCharacterIds.length ? 'assets-unavailable' : prepared ? 'runtime-prepared' : 'requires-runtime-preparation',
    playable: unavailableCharacterIds.length === 0, requiresRuntimePreparation: !prepared || unavailableCharacterIds.length > 0, unavailableCharacterIds,
  });
}

/** Creation checks the concrete renderer preparation evidence for every identity. */
export function assertPlayableCharacterAssignment(value, preparedCharacterIds) {
  const readiness = characterAssignmentReadiness(value, preparedCharacterIds);
  if (readiness.status === 'invalid-assignment') throw new TypeError('Invalid character assignment.');
  if (!readiness.playable) throw new Error(`Character assets are not playable: ${readiness.unavailableCharacterIds.join(', ')}.`);
  return value;
}

// Save validation concerns stable identities. Runtime assets must be prepared
// again by the renderer before a restored simulation can be displayed.
export function assertValidCharacterAssignment(value) {
  if (!validateCharacterAssignment(value)) throw new TypeError('Invalid character assignment.');
  return value;
}
