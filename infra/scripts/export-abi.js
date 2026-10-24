import { readFile, writeFile } from "node:fs/promises";
for (const name of ["NdobolItems", "RiverRegistry", "ImpactBadge", "RiverRewards"]) {
  const artifact = JSON.parse(
    await readFile(
      new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
  await writeFile(
    new URL(`../../shared/abi/${name}.json`, import.meta.url),
    JSON.stringify(artifact.abi, null, 2) + "\n",
  );
}
