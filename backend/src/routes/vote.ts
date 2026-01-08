import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getPgClient, isDbConfigured } from "../db";

export const voteRouter = Router();

const VoteRequestSchema = z.object({
  runId: z.string().uuid(),
  modelRowId: z.string().uuid(),
  userId: z.string().uuid().optional()
});

voteRouter.post("/", async (req, res) => {
  const parse = VoteRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body", details: parse.error.flatten() });
  }

  // If there is no DATABASE_URL configured, pretend voting worked so the
  // frontend UX still feels smooth, but we don't persist anything.
  if (!isDbConfigured()) {
    return res.status(201).json({ ok: true, skippedPersistence: true });
  }

  try {
    const client = await getPgClient();
    try {
      const { runId, modelRowId, userId } = parse.data;

      // Ensure the referenced row exists (and belongs to the run).
      const modelRow = await client.query(
        `select id, run_id from prompt_run_models where id = $1 limit 1`,
        [modelRowId]
      );
      if (modelRow.rowCount === 0 || modelRow.rows[0].run_id !== runId) {
        return res.status(400).json({ error: "Invalid run/model combination" });
      }

      await client.query(
        `insert into votes (id, run_id, model_row_id, user_id) values ($1, $2, $3, $4)`,
        [uuidv4(), runId, modelRowId, userId ?? null]
      );

      return res.status(201).json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to record vote", err);
    return res.status(500).json({ error: "Failed to record vote" });
  }
});


