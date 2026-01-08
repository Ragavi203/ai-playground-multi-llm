"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { LeaderboardRow } from "@/lib/api";
import { fetchLeaderboard } from "@/lib/api";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then(setRows)
      .catch((err) => {
        console.error("Failed to load leaderboard", err);
        setError("Leaderboard is unavailable right now.");
      });
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600" />
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight">AI Playground</span>
                <span className="text-xs text-muted-foreground">
                  Multi-LLM prompt arena
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/prompt/new"
              className="rounded-full border border-border px-4 py-1.5 font-medium hover:bg-accent hover:text-accent-foreground transition text-xs md:text-sm"
            >
              New experiment
            </Link>
          </div>
        </div>
      </header>

      <section className="container py-8 md:py-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Model leaderboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              See which models tend to win head-to-head comparisons based on community
              votes from recent prompt runs.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overall performance</CardTitle>
            <CardDescription>
              Rankings are computed from votes cast on individual model responses in the
              playground.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-sm">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 pb-2 text-xs md:text-xs text-muted-foreground">
                <span>Model</span>
                <span className="text-right">Win rate</span>
                <span className="text-right">Runs</span>
              </div>
              {error && (
                <div className="py-4 text-xs text-destructive">
                  {error}
                </div>
              )}
              {!error && !rows && (
                <div className="py-4 text-xs text-muted-foreground">
                  Loading leaderboard...
                </div>
              )}
              {!error &&
                rows &&
                rows.map((row) => (
                  <div
                    key={`${row.providerLabel}-${row.modelLabel}`}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 py-3 items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{row.modelLabel}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {row.providerLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs md:text-sm">
                      <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                          style={{ width: `${Math.min(row.winRate * 100, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {(row.winRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right tabular-nums text-xs md:text-sm text-muted-foreground">
                      {row.runs.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}


