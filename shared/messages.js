import { RAFTS } from "./game/rafts.js";
import { ANIMALS } from "./game/config.js";
export const PROTOCOL_VERSION = 4;
export const CLIENT_TYPES = Object.freeze([
  "hello",
  "create",
  "join",
  "resume",
  "ready",
  "animal",
  "start",
  "input",
  "leave",
  "again",
  "ping",
]);
export const SERVER_TYPES = Object.freeze([
  "welcome",
  "joined",
  "snapshot",
  "pong",
  "error",
  "left",
]);
export const MESSAGE_TYPES = Object.freeze([...CLIENT_TYPES, ...SERVER_TYPES]);
export const isAddress = (value) =>
  typeof value === "string" &&
  /^0x[0-9a-fA-F]{40}$/.test(value) &&
  !/^0x0{40}$/.test(value);
export const isRoomCode = (value) =>
  typeof value === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const only = (p, keys) => Object.keys(p).every((key) => keys.includes(key));
const text = (v, max = 64) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const identity = (p) =>
  text(p.name, 24) &&
  Object.hasOwn(ANIMALS, p.animal) &&
  (p.address === null || p.address === undefined || isAddress(p.address));
/** v4 envelope; server accepts only CLIENT_TYPES after explicit hello handshake. */
export function isMessage(m, direction = "any") {
  if (
    !object(m) ||
    m.v !== PROTOCOL_VERSION ||
    !object(m.payload) ||
    !only(m, ["v", "type", "payload"])
  )
    return false;
  const types =
    direction === "client"
      ? CLIENT_TYPES
      : direction === "server"
        ? SERVER_TYPES
        : MESSAGE_TYPES;
  if (!types.includes(m.type)) return false;
  const p = m.payload;
  switch (m.type) {
    case "hello":
      return only(p, ["protocol", "authToken"]) && p.protocol === PROTOCOL_VERSION &&
        (p.authToken === undefined || (typeof p.authToken === "string" && /^[a-f0-9]{64}$/.test(p.authToken)));
    case "create":
      return (
        only(p, ["name", "animal", "address", "trackId", "raftId"]) &&
        identity(p) &&
        (p.raftId === undefined || Object.hasOwn(RAFTS, p.raftId)) &&
        ["bengawan", "mahakam"].includes(p.trackId)
      );
    case "join":
      return (
        only(p, ["name", "animal", "address", "code"]) &&
        identity(p) &&
        isRoomCode(p.code)
      );
    case "resume":
      return (
        only(p, ["code", "token"]) &&
        isRoomCode(p.code) &&
        typeof p.token === "string" &&
        /^[a-f0-9]{64}$/.test(p.token)
      );
    case "ready":
      return only(p, ["ready"]) && typeof p.ready === "boolean";
    case "animal":
      return only(p, ["animal"]) && Object.hasOwn(ANIMALS, p.animal);
    case "start":
    case "leave":
    case "again":
      return Object.keys(p).length === 0;
    case "input":
      return (
        only(p, [
          "roundId",
          "seq",
          "fart",
          "moveX",
          "moveZ",
          "turn",
          "reach",
        ]) &&
        text(p.roundId) &&
        Number.isSafeInteger(p.seq) &&
        p.seq >= 0 &&
        p.seq < Number.MAX_SAFE_INTEGER &&
        typeof p.fart === "boolean" &&
        [p.moveX ?? 0, p.moveZ ?? 0, p.turn ?? 0].every((v) =>
          [-1, 0, 1].includes(v),
        ) &&
        [-1, 0, 1].includes(p.reach)
      );
    case "ping":
      return (
        only(p, ["clientTime"]) &&
        Number.isFinite(p.clientTime) &&
        p.clientTime >= 0
      );
    case "welcome":
      return p.protocol === PROTOCOL_VERSION && Number.isFinite(p.serverTime);
    case "joined":
      return (
        text(p.playerId) &&
        isRoomCode(p.code) &&
        typeof p.token === "string" &&
        /^[a-f0-9]{64}$/.test(p.token) &&
        Number.isInteger(p.slot)
      );
    case "snapshot":
      return (
        isRoomCode(p.roomCode) &&
        object(p.state) &&
        Array.isArray(p.state.players) &&
        Number.isSafeInteger(p.state.tick) &&
        Number.isFinite(p.serverTime)
      );
    case "pong":
      return Number.isFinite(p.serverTime) && Number.isFinite(p.clientTime);
    case "error":
      return text(p.code) && text(p.message, 200);
    case "left":
      return true;
    default:
      return false;
  }
}
export function message(type, payload = {}) {
  const m = { v: PROTOCOL_VERSION, type, payload };
  if (!isMessage(m)) throw new TypeError(`Invalid ${type} message`);
  return m;
}
