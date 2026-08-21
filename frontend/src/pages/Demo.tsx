import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { analyzeText, compareText, traceText, type AnalyzeResponse, type FullTraceResponse } from "../api/client";
import { FEATURE_LABELS, SAMPLE, SAMPLE_REWRITE } from "../types/analysis";
import { GUIDED_TEXT, L2_FEATURE_CHANGES, REWRITE_LEVELS, STUDY_ACCURACY } from "../data/study";
import { CategoryRadar, FeatureDeltaChart, LiveHistoryChart, LiveProxyBars, StudyAccuracyChart } from "../components/ScientificCharts";

type Props = { onOpenResearch: () => void };
type DemoMode = "full" | "live";
type Backend = "openai" | "anthropic";
type PipelineMode = "current" | "proposed";

type TraceLevel = {
  level: number;
  text: string;
  analysis?: AnalyzeResponse;
  semanticSimilarity?: number;
  source: "backend" | "guided";
};

type Proxy = {
  words: number;
  uniqueRatio: number;
  fillerRate: number;
  repetitionRate: number;
  fragmentRate: number;
  pronounShare: number;
  contentShare: number;
  meanSentenceLength: number;
};

function SectionIndex({ index, children, dark = false }: { index: string; children: ReactNode; dark?: boolean }) {
  return <div className={dark ? "section-index dark" : "section-index"}><span>{index}</span><span>{children}</span></div>;
}

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isGuidedSample(text: string) {
  return normalizeText(text) === normalizeText(SAMPLE.text);
}

function proxyFeatures(text: string): Proxy {
  const tokens = text.match(/[A-Za-z']+|\.\.\.|—|-/g) ?? [];
  const words = tokens.filter((token) => /[A-Za-z]/.test(token));
  const lower = words.map((word) => word.toLowerCase());
  const n = Math.max(1, lower.length);
  const fillers = lower.filter((word) => ["um", "uh", "er", "ah", "hmm", "well", "like"].includes(word)).length;
  const fragments = (text.match(/\b[A-Za-z]+-|\.\.\./g) ?? []).length;
  let repeats = 0;
  for (let i = 1; i < lower.length; i += 1) if (lower[i] === lower[i - 1]) repeats += 1;
  const pronouns = lower.filter((word) => ["i", "me", "my", "we", "us", "our", "you", "he", "him", "his", "she", "her", "they", "them", "their", "it"].includes(word)).length;
  const stop = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "and", "or", "but", "to", "of", "in", "on", "at", "for", "from", "with", "this", "that", "it", "as"]);
  const content = lower.filter((word) => word.length > 2 && !stop.has(word)).length;
  const sentenceCount = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim()).length);
  return {
    words: lower.length,
    uniqueRatio: new Set(lower).size / n,
    fillerRate: fillers / n,
    repetitionRate: repeats / n,
    fragmentRate: fragments / n,
    pronounShare: pronouns / n,
    contentShare: content / n,
    meanSentenceLength: lower.length / sentenceCount,
  };
}

