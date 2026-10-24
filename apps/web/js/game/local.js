import { createRound } from "../../../../shared/game/round.js";
import { GAME } from "../../../../shared/game/config.js";
/** Offline demo uses exactly the server rules. It can never issue a signed result. */
export function createLocalRound(
  track,
  {
    name = "Penjelajah",
    animal = "dog",
    raftId = "bambu-polos",
    bots = false,
  } = {},
) {
  const round = createRound(track, {
    roundId: crypto.randomUUID(),
    mode: "local",
    raftId,
  });
  const human = round.addPlayer({ id: "local-player", name, animal, slot: 0 });
  human.ready = true;
  if (!bots) {
    human.x = 0;
    human.z = 0;
  }
  for (let i = 1; i < (bots ? GAME.maxPlayers : 1); i++)
    round.addPlayer({
      id: `bot-${i}`,
      name: `Bot ${i}`,
      animal: ["dog", "monkey", "pig", "squirrel"][i],
      slot: i,
      bot: true,
    });
  return round;
}
