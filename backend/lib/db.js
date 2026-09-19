import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { importLegacyJson } from "./migrateLegacy.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Schema versions, applied in order and tracked with SQLite's `user_version` pragma.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,

    identity_status TEXT NOT NULL DEFAULT 'unverified'
      CHECK (identity_status IN ('unverified', 'verified', 'rejected')),
    identity_reason TEXT,
    identity_code TEXT,
    identity_method TEXT,
    identity_verified_at TEXT,
    legal_name TEXT,
    date_of_birth TEXT,
    id_type TEXT,
    id_last4 TEXT,
    id_hash TEXT,

    address_status TEXT NOT NULL DEFAULT 'unverified'
      CHECK (address_status IN ('unverified', 'verified', 'rejected')),
    address_reason TEXT,
    address_code TEXT,
    address_method TEXT,
    address_verified_at TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT
  );
  -- One account per government ID, enforced by the database itself.
  CREATE UNIQUE INDEX users_id_hash ON users (id_hash) WHERE id_hash IS NOT NULL;

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions (user_id);

  -- Append-only Time Credit ledger; a user's balance is the sum of their rows.
  CREATE TABLE credit_transactions (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users (id),
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    experience_id TEXT,
    experience_name TEXT,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX credit_transactions_user_id ON credit_transactions (user_id);
  -- The welcome bonus can only ever be granted once per user.
  CREATE UNIQUE INDEX credit_transactions_one_welcome
    ON credit_transactions (user_id) WHERE reason = 'welcome';
  `,
  `
  CREATE TABLE community_experiences (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users (id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    host TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration BETWEEN 30 AND 180),
    capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 12),
    credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 4),
    open_from TEXT NOT NULL,
    open_to TEXT NOT NULL,
    indoor INTEGER NOT NULL CHECK (indoor IN (0, 1)),
    description TEXT NOT NULL,
    availability_text TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'paused')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX community_experiences_owner ON community_experiences (owner_user_id);

  CREATE TABLE booking_requests (
    id TEXT PRIMARY KEY,
    requester_user_id TEXT NOT NULL REFERENCES users (id),
    experience_id TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_host'
      CHECK (status IN ('awaiting_host', 'accepted', 'declined', 'cancelled')),
    created_at TEXT NOT NULL,
    UNIQUE (requester_user_id, experience_id, scheduled_time)
  );
  CREATE INDEX booking_requests_user ON booking_requests (requester_user_id);
  `
];

// Opens (creating if needed) a SQLite database file and brings its schema up to date.
// If `legacyJson` points at the old JSON-file database and the users table is empty, that
// data is imported once.
export function openDatabase(file, { legacyJson } = {}) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const version = db.pragma("user_version", { simple: true });
  MIGRATIONS.slice(version).forEach((sql, offset) => {
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version + offset + 1}`);
    })();
  });

  const isEmpty = db.prepare("SELECT COUNT(*) AS count FROM users").get().count === 0;
  if (legacyJson && isEmpty && fs.existsSync(legacyJson)) {
    const imported = importLegacyJson(db, legacyJson);
    console.log(`Imported ${imported.users} user(s) and ${imported.credits} credit entries from ${path.basename(legacyJson)}`);
  }
  return db;
}

// Local file, no server or account needed. Override the location with DB_FILE.
export const db = process.env.DB_FILE
  ? openDatabase(process.env.DB_FILE)
  : openDatabase(path.join(here, "../data/app.db"), { legacyJson: path.join(here, "../data/db.json") });
