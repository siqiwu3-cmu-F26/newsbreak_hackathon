import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env.mongodb", import.meta.url)) });

const databaseName = process.env.MONGODB_DB_NAME || "localconnect";

let client;
let database;

export async function getDatabase() {
  if (database) return database;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  database = client.db(databaseName);
  return database;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  const users = db.collection("users");
  const sessions = db.collection("sessions");
  const credits = db.collection("creditTransactions");

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: "unique_user_email" }),
    users.createIndex(
      { "verification.idHash": 1 },
      {
        unique: true,
        name: "unique_verified_identity",
        partialFilterExpression: { "verification.idHash": { $type: "string" } }
      }
    ),
    users.createIndex({ createdAt: -1 }, { name: "users_by_created_at" }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true, name: "unique_session_token" }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expire_sessions" }),
    sessions.createIndex({ userId: 1 }, { name: "sessions_by_user" }),
    credits.createIndex({ id: 1 }, { unique: true, name: "unique_credit_transaction" }),
    credits.createIndex({ userId: 1, createdAt: -1 }, { name: "credits_by_user" }),
    credits.createIndex(
      { userId: 1, reason: 1 },
      {
        unique: true,
        name: "one_welcome_credit_per_user",
        partialFilterExpression: { reason: "welcome" }
      }
    )
  ]);

  await db.command({ ping: 1 });
  return db;
}

export async function withTransaction(work) {
  const db = await getDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => work(db, session));
  } finally {
    await session.endSession();
  }
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}
