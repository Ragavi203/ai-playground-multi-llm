import { Router } from "express";
import { getPgClient, isDbConfigured } from "../db";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.json({ rows: [] });
  }

  try {
    const client = await getPgClient();
    try {
      const { rows } = await client.query(
        `
        select
          prm.model_label,
          prm.provider_label,
          count(v.*) as wins,
          count(distinct prm.run_id) as runs,
          case
            when count(distinct prm.run_id) = 0 then 0
            else count(v.*)::float / count(distinct prm.run_id)::float
          end as win_rate
        from prompt_run_models prm
        left join votes v on v.model_row_id = prm.id
        group by prm.model_label, prm.provider_label
        order by wins desc, runs desc;
        `
      );

      return res.json({
        rows: (rows as any[]).map((r) => ({
          modelLabel: r.model_label,
          providerLabel: r.provider_label,
          wins: Number(r.wins),
          runs: Number(r.runs),
          winRate: Number(r.win_rate)
        }))
      });
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to load leaderboard", err);
    return res.status(500).json({ error: "Leaderboard unavailable" });
  }
});


