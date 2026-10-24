import { createSupabaseStore } from "../../data/supabase-store.js";

// Read-only connectivity/migration check. Never print request headers or keys.
try {
  const store = createSupabaseStore();
  for (const track of ["bengawan", "mahakam"]) {
    const rows = await store.leaderboard(track);
    if (!Array.isArray(rows)) throw new Error("DATABASE_RESPONSE_INVALID");
    console.log(`${track}: RPC ready (${rows.length} leaderboard entries)`);
  }
  console.log("Supabase terhubung dan migrasi RPC tersedia. Tidak ada data yang diubah.");
} catch (error) {
  const hints = {
    DATABASE_RPC_404: "Jalankan data/supabase/001_game.sql di SQL Editor project yang sama.",
    DATABASE_RPC_401: "Periksa SUPABASE_URL dan SUPABASE_SECRET_KEY di .env; gunakan secret key dari project yang sama.",
    DATABASE_RPC_403: "Gunakan secret key server, lalu jalankan migrasi untuk memberikan hak RPC.",
    DATABASE_RPC_400: "Periksa apakah migrasi 001_game.sql telah selesai tanpa error.",
  };
  const code = error.message?.match(/^(SUPABASE_[A-Z_]+|DATABASE_[A-Z_0-9]+)/)?.[1] || "SUPABASE_CONNECTION_FAILED";
  console.error(code, hints[code] || "Periksa konfigurasi server dan status project Supabase.");
  process.exitCode = 1;
}
