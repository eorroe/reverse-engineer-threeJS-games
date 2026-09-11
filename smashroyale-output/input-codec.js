export const INPUT_BYTES = 44;
export const HELD_FIELDS = Object.freeze(['fire', 'aim', 'sprint', 'dive', 'crouchHeld']);
export const EDGE_FIELDS = Object.freeze(['jumpPressed', 'dropPressed', 'gliderPressed', 'crouchPressed', 'pronePressed', 'reloadPressed', 'interactPressed', 'healPressed', 'shieldPressed', 'crouchCancelled']);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
export function sequenceAfter(a, b) { return ((a - b) | 0) > 0; }
export function normalizeInput(value = {}) {
  const yaw = Number.isFinite(value.yaw) ? Math.atan2(Math.sin(value.yaw), Math.cos(value.yaw)) : 0;
  const input = {forward: clamp(value.forward, -1, 1), strafe: clamp(value.strafe, -1, 1), yaw, pitch: clamp(value.pitch, -1.15, 1.15), slotPressed: Number.isInteger(value.slotPressed) && value.slotPressed >= 0 && value.slotPressed <= 2 ? value.slotPressed : -1};
  input.aimYaw = Number.isFinite(value.aimYaw) ? Math.atan2(Math.sin(value.aimYaw), Math.cos(value.aimYaw)) : yaw;
  input.aimPitch = Number.isFinite(value.aimPitch) ? clamp(value.aimPitch, -Math.PI / 2, Math.PI / 2) : input.pitch;
  const magnitude = Math.hypot(input.forward, input.strafe);
  if (magnitude > 1) { input.forward /= magnitude; input.strafe /= magnitude; }
  for (const key of [...HELD_FIELDS, ...EDGE_FIELDS]) input[key] = value[key] === true;
  return input;
}
export function encodeInput(input, {seq, clientTimeMs = 0, dtMs = 17, acknowledgedSnapshotTick = 0} = {}) {
  const value = normalizeInput(input), buffer = new ArrayBuffer(INPUT_BYTES), view = new DataView(buffer);
  view.setUint8(0, 0x53); view.setUint8(1, 1);
  view.setUint16(2, HELD_FIELDS.reduce((bits, key, i) => bits | (value[key] ? 1 << i : 0), 0), true);
  view.setUint32(4, seq >>> 0, true); view.setUint32(8, clientTimeMs >>> 0, true);
  view.setInt16(12, Math.round(value.forward * 32767), true); view.setInt16(14, Math.round(value.strafe * 32767), true);
  view.setFloat32(16, value.yaw, true); view.setFloat32(20, value.pitch, true);
  view.setUint16(24, EDGE_FIELDS.reduce((bits, key, i) => bits | (value[key] ? 1 << i : 0), 0), true);
  view.setInt8(26, value.slotPressed); view.setUint16(28, Math.round(clamp(dtMs, 1, 100)), true);
  view.setUint32(32, acknowledgedSnapshotTick >>> 0, true);
  view.setFloat32(36, value.aimYaw, true); view.setFloat32(40, value.aimPitch, true);
  return buffer;
}
export function decodeInput(buffer) {
  const view = buffer instanceof ArrayBuffer ? new DataView(buffer) : ArrayBuffer.isView(buffer) ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) : null;
  if (!view || view.byteLength !== INPUT_BYTES || view.getUint8(0) !== 0x53 || view.getUint8(1) !== 1) throw new TypeError('Invalid input packet');
  const held = view.getUint16(2, true), edges = view.getUint16(24, true), yaw = view.getFloat32(16, true), pitch = view.getFloat32(20, true), slotPressed = view.getInt8(26);
  if (held >>> HELD_FIELDS.length || edges >>> EDGE_FIELDS.length || !Number.isFinite(yaw) || !Number.isFinite(pitch) || Math.abs(yaw) > 1e7 || Math.abs(pitch) > 1.151 || slotPressed < -1 || slotPressed > 2 || view.getUint8(27) || view.getUint16(30, true)) throw new TypeError('Invalid input fields');
  const aimYaw = view.getFloat32(36, true), aimPitch = view.getFloat32(40, true);
  if (!Number.isFinite(aimYaw) || !Number.isFinite(aimPitch) || Math.abs(aimYaw) > Math.PI + 1e-6 || Math.abs(aimPitch) > Math.PI / 2 + 1e-6) throw new TypeError('Invalid aim direction');
  const input = normalizeInput({forward: view.getInt16(12, true) / 32767, strafe: view.getInt16(14, true) / 32767, yaw, pitch, slotPressed, aimYaw, aimPitch});
  for (let i = 0; i < HELD_FIELDS.length; i++) input[HELD_FIELDS[i]] = !!(held & (1 << i));
  for (let i = 0; i < EDGE_FIELDS.length; i++) input[EDGE_FIELDS[i]] = !!(edges & (1 << i));
  return {...input, seq: view.getUint32(4, true), clientTimeMs: view.getUint32(8, true), dtMs: view.getUint16(28, true), acknowledgedSnapshotTick: view.getUint32(32, true)};
}
