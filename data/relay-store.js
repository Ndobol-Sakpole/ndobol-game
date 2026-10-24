/** Durable outbox: signed bytes are saved before broadcast, including reserved gas budget. */
export function sqliteRelayStore(db) {
  const parse = row => row ? JSON.parse(row.payload_json) : null;
  return {
    relayGet(id) { return parse(db.prepare("SELECT payload_json FROM sponsored_claims WHERE id=?").get(id)); },
    relayPending() { return db.prepare("SELECT payload_json FROM sponsored_claims WHERE status='pending'").all().map(parse); },
    relayReserve(record, dailyLimit) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const existing = parse(db.prepare("SELECT payload_json FROM sponsored_claims WHERE id=?").get(record.id));
        if (existing) { db.exec("COMMIT"); return true; }
        const spent = db.prepare("SELECT max_fee_wei FROM sponsored_claims WHERE day=?").all(record.day)
          .reduce((sum, row) => sum + BigInt(row.max_fee_wei), 0n);
        if (spent + BigInt(record.maxFeeWei) > BigInt(dailyLimit)) { db.exec("COMMIT"); return false; }
        db.prepare("INSERT INTO sponsored_claims VALUES(?,?,?,?,?)")
          .run(record.id, record.day, record.maxFeeWei, record.status, JSON.stringify(record));
        db.exec("COMMIT"); return true;
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    relayUpdate(record) {
      db.prepare("UPDATE sponsored_claims SET status=?,payload_json=? WHERE id=?")
        .run(record.status, JSON.stringify(record), record.id);
    },
  };
}
