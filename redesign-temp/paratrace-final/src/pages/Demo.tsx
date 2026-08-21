import { useCallback, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { SAMPLE, SAMPLE_REWRITE } from "../types/analysis";

type Props = { onOpenResearch: () => void };
type DemoMode = "guided" | "live";
type PipelineMode = "current" | "proposed";

type Level = {
  level: number;
  short: string;
  name: string;
  description: string;
  avg: number;
  openai: number;
  anthropic: number;
  text: string;
};

const LEVELS: Level[] = [
  {
    level: 0,
    short: "RAW",
    name: "Original speech",
    description: "No intervention. Disfluencies, repetition, syntax and discourse structure remain intact.",
    avg: 73.4,
    openai: 73.4,
    anthropic: 73.4,
    text: SAMPLE.text,
  },
  {
    level: 1,
    short: "CORRECT",
    name: "Grammar correction",
    description: "Light correction while preserving the speaker's wording and most disfluencies.",
    avg: 76.5,
    openai: 74.8,
    anthropic: 78.1,
    text: "Well... there's a girl... um... she's reaching up to the, uh, cookie jar, and the boy is um standing on a stool, and it's tipping over. The mother is um washing dishes, and the water is running over onto the floor.",
  },
  {
    level: 2,
    short: "LIGHT",
    name: "Light paraphrase",
    description: "Fillers and obvious repetition are removed; phrasing is smoothed while content stays stable.",
    avg: 62.3,
    openai: 58.7,
    anthropic: 65.9,
    text: "There's a girl reaching up to the cookie jar while a boy stands on a stool that is tipping over. The mother is washing dishes as the water runs over onto the floor.",
  },
  {
    level: 3,
    short: "MODERATE",
    name: "Moderate rewrite",
    description: "Ideas are reorganized, repetition disappears and vocabulary becomes more polished.",
    avg: 50.7,
    openai: 53.8,
    anthropic: 47.6,
    text: "A girl reaches for a cookie jar while a boy balances on a tipping stool. Nearby, their mother washes dishes as water spills from the sink onto the floor.",
  },
  {
    level: 4,
    short: "FULL",
    name: "Full reformulation",
    description: "Professional-grade reformulation: fluent, concise and structurally unlike the original speech.",
    avg: 51.7,
    openai: 49.6,
    anthropic: 53.8,
    text: SAMPLE_REWRITE.text,
  },
];

const SURVIVAL = [
  { name: "Global coherence", values: [1, 0.58, 0.32, 0.15, 0.08] },
  { name: "Pronoun / noun", values: [1, 1.03, 0.72, 0.41, 0.22] },
  { name: "CIU ratio", values: [1, 1.01, 0.85, 0.52, 0.35] },
  { name: "Sentence length", values: [1, 0.62, 0.38, 0.21, 0.12] },
  { name: "Filler rate", values: [1, 1.18, 0.45, 0.08, 0.02] },
  { name: "Local coherence", values: [1, 0.82, 0.55, 0.3, 0.18] },
  { name: "MTLD", values: [1, 1, 0.78, 0.55, 0.4] },
  { name: "Parse depth", values: [1, 0.44, 0.3, 0.18, 0.1] },
];

function SectionIndex({ index, children, dark = false }: { index: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className={dark ? "section-index dark" : "section-index"}>
      <span>{index}</span>
      <span>{children}</span>
    </div>
  );
}

function AccuracyPlot({ activeLevel = 3 }: { activeLevel?: number }) {
  const w = 520;
  const h = 250;
  const left = 46;
  const right = 20;
  const top = 24;
  const bottom = 40;
  const min = 45;
  const max = 82;
  const x = (i: number) => left + (i * (w - left - right)) / 4;
  const y = (v: number) => top + ((max - v) * (h - top - bottom)) / (max - min);
  const path = (key: "openai" | "anthropic") => LEVELS.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key])}`).join(" ");

  return (
    <div className="accuracy-plot" aria-label="Diagnostic accuracy by rewrite level">
      <div className="plot-head">
        <span>DIAGNOSTIC ACCURACY</span>
        <span className="plot-legend"><i className="legend-blue" /> OpenAI <i className="legend-orange" /> Anthropic</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Both model backends approach chance accuracy under stronger rewriting">
        {[50, 60, 70, 80].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={w - right} y1={y(tick)} y2={y(tick)} className={tick === 50 ? "chance-line" : "grid-line"} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end" className="axis-text">{tick}</text>
          </g>
        ))}
        <path d={path("openai")} className="series series-blue" />
        <path d={path("anthropic")} className="series series-orange" />
        {LEVELS.map((d, i) => (
          <g key={d.level}>
            {i === activeLevel && <line x1={x(i)} x2={x(i)} y1={top} y2={h - bottom} className="active-guide" />}
            <circle cx={x(i)} cy={y(d.openai)} r={i === activeLevel ? 5.5 : 4} className="point point-blue" />
            <circle cx={x(i)} cy={y(d.anthropic)} r={i === activeLevel ? 5.5 : 4} className="point point-orange" />
            <text x={x(i)} y={h - 15} textAnchor="middle" className="axis-text strong">L{i}</text>
          </g>
        ))}
        <text x={w - right} y={y(50) - 7} textAnchor="end" className="chance-text">CHANCE 50%</text>
      </svg>
    </div>
  );
}

function MarkedTranscript({ level }: { level: number }) {
  if (level >= 2) return <>{LEVELS[level].text}</>;
  return (
    <>
      <mark className="mark-filler">well...</mark> there&apos;s a girl... <mark className="mark-filler">um...</mark> she&apos;s reaching up to the <mark className="mark-filler">uh</mark> cookie jar and the <mark className="mark-repeat">the the</mark> boy is <mark className="mark-filler">um</mark> standing on a stool and <mark className="mark-repeat">it&apos;s it&apos;s</mark> tipping over and <mark className="mark-filler">um...</mark> the mother is <mark className="mark-filler">um</mark> washing dishes and the <mark className="mark-repeat">the the</mark> water is <mark className="mark-repeat">is</mark> running over onto the floor
    </>
  );
}

function survivalClass(v: number) {
  if (v >= 0.8) return "survival-high";
  if (v >= 0.5) return "survival-mid";
  if (v >= 0.2) return "survival-low";
  return "survival-critical";
}

function extractFingerprint(text: string) {
  const words = text.match(/[A-Za-z']+/g) ?? [];
  const lower = words.map((w) => w.toLowerCase());
  const fillers = lower.filter((w) => ["um", "uh", "er", "ah", "hmm", "well"].includes(w)).length;
  const unique = new Set(lower).size;
  const repeats = lower.filter((w, i) => i > 0 && w === lower[i - 1]).length;
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim()).length);
  const pronouns = lower.filter((w) => ["i", "we", "you", "he", "she", "they", "it", "him", "her", "them"].includes(w)).length;
  return {
    words: words.length,
    lexical: words.length ? unique / words.length : 0,
    filler: words.length ? fillers / words.length : 0,
    repetition: words.length ? repeats / words.length : 0,
    utterance: words.length / sentences,
    pronouns,
  };
}

function localRewrite(text: string) {
  let out = text.replace(/\b(um+|uh+|er+|ah+|hmm+|well)\b[,.… ]*/gi, "");
  out = out.replace(/\b(\w+)\s+\1\b/gi, "$1").replace(/\s{2,}/g, " ").trim();
  if (!out) return text;
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

export default function Demo({ onOpenResearch }: Props) {
  const [mode, setMode] = useState<DemoMode>("guided");
  const [level, setLevel] = useState(3);
  const [pipeline, setPipeline] = useState<PipelineMode>("current");
  const [liveText, setLiveText] = useState("");
  const [liveCompared, setLiveCompared] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  const active = LEVELS[level];
  const liveRewrite = useMemo(() => localRewrite(liveText), [liveText]);
  const liveBefore = useMemo(() => extractFingerprint(liveText), [liveText]);
  const liveAfter = useMemo(() => extractFingerprint(liveRewrite), [liveRewrite]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Browser speech recognition is not available here. You can type instead.");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
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
    recRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [liveText, recording]);

  const scrollToExperiment = () => document.getElementById("experiment")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="demo-page">
      <section className="hero-section">
        <div className="hero-copy">
          <SectionIndex index="01 / FINDING">CLINICAL LANGUAGE SAFETY</SectionIndex>
          <h1>AI cleans the transcript.<br /><em>It can clean away the signal.</em></h1>
          <p className="hero-deck">
            ParaTrace tests whether AI clinical rewriting preserves the cognitive-linguistic biomarkers hidden in patient speech. Across 552 clinically labelled transcripts and 4,416 rewrites, meaning remained high while diagnostic performance fell toward chance.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={scrollToExperiment}>Run the experiment <span>→</span></button>
            <button className="text-action" onClick={onOpenResearch}>Read the evidence <span>↗</span></button>
          </div>
          <div className="hero-metrics">
            <div><strong>552</strong><span>transcripts</span></div>
            <div><strong>4,416</strong><span>AI rewrites</span></div>
            <div><strong>20</strong><span>biomarkers</span></div>
            <div><strong>2</strong><span>LLM backends</span></div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-kicker"><span>EXPERIMENT / 001</span><span>CONTROL → DEMENTIA</span></div>
          <AccuracyPlot activeLevel={3} />
          <div className="hero-finding-row">
            <div>
              <span>SEMANTIC CONTENT</span>
              <strong>≥83%</strong>
              <small>preserved through heavy rewriting</small>
            </div>
            <div className="danger-metric">
              <span>DIAGNOSTIC ACCURACY</span>
              <strong>≈50%</strong>
              <small>approaches coin-flip performance</small>
            </div>
          </div>
        </div>
      </section>

      <div className="mode-switch" aria-label="Demo mode">
        <button className={mode === "guided" ? "mode-button active" : "mode-button"} onClick={() => setMode("guided")}><span>01</span> Guided experiment</button>
        <button className={mode === "live" ? "mode-button active" : "mode-button"} onClick={() => setMode("live")}><span>02</span> Try your speech</button>
      </div>

      {mode === "guided" ? (
        <>
          <section className="experiment-section" id="experiment">
            <SectionIndex index="02 / INTERVENTION">WATCH THE LINGUISTIC FINGERPRINT CHANGE</SectionIndex>
            <div className="experiment-heading-row">
              <div>
                <h2>Same scene. Same meaning.<br />Different clinical trace.</h2>
              </div>
              <p>Move from raw speech to full reformulation. The transcript becomes easier to read while features used by speech-based cognitive screening are progressively altered.</p>
            </div>

            <div className="level-control">
              {LEVELS.map((item) => (
                <button key={item.level} onClick={() => setLevel(item.level)} className={item.level === level ? "level-step active" : "level-step"}>
                  <span className="level-dot" />
                  <strong>L{item.level}</strong>
                  <small>{item.short}</small>
                </button>
              ))}
              <div className="level-track" />
            </div>

            <div className="specimen-grid">
              <article className="transcript-specimen">
                <div className="panel-header">
                  <div><span>TRANSCRIPT / L{level}</span><strong>{active.name}</strong></div>
                  <span className={level >= 2 ? "status eroding" : "status preserved"}>{level >= 2 ? "SIGNAL ALTERED" : "SIGNAL VISIBLE"}</span>
                </div>
                <div className="transcript-body"><MarkedTranscript level={level} /></div>
                <div className="annotation-key">
                  <span><i className="key-filler" /> disfluency</span>
                  <span><i className="key-repeat" /> repetition</span>
                  <span className="annotation-note">Guided example based on the study intervention levels.</span>
                </div>
              </article>

              <aside className="signal-readout">
                <div className="panel-header"><div><span>SIGNAL READOUT</span><strong>Study-level effect</strong></div><span>L{level}</span></div>
                <div className="readout-primary">
                  <span>AVERAGE ACCURACY</span>
                  <strong>{active.avg.toFixed(1)}%</strong>
                  <div className="readout-bar"><i style={{ width: `${active.avg}%` }} /></div>
                  <small>{level >= 3 ? "Near chance-level classification" : level === 2 ? "Diagnostic separation is failing" : "Signal remains substantially usable"}</small>
                </div>
                <div className="readout-grid">
                  <div><span>OpenAI</span><strong>{active.openai.toFixed(1)}%</strong></div>
                  <div><span>Anthropic</span><strong>{active.anthropic.toFixed(1)}%</strong></div>
                  <div><span>Meaning</span><strong>{level === 0 ? "100%" : "≥83%"}</strong></div>
                  <div><span>Changed by L2</span><strong>19/20</strong></div>
                </div>
                <p>{active.description}</p>
              </aside>
            </div>

            <blockquote className="core-statement">
              <span>03 / INTERPRETATION</span>
              <p>What was said survives.<br /><em>How it was said does not.</em></p>
            </blockquote>
          </section>

          <section className="survival-section">
            <div className="survival-intro">
              <SectionIndex index="04 / EROSION">BIOMARKER SURVIVAL MAP</SectionIndex>
              <h2>The linguistic fingerprint disappears before the meaning does.</h2>
              <p>Biomarker Retention Ratio compares the diagnostic separation retained after rewriting with the separation present in the original speech. Values near zero indicate that group-distinguishing signal has largely vanished.</p>
            </div>
            <div className="survival-map">
              <div className="survival-head"><span>FEATURE</span>{LEVELS.map((l) => <span key={l.level}>L{l.level}</span>)}</div>
              {SURVIVAL.map((row) => (
                <div className="survival-row" key={row.name}>
                  <span>{row.name}</span>
                  {row.values.map((value, i) => (
                    <button key={i} className={`survival-cell ${survivalClass(value)} ${i === level ? "selected" : ""}`} onClick={() => setLevel(i)} title={`${row.name}, L${i}: ${value.toFixed(2)}`}>
                      <span>{value.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="survival-scale"><span>retained</span><i /><i /><i /><i /><span>eroded</span></div>
            </div>
          </section>

          <section className="solution-section">
            <div className="solution-inner">
              <SectionIndex index="05 / SAFEGUARD" dark>PROPOSED ARCHITECTURE</SectionIndex>
              <div className="solution-heading">
                <h2>Preserve the signal <em>before</em> the rewrite.</h2>
                <p>ParaTrace proposes pre-extraction: compute biomarker features from the raw ASR transcript first, then allow the clinical scribe to generate a readable note.</p>
              </div>

              <div className="pipeline-toggle">
                <button className={pipeline === "current" ? "active bad" : ""} onClick={() => setPipeline("current")}>Current pipeline</button>
                <button className={pipeline === "proposed" ? "active good" : ""} onClick={() => setPipeline("proposed")}>ParaTrace safeguard</button>
              </div>

              {pipeline === "current" ? (
                <div className="pipeline-diagram current-pipeline">
                  <div className="pipeline-node"><span>01</span><strong>Patient speech</strong><small>raw linguistic signal</small></div>
                  <div className="pipeline-arrow">→</div>
                  <div className="pipeline-node danger"><span>02</span><strong>AI scribe</strong><small>rewrites / smooths</small></div>
                  <div className="pipeline-arrow danger-arrow">→</div>
                  <div className="pipeline-node danger"><span>03</span><strong>Biomarker extraction</strong><small>signal already changed</small></div>
                  <div className="pipeline-result lost"><span>RESULT</span><strong>≈50%</strong><small>accuracy at heavy rewriting</small></div>
                </div>
              ) : (
                <div className="pipeline-diagram proposed-pipeline">
                  <div className="pipeline-node"><span>01</span><strong>Patient speech</strong><small>raw linguistic signal</small></div>
                  <div className="pipeline-branch">
                    <div className="branch-line" />
                    <div className="pipeline-node safe"><span>02A</span><strong>Biomarker extraction</strong><small>pre-AI profile retained</small></div>
                    <div className="pipeline-node"><span>02B</span><strong>AI scribe</strong><small>polished clinical note</small></div>
                  </div>
                  <div className="pipeline-arrow">→</div>
                  <div className="pipeline-result kept"><span>CLINICIAN RECEIVES</span><strong>NOTE + PROFILE</strong><small>readability without discarding the original signal</small></div>
                </div>
              )}

              <div className="solution-note">
                <span>DESIGN PRINCIPLE</span>
                <p>Do not ask the polished note to reconstruct information the polishing step may have removed.</p>
              </div>
            </div>
          </section>

          <section className="evidence-strip">
            <SectionIndex index="06 / EVIDENCE">REPRODUCIBLE STUDY</SectionIndex>
            <div className="evidence-grid">
              <div><span>DATA</span><strong>552</strong><p>DementiaBank Pitt Cookie Theft transcripts; 243 control and 309 dementia.</p></div>
              <div><span>INTERVENTIONS</span><strong>4,416</strong><p>Four rewrite levels across two independent LLM backends.</p></div>
              <div><span>FEATURES</span><strong>20</strong><p>Cognitive-linguistic biomarkers spanning eight categories.</p></div>
              <div><span>TESTING</span><strong>5× CV</strong><p>Stratified cross-validation plus paired statistical testing.</p></div>
            </div>
            <button className="primary-action inverse" onClick={onOpenResearch}>Open full methodology <span>→</span></button>
          </section>
        </>
      ) : (
        <section className="live-section" id="experiment">
          <SectionIndex index="02 / LIVE">YOUR LINGUISTIC FINGERPRINT</SectionIndex>
          <div className="live-title-row">
            <div><h2>Describe the Cookie Theft scene in your own words.</h2><p>Type or use browser speech recognition. This public demo shows how surface-level linguistic features change after cleanup; it is not a clinical assessment.</p></div>
            <div className="ethics-chip">NON-DIAGNOSTIC DEMO</div>
          </div>

          <div className="live-input-grid">
            <div className="scene-brief">
              <span>COOKIE THEFT / BDAE</span>
              <p>A kitchen scene: a woman washes dishes while water overflows from the sink. Behind her, two children reach for a cookie jar. A boy stands on a stool that is beginning to tip.</p>
              <small>Describe what you notice naturally, without trying to sound polished.</small>
            </div>
            <div className="live-editor">
              <textarea value={liveText} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setLiveText(e.target.value); setLiveCompared(false); }} placeholder="Start speaking or typing here…" />
              <div className="editor-footer">
                <span>{liveBefore.words} words</span>
                <div>
                  <button className={recording ? "record-button recording" : "record-button"} onClick={toggleRecording}>{recording ? "■ Stop" : "● Speak"}</button>
                  <button className="primary-action compact" disabled={liveBefore.words < 10} onClick={() => setLiveCompared(true)}>Compare rewrite →</button>
                </div>
              </div>
            </div>
          </div>

          {liveCompared && (
            <div className="live-results">
              <div className="live-transcripts">
                <article><div className="panel-header"><div><span>BEFORE</span><strong>Your speech</strong></div></div><p>{liveText}</p></article>
                <article><div className="panel-header"><div><span>AFTER</span><strong>Illustrative cleanup</strong></div></div><p>{liveRewrite}</p></article>
              </div>
              <div className="fingerprint-table">
                <div className="fingerprint-head"><span>FEATURE</span><span>BEFORE</span><span>AFTER</span><span>CHANGE</span></div>
                {[
                  ["Lexical diversity", liveBefore.lexical, liveAfter.lexical, "ratio"],
                  ["Filler rate", liveBefore.filler, liveAfter.filler, "ratio"],
                  ["Immediate repetition", liveBefore.repetition, liveAfter.repetition, "ratio"],
                  ["Mean utterance length", liveBefore.utterance, liveAfter.utterance, "number"],
                  ["Pronoun count", liveBefore.pronouns, liveAfter.pronouns, "number"],
                ].map(([name, before, after, kind]) => {
                  const b = Number(before); const a = Number(after); const delta = a - b;
                  return <div className="fingerprint-row" key={String(name)}><span>{String(name)}</span><span>{kind === "ratio" ? b.toFixed(3) : b.toFixed(1)}</span><span>{kind === "ratio" ? a.toFixed(3) : a.toFixed(1)}</span><span className={Math.abs(delta) > 0.001 ? "changed" : "stable"}>{delta > 0 ? "+" : ""}{kind === "ratio" ? delta.toFixed(3) : delta.toFixed(1)}</span></div>;
                })}
              </div>
              <p className="live-disclaimer"><strong>Important:</strong> these browser-side calculations are an illustration of feature sensitivity, not the trained research classifier and not a diagnosis. The competition result comes from the full 552-transcript experimental pipeline documented in Research.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
