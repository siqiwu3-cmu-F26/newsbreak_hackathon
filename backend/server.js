import "dotenv/config";
import cors from "cors";
import express from "express";

import { initializeDatabase } from "./db/mongo.js";
import authRouter from "./routes/auth.js";
import contextRouter from "./routes/context.js";
import experiencesRouter from "./routes/experiences.js";
import planRouter from "./routes/plan.js";
import replaceRouter from "./routes/replace.js";
import replanRouter from "./routes/replan.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "localconnect-backend" });
});

app.use("/experiences", experiencesRouter);
app.use("/auth", authRouter);
app.use("/context", contextRouter);
app.use("/plan", planRouter);
app.use("/replace", replaceRouter);
app.use("/replan", replanRouter);

// Compatibility aliases while the frontend team settles the API prefix.
app.use("/api/experiences", experiencesRouter);
app.use("/api/auth", authRouter);
app.use("/api/context", contextRouter);
app.use("/api/plan", planRouter);
app.use("/api/replace", replaceRouter);
app.use("/api/replan", replanRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  if (process.env.MONGODB_URI) {
    const db = await initializeDatabase();
    console.log(`Connected to MongoDB database '${db.databaseName}'`);
  } else {
    console.warn("MONGODB_URI is not configured; authentication endpoints are unavailable");
  }

  app.listen(port, () => {
    console.log(`LocalConnect backend listening on http://localhost:${port}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Unable to start backend:", error.message);
    process.exitCode = 1;
  });
}

export default app;
