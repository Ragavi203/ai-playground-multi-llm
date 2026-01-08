import axios from "axios";
import type { ProviderId } from "@/config/models";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export interface RunRequestModel {
  providerId: ProviderId;
  modelId: string;
  apiKey?: string;
}

export interface RunResponseItem {
  providerId: ProviderId;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  modelRowId: string;
  output: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number | null;
  };
}

export interface RunResponse {
  runId: string;
  results: RunResponseItem[];
  totalCostUsd: number | null;
}

export async function createRun(prompt: string, models: RunRequestModel[]) {
  const { data } = await axios.post<RunResponse>(`${API_BASE_URL}/api/run`, {
    prompt,
    models
  });
  return data;
}

export interface LeaderboardRow {
  modelLabel: string;
  providerLabel: string;
  wins: number;
  runs: number;
  winRate: number;
}

export async function voteForModel(runId: string, modelRowId: string) {
  await axios.post(`${API_BASE_URL}/api/vote`, {
    runId,
    modelRowId
  });
}

export async function fetchLeaderboard() {
  const { data } = await axios.get<{ rows: LeaderboardRow[] }>(
    `${API_BASE_URL}/api/leaderboard`
  );
  return data.rows;
}

export interface RunSummary {
  id: string;
  promptText: string;
  createdAt: string;
  totalCostUsd: number | null;
  modelCount: number;
}

export interface RunDetailModel {
  id: string;
  providerId: ProviderId;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  output: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
}

export interface RunDetail {
  id: string;
  promptText: string;
  createdAt: string;
  totalCostUsd: number | null;
  models: RunDetailModel[];
}

export async function fetchRuns() {
  const { data } = await axios.get<{ runs: RunSummary[] }>(
    `${API_BASE_URL}/api/runs`
  );
  return data.runs;
}

export async function fetchRunById(id: string) {
  const { data } = await axios.get<{ run: RunDetail }>(
    `${API_BASE_URL}/api/runs/${id}`
  );
  return data.run;
}

export async function deleteRun(id: string) {
  await axios.delete(`${API_BASE_URL}/api/runs/${id}`);
}


