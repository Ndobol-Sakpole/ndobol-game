import { readFileSync } from "node:fs";
export const tracks = Object.fromEntries(
  ["bengawan", "mahakam"].map((id) => [
    id,
    JSON.parse(
      readFileSync(
        new URL(
          `../../../apps/web/js/world/tracks/${id}.json`,
          import.meta.url,
        ),
      ),
    ),
  ]),
);
