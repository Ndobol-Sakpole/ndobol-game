import { buildGame } from "./build-game.js";

// Render runs the API; Vercel packages the browser game. Neither needs a bundler.
const target = process.argv[2] || (process.env.RENDER === "true" ? "api" : process.env.VERCEL === "1" ? "vercel" : "web");
if (target === "api") {
  // Verify runtime imports without opening a database, port, or signing account.
  await import("../services/api/server.js");
  console.log("API dependencies ready. Start with npm run start:api; no frontend build required.");
} else if (target === "vercel") {
  // Public endpoint for this project's deployment. Forks override it in Vercel.
  await buildGame({ apiOrigin: process.env.PUBLIC_API_ORIGIN || "https://ndobol-game.onrender.com" });
} else if (target === "web") {
  await buildGame();
} else {
  throw new Error("Unknown build target; use api, web, or vercel");
}
