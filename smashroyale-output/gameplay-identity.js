// Build-time gameplay identity. Runtime config must never supply these hashes.
export function gameplayIdentity(value) {
  if (value === undefined) return undefined;
  if (!value || value.protocol !== 1 || typeof value.simulation !== 'string' || typeof value.world !== 'string' || !/^[a-f0-9]{64}$/.test(value.simulation) || !/^[a-f0-9]{64}$/.test(value.world)) throw new TypeError('Invalid compiled gameplay identity');
  return Object.freeze({protocol: 1, simulation: value.simulation, world: value.world});
}
export function identityControl(message, identity) {
  if (!['create', 'join', 'admit', 'resume'].includes(message.type)) return message;
  const {gameplayIdentity: ignored, ...fields} = message;
  return identity === undefined ? fields : {...fields, gameplayIdentity: identity};
}
