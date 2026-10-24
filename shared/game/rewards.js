/** Economy v1. Integer grams and wei only. These are gameplay masses, not sensor readings. */
export const REWARDS = Object.freeze({
  version: 1,
  weiPerGram: 10_000_000_000n, // 1 kg = 0.00001 MON (18 decimals).
  pointsPerKg: 1000,
  massGrams: Object.freeze({ bottle: 35, bag: 12, can: 18 }),
});
export const isFatal = (reason) => ["capsized", "sunk"].includes(reason);
export function trashMass(item) {
  const grams = item.weightGrams ?? REWARDS.massGrams[item.type];
  if (!Number.isSafeInteger(grams) || grams <= 0 || grams > 10000)
    throw new TypeError("Invalid trash mass");
  return grams;
}
export function rewardWei(weightGrams, reason = null) {
  if (!Number.isSafeInteger(weightGrams) || weightGrams < 0)
    throw new TypeError("Invalid collected mass");
  return isFatal(reason) ? "0" : String(BigInt(weightGrams) * REWARDS.weiPerGram);
}
export function formatMon(wei) {
  const n = BigInt(wei), base = 10n ** 18n;
  const fraction = String(n % base).padStart(18, "0").replace(/0+$/, "");
  return `${n / base}${fraction ? "." + fraction : ""}`;
}
export const formatKg = (grams) => (grams / 1000).toFixed(3);
