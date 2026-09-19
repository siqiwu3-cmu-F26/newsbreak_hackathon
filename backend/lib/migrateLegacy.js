import fs from "node:fs";

import { INSERT_USER_SQL, userToParams } from "./userRows.js";

// One-time import of the earlier JSON-file database ({ users, sessions, credits }) into SQLite.
// The JSON file is renamed to `<file>.migrated` afterwards, never deleted, as a backup.
export function importLegacyJson(db, jsonFile) {
  const legacy = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
  const insertUser = db.prepare(INSERT_USER_SQL);
  const insertSession = db.prepare(
    "INSERT OR IGNORE INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  );
  const insertTransaction = db.prepare(`
    INSERT INTO credit_transactions
      (id, user_id, type, amount, reason, experience_id, experience_name, balance_after, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const now = Date.now();
  db.transaction(() => {
    for (const user of legacy.users ?? []) insertUser.run(userToParams(user));
    for (const session of legacy.sessions ?? []) {
      if (session.expiresAt > now) {
        insertSession.run(session.tokenHash, session.userId, session.createdAt, session.expiresAt);
      }
    }
    for (const entry of legacy.credits ?? []) {
      insertTransaction.run(
        entry.id,
        entry.userId,
        entry.type,
        entry.amount,
        entry.reason,
        entry.experienceId ?? null,
        entry.experienceName ?? null,
        entry.balanceAfter,
        entry.createdAt
      );
    }
  })();

  fs.renameSync(jsonFile, `${jsonFile}.migrated`);
  return { users: legacy.users?.length ?? 0, credits: legacy.credits?.length ?? 0 };
}
