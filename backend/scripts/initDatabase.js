import "dotenv/config";

import { closeDatabase, initializeDatabase } from "../db/mongo.js";

try {
  const db = await initializeDatabase();
  console.log(`MongoDB database '${db.databaseName}' is ready.`);
} catch (error) {
  console.error("Failed to initialize MongoDB:", error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

