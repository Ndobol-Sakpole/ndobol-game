import { createHash } from "node:crypto";
/** Store only a digest of the random per-slot bearer token. */
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
