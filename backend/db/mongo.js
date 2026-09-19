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

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: "unique_user_email" }),
    users.createIndex({ createdAt: -1 }, { name: "users_by_created_at" }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true, name: "unique_session_token" }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expire_sessions" }),
    sessions.createIndex({ userId: 1 }, { name: "sessions_by_user" })
  ]);

  await db.command({ ping: 1 });
  return db;
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}
