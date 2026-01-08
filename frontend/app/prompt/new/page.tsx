"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PROVIDERS, type ProviderId } from "@/config/models";
import { createRun, voteForModel } from "@/lib/api";

interface ModelResult {
  id: string;
  providerId: ProviderId;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  modelRowId: string;
  text: string;
  status: "idle" | "streaming" | "done" | "error";
}

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  selectedModelIds: string[];
}

export default function NewPromptPage() {
  const [prompt, setPrompt] = useState("");
  const [providers, setProviders] = useState<ProviderState[]>(
    PROVIDERS.map((p) => ({
      providerId: p.id,
      apiKey: "",
      selectedModelIds: p.models.slice(0, 1).map((m) => m.id)
    }))
  );
  const [customModelInputs, setCustomModelInputs] = useState<
    Record<ProviderId, string>
  >({
    openai: "",
    anthropic: "",
    google: "",
    meta: "",
    mistral: ""
  });
  const [results, setResults] = useState<ModelResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [votedModelRowId, setVotedModelRowId] = useState<string | null>(null);

  const toggleModel = (providerId: ProviderId, modelId: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.providerId === providerId
          ? {
              ...p,
              selectedModelIds: p.selectedModelIds.includes(modelId)
                ? p.selectedModelIds.filter((m) => m !== modelId)
                : [...p.selectedModelIds, modelId]
            }
          : p
      )
    );
  };

  const updateApiKey = (providerId: ProviderId, apiKey: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.providerId === providerId ? { ...p, apiKey } : p))
    );
  };

  const handleRun = () => {
    const trimmed = prompt.trim();
    // Only consider providers where an API key has been supplied.
    const providersWithKeys = providers.filter(
      (p) => p.apiKey && p.apiKey.trim().length > 0
    );

    const activeCombos = providersWithKeys
      .flatMap((p) => {
        const providerMeta = PROVIDERS.find((cfg) => cfg.id === p.providerId)!;
        return p.selectedModelIds.map((modelId) => {
          const modelMeta = providerMeta.models.find((m) => m.id === modelId);
          if (!modelMeta) return null;
          return {
            providerId: p.providerId,
            providerLabel: providerMeta.label,
            modelId: modelMeta.id,
            modelLabel: modelMeta.label
          };
        });
      })
      .filter(Boolean) as {
      providerId: ProviderId;
      providerLabel: string;
      modelId: string;
      modelLabel: string;
    }[];

    if (!trimmed || activeCombos.length === 0) {
      // No provider+model with an API key selected – nothing to run.
      return;
    }

    // Call backend to create a run and get model outputs.
    setIsRunning(true);
    setCurrentRunId(null);
    setVotedModelRowId(null);
    setResults(
      activeCombos.map((combo) => ({
        id: `${combo.providerId}:${combo.modelId}`,
        providerId: combo.providerId,
        providerLabel: combo.providerLabel,
        modelId: combo.modelId,
        modelLabel: combo.modelLabel,
        text: "",
        modelRowId: "",
        status: "streaming"
      }))
    );

    const modelPayload = providersWithKeys.flatMap((p) =>
      p.selectedModelIds.map((modelId) => ({
        providerId: p.providerId,
        modelId,
        apiKey: p.apiKey || undefined
      }))
    );

    createRun(trimmed, modelPayload)
      .then((run) => {
        // For now, we don't yet use runId; we only want results.
        setCurrentRunId(run.runId);
        const animatedResults: ModelResult[] = run.results.map((r) => ({
          id: `${r.providerId}:${r.modelId}`,
          providerId: r.providerId,
          providerLabel: r.providerLabel,
          modelId: r.modelId,
          modelLabel: r.modelLabel,
          modelRowId: r.modelRowId,
          text: "",
          status: "streaming"
        }));
        setResults(animatedResults);

        // Animate "streaming" from full output text we got from backend.
        run.results.forEach((r, index) => {
          const words = r.output.split(" ");
          let i = 0;
          const interval = setInterval(() => {
            i++;
            setResults((prev) =>
              prev.map((existing) =>
                existing.providerId === r.providerId && existing.modelId === r.modelId
                  ? {
                      ...existing,
                      text: words.slice(0, i).join(" "),
                      status: i >= words.length ? "done" : "streaming"
                    }
                  : existing
              )
            );
            if (i >= words.length) {
              clearInterval(interval);
              if (index === run.results.length - 1) {
                setIsRunning(false);
              }
            }
          }, 25);
        });
      })
      .catch((err) => {
        console.error("Failed to run prompt", err);
        setResults((prev) =>
          prev.map((r) => ({
            ...r,
            status: "error",
            text: r.text || "Error running prompt. Check backend logs."
          }))
        );
        setIsRunning(false);
      });
  };

  const totalSelectedModels = providers.reduce(
    (acc, p) => acc + p.selectedModelIds.length,
    0
  );
  const canRun = prompt.trim().length > 0 && totalSelectedModels > 0 && !isRunning;

  return (
    <main className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#ede9fe_0,_transparent_55%)]">
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
              href="/leaderboard"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Leaderboard
            </Link>
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <section className="container flex-1 py-6 md:py-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              New prompt experiment
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Draft a prompt, choose your models, and watch responses stream in side by
              side.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRun}
              disabled={!canRun}
              className="shadow-sm"
            >
              {isRunning ? "Running..." : "Run across models"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>
                Describe the task in as much detail as you need. The same prompt is sent
                to all selected models.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Compare how different LLMs design a SaaS onboarding flow for a product analytics tool."
              />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{prompt.length} characters</span>
                <span>Backend streaming & cost tracking coming in the next step.</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Models & API keys</CardTitle>
                <CardDescription>
                  Choose specific models under each provider and (optionally) enter your
                  own API key for that provider. Keys stay in the browser by default.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {providers.map((pState) => {
                  const providerMeta = PROVIDERS.find(
                    (prov) => prov.id === pState.providerId
                  )!;
                  const baseModels = providerMeta.models;
                  const customIds = pState.selectedModelIds.filter(
                    (id) => !baseModels.some((m) => m.id === id)
                  );
                  const allModels = [
                    ...baseModels,
                    ...customIds.map((id) => ({ id, label: id }))
                  ];
                  const inputValue = customModelInputs[pState.providerId] ?? "";

                  const addCustomModel = () => {
                    const trimmed = inputValue.trim();
                    if (!trimmed) return;
                    // Already in selected list; nothing to do.
                    if (pState.selectedModelIds.includes(trimmed)) return;

                    // We don't mutate the global config; instead we just treat the
                    // custom id as another selectable model under this provider.
                    setProviders((prev) =>
                      prev.map((p) =>
                        p.providerId === pState.providerId
                          ? {
                              ...p,
                              selectedModelIds: p.selectedModelIds.includes(trimmed)
                                ? p.selectedModelIds
                                : [...p.selectedModelIds, trimmed]
                            }
                          : p
                      )
                    );
                    setCustomModelInputs((prev) => ({
                      ...prev,
                      [pState.providerId]: ""
                    }));
                  };

                  return (
                    <div
                      key={pState.providerId}
                      className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {providerMeta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Choose models and, if you want, paste your own API key.
                          </span>
                        </div>
                        <div className="w-full md:w-64">
                          <Input
                            type="password"
                            placeholder={`${providerMeta.label} API key (optional)`}
                            value={pState.apiKey}
                            onChange={(e) =>
                              updateApiKey(pState.providerId, e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allModels.map((model) => {
                          const active = pState.selectedModelIds.includes(model.id);
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() =>
                                toggleModel(pState.providerId, model.id)
                              }
                              className={[
                                "px-3 py-1.5 rounded-full text-[11px] font-medium border transition",
                                active
                                  ? "border-sky-500 bg-sky-500/10 text-sky-700"
                                  : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
                              ].join(" ")}
                            >
                              {model.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Input
                          type="text"
                          placeholder="Custom model id (e.g. gpt-4.1-nano)"
                          value={inputValue}
                          onChange={(e) =>
                            setCustomModelInputs((prev) => ({
                              ...prev,
                              [pState.providerId]: e.target.value
                            }))
                          }
                          className="h-8 text-[11px] md:w-64"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomModel();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-[11px]"
                          onClick={addCustomModel}
                        >
                          Add model
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 md:-mx-2 md:px-2">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className={[
                    "min-w-[280px] md:min-w-[360px] max-w-[420px] flex flex-col shadow-sm transition border-2",
                    votedModelRowId === r.modelRowId
                      ? "border-sky-500/80 shadow-[0_0_0_1px_rgba(56,189,248,0.3)]"
                      : "border-border"
                  ].join(" ")}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2 text-sm">
                      <span className="flex flex-col">
                        <span className="font-medium">{r.modelLabel}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.providerLabel}
                        </span>
                      </span>
                      <span
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-background/80"
                      >
                        {r.status === "idle" && "Waiting"}
                        {r.status === "streaming" && "Streaming"}
                        {r.status === "done" && "Complete"}
                        {r.status === "error" && "Error"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground">
                      {r.text
                        ? "Preview of streaming output:"
                        : "Run an experiment to see this model's response."}
                    </div>
                    <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm overflow-auto whitespace-pre-wrap leading-relaxed">
                      {r.text || "No output yet."}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-muted-foreground">
                        {votedModelRowId === r.modelRowId
                          ? "You marked this as best."
                          : "Pick your favorite response."}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={votedModelRowId === r.modelRowId ? "subtle" : "outline"}
                        className="h-7 px-3 text-[11px]"
                        disabled={r.status !== "done"}
                        onClick={async () => {
                          // Always reflect the vote in the UI, even if we can't persist it.
                          setVotedModelRowId(r.modelRowId || r.id);
                          if (!currentRunId || !r.modelRowId) {
                            return;
                          }
                          try {
                            await voteForModel(currentRunId, r.modelRowId);
                          } catch (err) {
                            console.error("Failed to vote", err);
                          }
                        }}
                      >
                        {votedModelRowId === r.modelRowId ? "Voted" : "Vote as best"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


