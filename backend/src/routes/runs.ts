import { Router } from "express";
import { getPgClient, isDbConfigured } from "../db";

export const runsRouter = Router();

runsRouter.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.json({ runs: [] });
  }

  try {
    const client = await getPgClient();
    try {
      const { rows } = await client.query(
        `
        select
          r.id,
          r.prompt_text,
          r.created_at,
          r.total_cost_usd,
          count(m.*) as model_count
        from prompt_runs r
        left join prompt_run_models m on m.run_id = r.id
        group by r.id
        order by r.created_at desc
        limit 50;
        `
      );

      return res.json({
        runs: (rows as any[]).map((r) => ({
          id: r.id,
          promptText: r.prompt_text,
          createdAt: r.created_at,
          totalCostUsd: r.total_cost_usd ? Number(r.total_cost_usd) : null,
          modelCount: Number(r.model_count)
        }))
      });
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to list runs", err);
    return res.status(500).json({ error: "Failed to list runs" });
  }
});

runsRouter.get("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(404).json({ error: "Run not found" });
  }

  const id = req.params.id;
  try {
    const client = await getPgClient();
    try {
      const runRes = await client.query(
        `select id, prompt_text, created_at, total_cost_usd from prompt_runs where id = $1`,
        [id]
      );
      if (runRes.rowCount === 0) {
        return res.status(404).json({ error: "Run not found" });
      }

      const modelsRes = await client.query(
        `
        select
          id,
          provider_id,
          provider_label,
          model_id,
          model_label,
          output,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          cost_usd
        from prompt_run_models
        where run_id = $1
        order by created_at asc;
        `,
        [id]
      );

      return res.json({
        run: {
          id,
          promptText: runRes.rows[0].prompt_text,
          createdAt: runRes.rows[0].created_at,
          totalCostUsd: runRes.rows[0].total_cost_usd
            ? Number(runRes.rows[0].total_cost_usd)
            : null,
          models: modelsRes.rows.map((m: any) => ({
            id: m.id,
            providerId: m.provider_id,
            providerLabel: m.provider_label,
            modelId: m.model_id,
            modelLabel: m.model_label,
            output: m.output,
            promptTokens: m.prompt_tokens,
            completionTokens: m.completion_tokens,
            totalTokens: m.total_tokens,
            costUsd: m.cost_usd ? Number(m.cost_usd) : null
          }))
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to load run", err);
    return res.status(500).json({ error: "Failed to load run" });
  }
});

runsRouter.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(400).json({ error: "Database not configured" });
  }

  const id = req.params.id;
  try {
    const client = await getPgClient();
    try {
      const result = await client.query(`delete from prompt_runs where id = $1`, [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Run not found" });
      }
      return res.status(204).send();
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to delete run", err);
    return res.status(500).json({ error: "Failed to delete run" });
  }
});


