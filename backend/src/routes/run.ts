import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { PROVIDERS, type ProviderId } from "../config/models";
import { getPgClient } from "../db";

export const runRouter = Router();

const RunRequestSchema = z.object({
  prompt: z.string().min(1),
  models: z
    .array(
      z.object({
        providerId: z.custom<ProviderId>(),
        modelId: z.string(),
        apiKey: z.string().optional()
      })
    )
    .min(1)
});

type RunRequest = z.infer<typeof RunRequestSchema>;

runRouter.post("/", async (req, res) => {
  const parse = RunRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body", details: parse.error.flatten() });
  }

  const body: RunRequest = parse.data;
  const runId = uuidv4();

  const results = await Promise.all(
    body.models.map(async (m) => {
      const providerMeta = PROVIDERS.find((p) => p.id === m.providerId);
      const modelMeta = providerMeta?.models.find((mod) => mod.id === m.modelId);

      const providerLabel = providerMeta?.label ?? m.providerId;
      const modelLabel = modelMeta?.label ?? m.modelId;

      // If we have a key and know how to talk to this provider, call it live.
      const providerId = m.providerId;
      const apiKey =
        m.apiKey ||
        (providerId === "openai"
          ? process.env.OPENAI_API_KEY
          : providerId === "anthropic"
          ? process.env.ANTHROPIC_API_KEY
          : providerId === "google"
          ? process.env.GEMINI_API_KEY
          : providerId === "mistral"
          ? process.env.MISTRAL_API_KEY
          : providerId === "meta"
          ? process.env.LLAMA_API_KEY
          : undefined);

      if (apiKey) {
        try {
          let live:
            | { output: string; promptTokens: number; completionTokens: number }
            | null = null;

          if (providerId === "openai") {
            live = await callOpenAIChat(m.modelId, body.prompt, apiKey);
          } else if (providerId === "anthropic") {
            live = await callAnthropicMessages(m.modelId, body.prompt, apiKey);
          } else if (providerId === "google") {
            live = await callGeminiGenerateContent(m.modelId, body.prompt, apiKey);
          } else if (providerId === "mistral") {
            live = await callMistralChat(m.modelId, body.prompt, apiKey);
          } else if (providerId === "meta") {
            live = await callLlamaChat(m.modelId, body.prompt, apiKey);
          }

          if (live) {
            const costUsd = estimateMockCost(
              providerId,
              m.modelId,
              live.promptTokens,
              live.completionTokens
            );

            return {
              providerId,
              providerLabel,
              modelId: m.modelId,
              modelLabel,
              output: live.output,
              usage: {
                promptTokens: live.promptTokens,
                completionTokens: live.completionTokens,
                totalTokens: live.promptTokens + live.completionTokens,
                costUsd
              },
              modelRowId: ""
            };
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Live call failed for provider ${providerId}`, err);
        }
      }

      // Fallback: mocked output for providers we haven't wired up yet
      const output = buildMockCompletion(providerLabel, modelLabel, body.prompt);
      const promptTokens = Math.ceil(body.prompt.length / 4);
      const completionTokens = Math.ceil(output.length / 4);
      const costUsd = estimateMockCost(m.providerId, m.modelId, promptTokens, completionTokens);

      return {
        providerId: m.providerId,
        providerLabel,
        modelId: m.modelId,
        modelLabel,
        output,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          costUsd
        },
        // modelRowId will be filled once we persist to Postgres
        modelRowId: ""
      };
    })
  );

  const totalCostUsd = results.reduce(
    (sum, r) => (r.usage.costUsd != null ? sum + r.usage.costUsd : sum),
    0
  );

  // Persist run + model rows if Postgres is configured.
  let resultsWithIds = results;
  try {
    const client = await getPgClient();
    try {
      await client.query("begin");
      await client.query(
        `insert into prompt_runs (id, prompt_text, total_cost_usd) values ($1, $2, $3)`,
        [runId, body.prompt, totalCostUsd || null]
      );

      const hydrated: typeof resultsWithIds = [];
      for (const r of results) {
        const modelRowId = uuidv4();
        await client.query(
          `
          insert into prompt_run_models (
            id, run_id, provider_id, provider_label, model_id, model_label,
            output, prompt_tokens, completion_tokens, total_tokens, cost_usd
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            modelRowId,
            runId,
            r.providerId,
            r.providerLabel,
            r.modelId,
            r.modelLabel,
            r.output,
            r.usage.promptTokens,
            r.usage.completionTokens,
            r.usage.totalTokens,
            r.usage.costUsd ?? null
          ]
        );
        hydrated.push({
          ...r,
          modelRowId
        });
      }

      await client.query("commit");
      resultsWithIds = hydrated;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to persist run; continuing without DB", err);
  }

  return res.json({
    runId,
    results: resultsWithIds,
    totalCostUsd
  });
});

async function callOpenAIChat(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ output: string; promptTokens: number; completionTokens: number }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const message = data.choices?.[0]?.message?.content ?? "";
  const promptTokens: number = data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
  const completionTokens: number =
    data.usage?.completion_tokens ?? Math.ceil(message.length / 4);

  return {
    output: String(message),
    promptTokens,
    completionTokens
  };
}

async function callAnthropicMessages(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ output: string; promptTokens: number; completionTokens: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const contentBlock = data.content?.[0];
  const text =
    typeof contentBlock?.text === "string"
      ? contentBlock.text
      : Array.isArray(contentBlock?.content)
      ? contentBlock.content.map((p: any) => p.text ?? "").join("\n")
      : "";

  const promptTokens: number =
    data.usage?.input_tokens ?? Math.ceil(prompt.length / 4);
  const completionTokens: number =
    data.usage?.output_tokens ?? Math.ceil(text.length / 4);

  return {
    output: String(text),
    promptTokens,
    completionTokens
  };
}

async function callGeminiGenerateContent(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ output: string; promptTokens: number; completionTokens: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const candidate = data.candidates?.[0];
  let text = "";
  if (candidate?.content?.parts) {
    text = candidate.content.parts.map((p: any) => p.text ?? "").join("\n");
  }

  // Gemini's public API may not always return token usage; approximate if needed.
  const totalTokens: number =
    data.usage?.total_tokens ?? Math.ceil((prompt.length + text.length) / 4);
  const promptTokens: number =
    data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
  const completionTokens: number = Math.max(totalTokens - promptTokens, 1);

  return {
    output: String(text),
    promptTokens,
    completionTokens
  };
}

async function callMistralChat(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ output: string; promptTokens: number; completionTokens: number }> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const message = data.choices?.[0]?.message?.content ?? "";
  const promptTokens: number = data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
  const completionTokens: number =
    data.usage?.completion_tokens ?? Math.ceil(message.length / 4);

  return {
    output: String(message),
    promptTokens,
    completionTokens
  };
}

