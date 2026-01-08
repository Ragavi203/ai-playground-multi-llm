import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { json } from "express";
import { runRouter } from "./routes/run";
import { voteRouter } from "./routes/vote";
import { leaderboardRouter } from "./routes/leaderboard";
import { runsRouter } from "./routes/runs";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: false
  })
);
app.use(json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/run", runRouter);
app.use("/api/vote", voteRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/runs", runsRouter);

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});


