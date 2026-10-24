export const QUALITY = Object.freeze({
  low: {
    pixelRatio: 1,
    flora: 55,
    waterSegments: 90,
    shadows: false,
    description: "Resolusi 1× · flora ringan · tanpa shadow map",
  },
  medium: {
    pixelRatio: 1.25,
    flora: 110,
    waterSegments: 160,
    shadows: true,
    description: "Resolusi 1,25× · flora sedang · bayangan lembut",
  },
  high: {
    pixelRatio: 2,
    flora: 180,
    waterSegments: 240,
    shadows: true,
    description: "Resolusi maksimal 2× · flora lebat · shadow map",
  },
});
export const FIXED_STEP = 1 / 60;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
