/** Gameplay catalogue in native MON wei. Every hull remains freely testable until shop ownership is enabled.
 */
export const RAFTS = Object.freeze({
  "bambu-polos": {
    name: "Bambu polos",
    priceWei: "0",
    mass: 1,
    spring: 5.2,
    damping: 1.8,
    weightTilt: 0.38,
    drag: 0.62,
    recoil: 0.13,
    buoyancy: 0.72,
    description: {
      id: "Ringan, tetapi mudah oleng. Berpindah sisi untuk membagi berat.",
      en: "Light, but tippy. Move across the deck to balance your weight.",
    },
  },
  "getek-botol": {
    name: "Getek botol",
    priceWei: "50000000000000",
    mass: 0.92,
    spring: 8,
    damping: 2.7,
    weightTilt: 0.2,
    drag: 0.72,
    recoil: 0.1,
    buoyancy: 0.9,
    description: {
      id: "Lincah dan mengapung tinggi. Benturan keras melepas ikatan botol.",
      en: "Agile and buoyant. Hard impacts loosen bottle bundles.",
    },
  },
  "ban-bekas": {
    name: "Ban bekas",
    priceWei: "150000000000000",
    mass: 1.16,
    spring: 10,
    damping: 3.6,
    weightTilt: 0.15,
    drag: 0.68,
    recoil: 0.08,
    buoyancy: 1,
    description: {
      id: "Empuk dan stabil. Ranting tajam bisa meletuskan ban di sisi benturan.",
      en: "Soft and stable. Sharp branches puncture the tyre on impact.",
    },
  },
  "drum-biru": {
    name: "Drum biru",
    priceWei: "250000000000000",
    mass: 1.35,
    spring: 11,
    damping: 2.5,
    weightTilt: 0.13,
    drag: 0.56,
    recoil: 0.07,
    buoyancy: 1.15,
    description: {
      id: "Berat, mengayun lambat. Drum penyok menambah hambatan air.",
      en: "Heavy with a slow sway. Dented drums add water resistance.",
    },
  },
  "ranjang-hanyut": {
    name: "Ranjang hanyut",
    priceWei: "300000000000000",
    mass: 1.12,
    spring: 4.2,
    damping: 1.2,
    weightTilt: 0.24,
    drag: 0.65,
    recoil: 0.18,
    buoyancy: 0.83,
    description: {
      id: "Kasur memantul. Sisi yang tercelup menyerap air dan makin berat.",
      en: "A springy mattress. Dipped edges soak up water and add weight.",
    },
  },
  "getek-sultan": {
    name: "Getek sultan",
    priceWei: "500000000000000",
    mass: 1.5,
    spring: 9,
    damping: 3.2,
    weightTilt: 0.16,
    drag: 0.5,
    recoil: 0.07,
    buoyancy: 1,
    description: {
      id: "Dek lebar dan berat. Momentum besar: mulai membelok lebih awal.",
      en: "A wide, heavy deck. Strong momentum: start your turns early.",
    },
  },
});
export const RAFT_IDS = Object.freeze(Object.keys(RAFTS));
export const DEFAULT_RAFT = "bambu-polos";
export const DECK = Object.freeze({
  halfWidth: 1.68,
  halfLength: 1.68,
  walkSpeed: 1.55,
  turnSpeed: 2.5,
  slideAngle: 0.16,
  slideForce: 2.8,
  gasImpulse: 0.94,
  torque: 0.055,
  lateralDrag: 1.1,
  maxLateralSpeed: 3.2,
  maxRoll: Math.PI,
});
export const FLOAT_CORNERS = Object.freeze([
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]);
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
