"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RunDetail } from "@/lib/api";
import { fetchRunById } from "@/lib/api";

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    fetchRunById(runId)
      .then(setRun)
      .catch((err) => {
        console.error("Failed to load run", err);
        setError("Experiment not found or unavailable.");
      });
  }, [runId]);

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
              href="/history"
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition"
            >
              History
            </Link>
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
        <Link href="/history">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to history
          </Button>
        </Link>

        {error && (
          <div className="text-sm text-destructive mt-4">{error}</div>
        )}

        {!error && !run && (
          <div className="text-sm text-muted-foreground mt-4">Loading...</div>
        )}

        {run && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  Experiment details
                </CardTitle>
                <CardDescription>
                  Ran on{" "}
                  {new Date(run.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}{" "}
                  across {run.models.length} models.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Prompt
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                  {run.promptText}
                </div>
                {run.totalCostUsd != null && (
                  <div className="text-xs text-muted-foreground">
                    Estimated total cost:{" "}
                    <span className="tabular-nums font-medium">
                      ${run.totalCostUsd.toFixed(4)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 md:-mx-2 md:px-2">
              {run.models.map((m) => (
                <Card
                  key={m.id}
                  className="min-w-[280px] md:min-w-[360px] max-w-[420px] flex flex-col shadow-sm"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2 text-sm">
                      <span className="flex flex-col">
                        <span className="font-medium">{m.modelLabel}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {m.providerLabel}
                        </span>
                      </span>
                      {m.costUsd != null && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          ${m.costUsd.toFixed(5)}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground">
                      Output
                    </div>
                    <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm overflow-auto whitespace-pre-wrap leading-relaxed">
                      {m.output || "No output recorded."}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}


