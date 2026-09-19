import "dotenv/config";
import cors from "cors";
import express from "express";

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
app.use("/plan", planRouter);
app.use("/replace", replaceRouter);
app.use("/replan", replanRouter);

// Compatibility aliases while the frontend team settles the API prefix.
app.use("/api/experiences", experiencesRouter);
app.use("/api/plan", planRouter);
app.use("/api/replace", replaceRouter);
app.use("/api/replan", replanRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`LocalConnect backend listening on http://localhost:${port}`);
});

export default app;