async function callLlamaChat(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ output: string; promptTokens: number; completionTokens: number }> {
  // Many Llama providers expose an OpenAI-compatible chat API.
  // You can override the base URL via LLAMA_API_BASE_URL; otherwise this uses Groq's style path.
  const baseUrl =
    process.env.LLAMA_API_BASE_URL ||
    "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Llama provider error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const message = data.choices?.[0]?.message?.content ?? "";
  const promptTokens: number = data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
  const completionTokens: number =
    data.usage?.completion_tokens ?? Math.ceil(message.length / 4);

  return {
    output: String(message),
    promptTokens,
    completionTokens
  };
}

function buildMockCompletion(
  providerLabel: string,
  modelLabel: string,
  prompt: string
): string {
  return [
    `[${providerLabel} – ${modelLabel}]`,
    "",
    "This is a mocked completion. In a real deployment, this text will come from",
    "the provider's streaming API so you can watch tokens arrive in real time.",
    "",
    "For now, treat this as a design + product harness so you can iterate on",
    "prompt structure, comparison UX, and analytics without needing API keys.",
    "",
    "Prompt that would have been sent:",
    `> ${prompt}`
  ].join("\n");
}

function estimateMockCost(
  providerId: ProviderId,
  _modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const totalTokens = promptTokens + completionTokens;

  const per1k: number =
    providerId === "openai"
      ? 0.003
      : providerId === "anthropic"
      ? 0.004
      : providerId === "google"
      ? 0.0025
      : providerId === "meta"
      ? 0.0015
      : 0.0018;

  return +(per1k * (totalTokens / 1000)).toFixed(5);
}


