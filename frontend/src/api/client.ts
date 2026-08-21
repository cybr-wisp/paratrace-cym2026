// API client -- BASE_URL stays empty when running behind the Vite dev proxy.
const BASE_URL = "";

export interface AnalyzeResponse {
  features: Record<string, number | null>;
  prediction: { label: string; confidence: number } | null;
  category_scores: Record<string, number>;
}

export interface RewriteResponse {
  rewritten_text: string;
  model: string;
  level: number;
  level_name: string;
  backend: string;
}

export interface CompareResponse {
  original_analysis: AnalyzeResponse;
  rewritten_text: string;
  rewritten_analysis: AnalyzeResponse;
  semantic_similarity: number;
  rewrite?: RewriteResponse;
}

export interface TraceLevelResponse {
  level: number;
  level_name: string;
  rewritten_text: string;
  rewritten_analysis: AnalyzeResponse;
  semantic_similarity: number;
  model: string;
  backend: string;
}

export interface FullTraceResponse {
  original_analysis: AnalyzeResponse;
  backend: string;
  cached: boolean;
  cache_mode: "memory-only" | string;
  levels: TraceLevelResponse[];
}

async function readError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return typeof body?.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await readError(res, `Analyze failed: ${res.status}`));
  return res.json();
}

export async function rewriteText(text: string, level: number, backend: string): Promise<RewriteResponse> {
  const res = await fetch(`${BASE_URL}/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, level, backend }),
  });
  if (!res.ok) throw new Error(await readError(res, `Rewrite failed: ${res.status}`));
  return res.json();
}

export async function compareText(text: string, level: number, backend: string): Promise<CompareResponse> {
  const res = await fetch(`${BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, level, backend }),
  });
  if (!res.ok) throw new Error(await readError(res, `Compare failed: ${res.status}`));
  return res.json();
}

export async function traceText(text: string, backend: string, force = false): Promise<FullTraceResponse> {
  const res = await fetch(`${BASE_URL}/trace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, backend, force }),
  });
  if (!res.ok) throw new Error(await readError(res, `Full trace failed: ${res.status}`));
  return res.json();
}

export async function fetchResults(endpoint: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/results/${endpoint}`);
  if (!res.ok) throw new Error(await readError(res, `Results fetch failed: ${res.status}`));
  return res.json();
}