function localPreviewRewrite(text: string, level: number) {
  if (level === 0) return text;
  let out = text;
  if (level >= 1) {
    out = out.replace(/\s+([,.!?])/g, "$1").replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, char: string) => `${prefix}${char.toUpperCase()}`);
  }
  if (level >= 2) {
    out = out.replace(/\b(um+|uh+|er+|ah+|hmm+|well)\b[,.… ]*/gi, "");
  }
  if (level >= 3) {
    out = out.replace(/\b(\w+)\s+\1\b/gi, "$1").replace(/\.\.\./g, "").replace(/\s{2,}/g, " ").trim();
  }
  if (level >= 4) {
    out = out.replace(/\bthere(?:'s| is)\b/gi, "There is").replace(/\bthe boy is\b/gi, "a boy is").replace(/\bthe girl\b/gi, "a girl");
  }
  if (out && !/[.!?]$/.test(out)) out += ".";
  return out || text;
}

function proxyChartData(proxy: Proxy) {
  return [
    { label: "Lexical", value: Math.min(1, proxy.uniqueRatio), display: proxy.uniqueRatio.toFixed(3) },
    { label: "Fillers", value: Math.min(1, proxy.fillerRate * 18), display: `${(proxy.fillerRate * 100).toFixed(2)}%` },
    { label: "Repeat", value: Math.min(1, proxy.repetitionRate * 18), display: `${(proxy.repetitionRate * 100).toFixed(2)}%` },
    { label: "Fragments", value: Math.min(1, proxy.fragmentRate * 18), display: `${(proxy.fragmentRate * 100).toFixed(2)}%` },
    { label: "Pronouns", value: Math.min(1, proxy.pronounShare * 5), display: `${(proxy.pronounShare * 100).toFixed(1)}%` },
    { label: "Content", value: Math.min(1, proxy.contentShare), display: `${(proxy.contentShare * 100).toFixed(1)}%` },
    { label: "Sent. len.", value: Math.min(1, proxy.meanSentenceLength / 30), display: proxy.meanSentenceLength.toFixed(1) },
  ];
}

function MarkedText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  const seen = new Map<string, number>();
  return <>{parts.map((part, index) => {
    const clean = part.toLowerCase().replace(/[^a-z']/g, "");
    const count = clean ? (seen.get(clean) ?? 0) : 0;
    if (clean) seen.set(clean, count + 1);
    if (/^(um|uh|er|ah|hmm|well|like)$/.test(clean)) return <mark className="mark-filler" key={index}>{part}</mark>;
    if (part.includes("...") || /[A-Za-z]-$/.test(part)) return <mark className="mark-fragment" key={index}>{part}</mark>;
    if (clean.length > 2 && count > 0) return <mark className="mark-repeat" key={index}>{part}</mark>;
    return <span key={index}>{part}</span>;
  })}</>;
}

function FeatureTable({ features, compare }: { features: Record<string, number | null>; compare?: Record<string, number | null> }) {
  const rows = Object.keys(FEATURE_LABELS);
  return <div className="feature-table">
    <div className="feature-table-head"><span>FEATURE</span><span>ORIGINAL</span>{compare && <span>REWRITTEN</span>}{compare && <span>Δ</span>}</div>
    {rows.map((name) => {
      const before = features[name];
      const after = compare?.[name];
      const b = typeof before === "number" ? before : null;
      const a = typeof after === "number" ? after : null;
      const delta = b !== null && a !== null ? ((a - b) / Math.max(Math.abs(b), 1e-6)) * 100 : null;
      return <div className="feature-table-row" key={name}><span>{FEATURE_LABELS[name]}</span><code>{b === null ? "—" : b.toFixed(3)}</code>{compare && <code>{a === null ? "—" : a.toFixed(3)}</code>}{compare && <code className={delta !== null && Math.abs(delta) > 5 ? "delta-hot" : ""}>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}</code>}</div>;
    })}
  </div>;
}

function StepRail({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const labels = ["Input", "Analyze", "Erasure", "Solution"];
  return <div className="demo-step-rail">
    {labels.map((label, index) => <button key={label} className={index === step ? "demo-step active" : index < step ? "demo-step complete" : "demo-step"} onClick={() => index <= step && onStep(index)} disabled={index > step}>
      <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><i />
    </button>)}
  </div>;
}

export default function Demo({ onOpenResearch }: Props) {
  const [mode, setMode] = useState<DemoMode>("full");
  const [step, setStep] = useState(0);
  const [fullText, setFullText] = useState(SAMPLE.text);
  const [backend, setBackend] = useState<Backend>("openai");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisSource, setAnalysisSource] = useState<"backend" | "guided" | null>(null);
  const [traces, setTraces] = useState<Record<number, TraceLevel>>({});
  const [selectedTrace, setSelectedTrace] = useState(4);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [pipeline, setPipeline] = useState<PipelineMode>("current");
  const [traceCacheHit, setTraceCacheHit] = useState<boolean | null>(null);

  const [liveText, setLiveText] = useState(SAMPLE.text);
  const [liveLevel, setLiveLevel] = useState(3);
  const [liveBackend, setLiveBackend] = useState<Backend>("openai");
  const [liveVerifiedTrace, setLiveVerifiedTrace] = useState<FullTraceResponse | null>(null);
  const [liveStatus, setLiveStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const [history, setHistory] = useState<{ n: number; lexical: number; filler: number; repetition: number }[]>([]);
  const recRef = useRef<any>(null);

  const fullWords = useMemo(() => proxyFeatures(fullText).words, [fullText]);
  const liveProxy = useMemo(() => proxyFeatures(liveText), [liveText]);
  const liveRewrite = useMemo(() => localPreviewRewrite(liveText, liveLevel), [liveText, liveLevel]);
  const liveRewriteProxy = useMemo(() => proxyFeatures(liveRewrite), [liveRewrite]);

  useEffect(() => {
    if (!liveText.trim()) {
      setHistory([]);
      return;
    }
    const point = {
      n: Date.now(),
      lexical: Math.min(1, liveProxy.uniqueRatio),
      filler: Math.min(1, liveProxy.fillerRate * 18),
      repetition: Math.min(1, liveProxy.repetitionRate * 18),
    };
    setHistory((current) => [...current.slice(-23), point]);
  }, [liveText, liveProxy.uniqueRatio, liveProxy.fillerRate, liveProxy.repetitionRate]);

  useEffect(() => {
    setLiveVerifiedTrace(null);
    setLiveStatus("");
  }, [liveText]);

  const resetFull = () => {
    setStep(0); setAnalysis(null); setAnalysisSource(null); setTraces({}); setTraceCacheHit(null); setError(""); setProgress("");
  };

  const runAnalysis = async () => {
    setBusy(true); setError(""); setProgress("Extracting 20 biomarkers from the raw transcript…");
    try {
      const result = await analyzeText(fullText);
      setAnalysis(result); setAnalysisSource("backend"); setStep(1);
    } catch (err) {
      if (isGuidedSample(fullText)) {
        setAnalysis({ features: SAMPLE.features, prediction: SAMPLE.prediction, category_scores: {} });
        setAnalysisSource("guided"); setStep(1);
        setError("FastAPI was not reachable, so ParaTrace loaded the repository's guided sample profile. Start the backend to analyze arbitrary transcripts with the research pipeline.");
      } else {
        setError("The research backend is not reachable. Start FastAPI, then run Analyze again. Your text has not been changed.");
      }
    } finally { setBusy(false); setProgress(""); }
  };

  const runRewrites = async () => {
    setBusy(true); setError(""); setTraces({}); setTraceCacheHit(null);
    setProgress("Generating L1–L4 in parallel, then extracting all verified feature vectors once…");
    try {
      const result = await traceText(fullText, backend);
      const next: Record<number, TraceLevel> = {};
      result.levels.forEach((item) => {
        next[item.level] = {
          level: item.level,
          text: item.rewritten_text,
          analysis: item.rewritten_analysis,
          semanticSimilarity: item.semantic_similarity,
          source: "backend",
        };
      });
      setAnalysis(result.original_analysis);
      setAnalysisSource("backend");
      setTraces(next);
      setTraceCacheHit(result.cached);
      setSelectedTrace(1);
      setStep(2);
    } catch (traceErr) {
      // Compatibility fallback for anyone who copied the frontend before the
      // v3 /trace endpoint. This still uses verified /compare calls; it is not
      // the old random/local feature simulation.
      try {
        setProgress("Full-trace endpoint unavailable; trying four verified comparisons in parallel…");
        const results = await Promise.all(
          REWRITE_LEVELS.map((item) => compareText(fullText, item.level, backend))
        );
        const next: Record<number, TraceLevel> = {};
        results.forEach((result, index) => {
          const level = REWRITE_LEVELS[index].level;
          next[level] = {
            level,
            text: result.rewritten_text,
            analysis: result.rewritten_analysis,
            semanticSimilarity: result.semantic_similarity,
            source: "backend",
          };
        });
        setAnalysis(results[0].original_analysis);
        setAnalysisSource("backend");
        setTraces(next);
        setTraceCacheHit(false);
        setSelectedTrace(1);
        setStep(2);
      } catch (compareErr) {
        if (isGuidedSample(fullText)) {
          const guided: Record<number, TraceLevel> = {};
          REWRITE_LEVELS.forEach((item) => {
            guided[item.level] = {
              level: item.level,
              text: GUIDED_TEXT[item.level],
              analysis: item.level === 4 ? { features: SAMPLE_REWRITE.features, prediction: SAMPLE_REWRITE.prediction, category_scores: {} } : undefined,
              source: "guided",
            };
          });
          setTraces(guided); setTraceCacheHit(null); setSelectedTrace(1); setStep(2);
          setError("Verified L1–L4 generation was unavailable, so the offline guided replay is shown. Start the v3 backend + selected LLM key to compute all four transcript-specific feature profiles once and switch between them instantly.");
        } else {
          const detail = traceErr instanceof Error ? traceErr.message : "The full trace could not be generated.";
          setError(`${detail} Start the v3 FastAPI backend and confirm the selected LLM API key.`);
        }
      }
    } finally { setBusy(false); setProgress(""); }
  };

  const verifyLive = async () => {
    setLiveStatus("Generating the verified L1–L4 trace once…");
    setLiveVerifiedTrace(null);
    try {
      const result = await traceText(liveText, liveBackend);
      setLiveVerifiedTrace(result);
      setLiveStatus(result.cached
        ? "Verified L1–L4 trace loaded instantly from the in-memory cache. Switch levels freely."
        : "Verified L1–L4 trace complete. All four levels are now precomputed; switching levels is instant.");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Backend unavailable.";
      setLiveStatus(`${detail} The charts above still update in real time, but they are browser-side surface measurements—not the verified 20-feature research pipeline.`);
    }
  };

  const toggleRecording = useCallback(() => {
    if (recording) {
      recRef.current?.stop(); setRecording(false); return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Browser speech recognition is unavailable here. You can type or paste a transcript instead."); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
    let finalText = liveText;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += `${event.results[i][0].transcript} `;
        else interim += event.results[i][0].transcript;
      }
      setLiveText(finalText + interim);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recRef.current = recognition; recognition.start(); setRecording(true);
  }, [liveText, recording]);

  const selected = traces[selectedTrace];
  const selectedStudy = STUDY_ACCURACY[selectedTrace];
  const liveVerifiedLevel = liveLevel > 0 ? liveVerifiedTrace?.levels.find((item) => item.level === liveLevel) : undefined;
  const liveDisplayText = liveVerifiedLevel?.rewritten_text ?? liveRewrite;
  const liveDisplayProxy = proxyFeatures(liveDisplayText);

  return <div className="demo-page">
    <section className="hero-section demo-hero-compact">
      <div className="hero-copy">
        <SectionIndex index="01 / DEMONSTRATION">CLINICAL LANGUAGE PRESERVATION</SectionIndex>
        <h1>Watch a clinical trace<br /><em>disappear under rewriting.</em></h1>
        <p className="hero-deck">Enter a transcript, extract its linguistic profile, compute the four intervention levels once, then inspect what survived instantly. For a booth demo, the same interface also provides an instant, non-diagnostic live lab while a visitor speaks or types.</p>
        <div className="hero-metrics"><div><strong>552</strong><span>transcripts</span></div><div><strong>4,416</strong><span>rewrites</span></div><div><strong>20</strong><span>biomarkers</span></div><div><strong>19/20</strong><span>changed by L2</span></div></div>
      </div>
      <div className="hero-visual"><div className="visual-kicker"><span>REPOSITORY-REPORTED SUMMARY</span><span>MEANING ≥83%</span></div><StudyAccuracyChart activeLevel={3} /><div className="hero-finding-row"><div><span>L0 CV BASELINE</span><strong>73.4%</strong><small>5-fold cross-validation</small></div><div className="danger-metric"><span>L3 DEGRADATION</span><strong>50.7%</strong><small>average of two backend evaluations</small></div></div><p className="hero-protocol-footnote">The repository currently uses different evaluation procedures for the L0 CV baseline and the L1–L4 degradation artifact. The Research tab documents this explicitly.</p></div>
    </section>

    <div className="mode-switch lab-mode-switch">
      <button className={mode === "full" ? "mode-button active" : "mode-button"} onClick={() => setMode("full")}><span>01</span> Full four-step demo</button>
      <button className={mode === "live" ? "mode-button active" : "mode-button"} onClick={() => setMode("live")}><span>02</span> Live signal lab</button>
      <button className="mode-button" onClick={onOpenResearch}><span>03</span> Research evidence ↗</button>
    </div>

    {mode === "full" ? <section className="full-demo-section" id="experiment">
      <div className="full-demo-head"><div><SectionIndex index="02 / FULL DEMO">INPUT → ANALYZE → ERASURE → SOLUTION</SectionIndex><h2>One transcript. Four intervention levels. One trace.</h2></div><button className="text-action" onClick={resetFull}>Reset demo ↺</button></div>
      <StepRail step={step} onStep={setStep} />

      {step === 0 && <div className="step-workspace input-workspace">
        <div className="step-copy"><span className="workspace-kicker">STEP 01 / INPUT</span><h3>Start with the raw linguistic measurement surface.</h3><p>Paste any transcript. For a fully computed run, the FastAPI backend extracts the same 20-feature representation used by ParaTrace. The included Cookie Theft sample can also replay offline.</p><div className="input-actions"><button className="text-action" onClick={() => setFullText(SAMPLE.text)}>Load guided Cookie Theft example</button><span>{fullWords} words</span></div></div>
        <div className="scientific-editor"><div className="editor-top"><span>RAW TRANSCRIPT</span><span>UTF-8 / FREE TEXT</span></div><textarea value={fullText} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setFullText(e.target.value); setError(""); }} placeholder="Paste a speech transcript here…" /><div className="editor-bottom"><span>{fullWords < 10 ? "Enter at least 10 words" : "Ready for feature extraction"}</span><button className="primary-action compact" disabled={fullWords < 10 || busy} onClick={runAnalysis}>Analyze raw speech →</button></div></div>
      </div>}

      {step === 1 && analysis && <div className="step-workspace analysis-workspace">
        <div className="workspace-toolbar"><div><span className="workspace-kicker">STEP 02 / ANALYZE</span><h3>The raw profile before any generative editing.</h3></div><div className={analysisSource === "backend" ? "status-chip online" : "status-chip replay"}>{analysisSource === "backend" ? "RESEARCH BACKEND" : "GUIDED REPLAY"}</div></div>
        <div className="analysis-grid"><article className="transcript-instrument"><div className="panel-header"><div><span>RAW SPEECH</span><strong>Signal-bearing text</strong></div><span>L0</span></div><div className="instrument-transcript"><MarkedText text={fullText} /></div><div className="annotation-key"><span><i className="key-filler" /> filler / hesitation</span><span><i className="key-repeat" /> repetition</span><span><i className="key-fragment" /> fragment / pause marker</span></div></article><CategoryRadar original={analysis.features} /></div>
        <details className="feature-details"><summary>Inspect all 20 extracted features</summary><FeatureTable features={analysis.features} /></details>
        <div className="workspace-next"><div><span>LLM BACKEND</span><div className="backend-switch"><button className={backend === "openai" ? "active" : ""} onClick={() => setBackend("openai")}>OpenAI / GPT-4o-mini</button><button className={backend === "anthropic" ? "active" : ""} onClick={() => setBackend("anthropic")}>Anthropic / Claude Sonnet</button></div></div><button className="primary-action" disabled={busy} onClick={runRewrites}>Compute + cache L1 → L4 <span>→</span></button></div>
      </div>}

      {step === 2 && Object.keys(traces).length > 0 && <div className="step-workspace rewrite-workspace">
        <div className="workspace-toolbar"><div><span className="workspace-kicker">STEP 03 / ERASURE</span><h3>Inspect every intervention—not just the endpoint.</h3></div><div className="rewrite-toolbar-actions"><span className={Object.values(traces).every((trace) => trace.source === "backend") ? "status-chip online" : "status-chip replay"}>{Object.values(traces).every((trace) => trace.source === "backend") ? (traceCacheHit ? "VERIFIED · CACHE HIT" : "VERIFIED · L1–L4 READY") : "GUIDED REPLAY"}</span><button className="primary-action compact" onClick={() => setStep(3)}>See signal + solution →</button></div></div>
        <div className="rewrite-trace-selector">{REWRITE_LEVELS.map((item) => <button key={item.level} className={selectedTrace === item.level ? "rewrite-trace-tab active" : "rewrite-trace-tab"} onClick={() => setSelectedTrace(item.level)}><span>L{item.level}</span><strong>{item.name}</strong><small>{STUDY_ACCURACY[item.level].average.toFixed(1)}% study avg.</small></button>)}</div>
        {selected && <div className="rewrite-comparison"><article><div className="panel-header"><div><span>ORIGINAL / L0</span><strong>Raw speech</strong></div></div><p><MarkedText text={fullText} /></p></article><article><div className="panel-header"><div><span>REWRITE / L{selected.level}</span><strong>{REWRITE_LEVELS[selected.level - 1].name}</strong></div><span className="status eroding">{selected.source === "backend" ? "VERIFIED" : "GUIDED"}</span></div><p>{selected.text}</p></article></div>}
        <div className="rewrite-readout"><div><span>STUDY-LEVEL AVERAGE</span><strong>{selectedStudy.average.toFixed(1)}%</strong><small>diagnostic accuracy at L{selectedTrace}</small></div><div><span>OPENAI</span><strong>{selectedStudy.openai.toFixed(1)}%</strong><small>project evaluation</small></div><div><span>ANTHROPIC</span><strong>{selectedStudy.anthropic.toFixed(1)}%</strong><small>project evaluation</small></div><div><span>SEMANTIC SIM.</span><strong>{selected?.semanticSimilarity !== undefined ? `${(selected.semanticSimilarity * 100).toFixed(1)}%` : selectedTrace >= 3 ? "≥83%" : "high"}</strong><small>{selected?.semanticSimilarity !== undefined ? "this backend run" : "study finding"}</small></div></div>
        {selected?.analysis && analysis && <div className="analysis-grid post-analysis"><CategoryRadar original={analysis.features} rewritten={selected.analysis.features} /><FeatureDeltaChart original={analysis.features} rewritten={selected.analysis.features} /></div>}
        {!selected?.analysis && <div className="precision-note"><strong>No transcript-specific feature chart is shown for this offline L{selectedTrace} replay.</strong><span>That avoids inventing measurements. Start the backend to compute this transcript's actual rewritten feature vector.</span></div>}
      </div>}

      {step === 3 && <div className="step-workspace compare-workspace">
        <div className="workspace-toolbar"><div><span className="workspace-kicker">STEP 04 / SOLUTION</span><h3>The content can survive while the measurement changes.</h3></div><span className="ethics-chip">STUDY RESULT ≠ INDIVIDUAL DIAGNOSIS</span></div>
        <div className="compare-dashboard"><StudyAccuracyChart activeLevel={selectedTrace} /><div className="compare-thesis"><span>THE “WHAT / HOW” GAP</span><strong>Meaning stays high.</strong><strong className="danger-text">Diagnostic separation falls toward chance.</strong><p>ParaTrace's central result is study-level: at L3 the average accuracy is 50.7%, and at L4 it is 51.7%, even though semantic similarity remains high.</p></div></div>
        <div className="evidence-matrix full-demo-evidence">
          <div className="evidence-matrix-head"><span>EXACT L2 FEATURE CHANGE / COMMITTED STATISTICAL ARTIFACT</span><span>ANTHROPIC</span><span>OPENAI</span></div>
          {L2_FEATURE_CHANGES.map((row) => <div className="evidence-matrix-row" key={row.name}>
            <span>{row.name}</span>
            <strong className={row.significantAnthropic ? "evidence-hot" : "evidence-neutral"}>{row.anthropic > 0 ? "+" : ""}{row.anthropic.toFixed(2)}%</strong>
            <strong className={row.significantOpenAI ? "evidence-hot" : "evidence-neutral"}>{row.openai > 0 ? "+" : ""}{row.openai.toFixed(2)}%</strong>
          </div>)}
          <div className="evidence-matrix-foot"><span>19 / 20 features are significant at L2 in each backend.</span><span>Paired Wilcoxon · p &lt; 0.05</span></div>
        </div>
        <div className="protocol-mini-audit"><strong>PROTOCOL NOTE</strong><p>The 73.4% L0 figure is a 5-fold CV baseline. The committed degradation routine fits a Random Forest on all L0 samples before evaluating rewritten feature sets; its own in-sample L0 reference is 98.6%. ParaTrace therefore labels the published sequence as a repository-reported summary rather than implying one uniform cross-validation protocol.</p></div>
        <div className="solution-embed"><SectionIndex index="04.1 / SAFEGUARD" dark>PRE-EXTRACTION ARCHITECTURE</SectionIndex><div className="solution-heading"><h2>Preserve the signal <em>before</em> the rewrite.</h2><p>Separate the measurement path from the documentation path: extract biomarkers from the raw transcript, then let the scribe produce a readable note.</p></div><div className="pipeline-toggle"><button className={pipeline === "current" ? "active bad" : ""} onClick={() => setPipeline("current")}>Current pipeline</button><button className={pipeline === "proposed" ? "active good" : ""} onClick={() => setPipeline("proposed")}>ParaTrace safeguard</button></div>{pipeline === "current" ? <div className="pipeline-diagram current-pipeline"><div className="pipeline-node"><span>01</span><strong>Patient speech</strong><small>raw trace</small></div><div className="pipeline-arrow">→</div><div className="pipeline-node danger"><span>02</span><strong>AI rewrite</strong><small>signal altered</small></div><div className="pipeline-arrow danger-arrow">→</div><div className="pipeline-node danger"><span>03</span><strong>Feature extraction</strong><small>too late</small></div><div className="pipeline-result lost"><span>L3 AVG.</span><strong>50.7%</strong><small>study-level accuracy</small></div></div> : <div className="pipeline-diagram proposed-pipeline"><div className="pipeline-node"><span>01</span><strong>Patient speech</strong><small>raw trace</small></div><div className="pipeline-branch"><div className="branch-line" /><div className="pipeline-node safe"><span>02A</span><strong>Feature extraction</strong><small>preserved pre-AI</small></div><div className="pipeline-node"><span>02B</span><strong>AI scribe</strong><small>readable note</small></div></div><div className="pipeline-arrow">→</div><div className="pipeline-result kept"><span>OUTPUT</span><strong>NOTE + PROFILE</strong><small>two distinct artifacts</small></div></div>}</div>
      </div>}

      {(error || progress) && <div className={error ? "demo-message warning" : "demo-message"}><span>{error ? "NOTE" : "RUNNING"}</span><p>{error || progress}</p></div>}
      {busy && <div className="instrument-loading"><i /><span>{progress || "Running pipeline…"}</span></div>}
    </section> : <section className="live-lab-section" id="experiment">
      <div className="live-lab-head"><div><SectionIndex index="02 / LIVE LAB">REAL-TIME SPEECH TEXTURE</SectionIndex><h2>Type or speak. Watch the surface features move.</h2><p>This panel is deliberately split into two layers: instant browser-side proxies update on every keystroke, while the verified button calls your actual ParaTrace backend for the 20-feature pipeline.</p></div><span className="ethics-chip">NON-DIAGNOSTIC</span></div>
      <div className="live-console">
        <div className="live-editor-panel"><div className="editor-top"><span>LIVE TRANSCRIPT</span><span>{recording ? "● RECORDING" : "READY"}</span></div><textarea value={liveText} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setLiveText(e.target.value); setLiveVerifiedTrace(null); setLiveStatus(""); }} placeholder="Speak naturally or paste a transcript…" /><div className="editor-bottom"><span>{liveProxy.words} words</span><div><button className={recording ? "record-button recording" : "record-button"} onClick={toggleRecording}>{recording ? "■ Stop" : "● Speak"}</button><button className="text-action" onClick={() => setLiveText(SAMPLE.text)}>Load sample</button></div></div><div className="live-markup"><span>LIVE MARKUP</span><p><MarkedText text={liveText || "Your annotated transcript will appear here."} /></p></div></div>
        <div className="live-metrics-column"><div className="live-number-grid"><div><span>WORDS</span><strong>{liveProxy.words}</strong></div><div><span>UNIQUE RATIO</span><strong>{liveProxy.uniqueRatio.toFixed(2)}</strong></div><div><span>FILLERS / 100</span><strong>{(liveProxy.fillerRate * 100).toFixed(1)}</strong></div><div><span>REPEATS / 100</span><strong>{(liveProxy.repetitionRate * 100).toFixed(1)}</strong></div></div><div className="proxy-note">These four numbers are deterministic text-surface measurements. They are not the trained classifier and do not estimate cognitive status.</div></div>
      </div>
      <div className="live-chart-grid"><LiveProxyBars values={proxyChartData(liveProxy)} /><LiveHistoryChart history={history} /></div>
      <div className="live-rewrite-console"><div className="live-rewrite-controls"><div><span>ILLUSTRATIVE REWRITE INTENSITY</span><div className="level-control compact-level-control">{[0,1,2,3,4].map((level) => <button key={level} onClick={() => setLiveLevel(level)} className={level === liveLevel ? "level-step active" : "level-step"}><span className="level-dot" /><strong>L{level}</strong><small>{STUDY_ACCURACY[level].short}</small></button>)}<div className="level-track" /></div></div><div className="backend-switch"><button className={liveBackend === "openai" ? "active" : ""} onClick={() => { setLiveBackend("openai"); setLiveVerifiedTrace(null); setLiveStatus(""); }}>OpenAI</button><button className={liveBackend === "anthropic" ? "active" : ""} onClick={() => { setLiveBackend("anthropic"); setLiveVerifiedTrace(null); setLiveStatus(""); }}>Anthropic</button></div></div><div className="live-transcripts"><article><div className="panel-header"><div><span>BEFORE</span><strong>Raw transcript</strong></div></div><p><MarkedText text={liveText} /></p></article><article><div className="panel-header"><div><span>AFTER / PREVIEW</span><strong>{liveVerifiedLevel ? `L${liveLevel} verified rewrite` : `L${liveLevel} surface cleanup`}</strong></div><span className={liveVerifiedLevel ? "status preserved" : "status preview"}>{liveVerifiedLevel ? "VERIFIED · CACHED" : "LOCAL PREVIEW"}</span></div><p>{liveDisplayText}</p></article></div><div className="preview-delta-strip"><div><span>LEXICAL</span><strong>{liveProxy.uniqueRatio.toFixed(3)} → {liveDisplayProxy.uniqueRatio.toFixed(3)}</strong></div><div><span>FILLER RATE</span><strong>{(liveProxy.fillerRate*100).toFixed(2)}% → {(liveDisplayProxy.fillerRate*100).toFixed(2)}%</strong></div><div><span>REPETITION</span><strong>{(liveProxy.repetitionRate*100).toFixed(2)}% → {(liveDisplayProxy.repetitionRate*100).toFixed(2)}%</strong></div><button className="primary-action compact" disabled={liveProxy.words < 10} onClick={verifyLive}>Run verified L1→L4 trace →</button></div></div>
      {liveStatus && <div className="demo-message"><span>PIPELINE</span><p>{liveStatus}</p></div>}
      {liveVerifiedTrace && liveVerifiedLevel && <div className="verified-live-result"><div className="verified-head"><div><span>VERIFIED · PRECOMPUTED TRACE</span><strong>{`L${liveLevel} / ${liveBackend}`}</strong></div><div><span>SEMANTIC SIMILARITY</span><strong>{(liveVerifiedLevel.semantic_similarity * 100).toFixed(1)}%</strong></div></div><div className="analysis-grid"><CategoryRadar original={liveVerifiedTrace.original_analysis.features} rewritten={liveVerifiedLevel.rewritten_analysis.features} /><FeatureDeltaChart original={liveVerifiedTrace.original_analysis.features} rewritten={liveVerifiedLevel.rewritten_analysis.features} /></div><details className="feature-details"><summary>Inspect all 20 verified features</summary><FeatureTable features={liveVerifiedTrace.original_analysis.features} compare={liveVerifiedLevel.rewritten_analysis.features} /></details><p className="live-disclaimer"><strong>All four levels are already computed.</strong> Click L1, L2, L3 or L4 above and the verified graphs switch immediately without another LLM request. No individual diagnosis is shown.</p></div>}
    </section>}
  </div>;
}
