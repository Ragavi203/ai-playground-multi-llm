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
import { Button } from "@/components/ui/button";
import type { RunSummary } from "@/lib/api";
import { fetchRuns, deleteRun } from "@/lib/api";

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns()
      .then(setRuns)
      .catch((err) => {
        console.error("Failed to load runs", err);
        setError("History is unavailable right now.");
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this experiment? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await deleteRun(id);
      setRuns((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (err) {
      console.error("Failed to delete run", err);
      alert("Failed to delete experiment.");
    } finally {
      setDeletingId(null);
    }
  };

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
              Experiment history
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Review prompts you&apos;ve run in the playground. Open an experiment to see
              all model outputs again, or delete it if you no longer need it.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent experiments</CardTitle>
            <CardDescription>
              The last 50 runs across the playground. In a real auth setup this would be
              scoped to the current user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-xs text-destructive py-4">{error}</div>
            )}
            {!error && !runs && (
              <div className="text-xs text-muted-foreground py-4">
                Loading experiments...
              </div>
            )}
            {!error && runs && runs.length === 0 && (
              <div className="text-xs text-muted-foreground py-4">
                No experiments recorded yet. Run your first prompt to see it here.
              </div>
            )}
            {!error && runs && runs.length > 0 && (
              <div className="divide-y divide-border text-sm">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-col md:flex-row md:items-center gap-3 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/history/${run.id}`}
                        className="font-medium hover:underline line-clamp-2"
                      >
                        {run.promptText}
                      </Link>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                        <span>
                          {new Date(run.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </span>
                        <span>•</span>
                        <span>{run.modelCount} models</span>
                        {run.totalCostUsd != null && (
                          <>
                            <span>•</span>
                            <span className="tabular-nums">
                              ${run.totalCostUsd.toFixed(4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/history/${run.id}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          Open
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                        disabled={deletingId === run.id}
                        onClick={() => handleDelete(run.id)}
                      >
                        {deletingId === run.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}


