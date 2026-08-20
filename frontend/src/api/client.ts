// API client -- swap BASE_URL to "" when running behind Vite proxy,
// or "http://localhost:8000" for direct access.

const BASE_URL = "";

export interface AnalyzeResponse {
  features: Record<string, number | null>;
  prediction: { label: string; confidence: number };
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
}

export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function rewriteText(
  text: string, level: number, backend: string
): Promise<RewriteResponse> {
  const res = await fetch(`${BASE_URL}/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, level, backend }),
  });
  if (!res.ok) throw new Error(`Rewrite failed: ${res.status}`);
  return res.json();
}

export async function compareText(
  text: string, level: number, backend: string
): Promise<CompareResponse> {
  const res = await fetch(`${BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, level, backend }),
  });
  if (!res.ok) throw new Error(`Compare failed: ${res.status}`);
  return res.json();
}

export async function fetchResults(endpoint: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/results/${endpoint}`);
  if (!res.ok) throw new Error(`Results fetch failed: ${res.status}`);
  return res.json();
}
