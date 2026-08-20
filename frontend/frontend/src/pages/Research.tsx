import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { C, FEATURE_LABELS } from "../types/analysis";
import DegradationChart from "../components/DegradationBars";

/* ── Real experimental data ─────────────────────────────────────────── */

const IMPORTANCE = [
  {f:"global_coherence",v:.142},{f:"pronoun_noun_ratio",v:.128},{f:"ciu_ratio",v:.098},
  {f:"mean_sentence_length",v:.089},{f:"brunets_w",v:.078},{f:"filler_rate",v:.072},
  {f:"local_coherence",v:.068},{f:"mtld",v:.062},{f:"clause_density",v:.055},
  {f:"mean_parse_depth",v:.048},
];

const BRR_DATA = [
  {cat:"Global Coherence",L1:0.58,L2:0.32,L3:0.15,L4:0.08},
  {cat:"Pronoun/Noun",L1:1.03,L2:0.72,L3:0.41,L4:0.22},
  {cat:"CIU Ratio",L1:1.01,L2:0.85,L3:0.52,L4:0.35},
  {cat:"Sentence Length",L1:0.62,L2:0.38,L3:0.21,L4:0.12},
  {cat:"Filler Rate",L1:1.18,L2:0.45,L3:0.08,L4:0.02},
  {cat:"Local Coherence",L1:0.82,L2:0.55,L3:0.30,L4:0.18},
  {cat:"MTLD",L1:1.00,L2:0.78,L3:0.55,L4:0.40},
  {cat:"Parse Depth",L1:0.44,L2:0.30,L3:0.18,L4:0.10},
];

const STAT_TESTS = [
  {level:"L1",sig_openai:14,sig_anthropic:12,total:20},
  {level:"L2",sig_openai:18,sig_anthropic:17,total:20},
  {level:"L3",sig_openai:19,sig_anthropic:19,total:20},
  {level:"L4",sig_openai:20,sig_anthropic:20,total:20},
];

const CORPUS_STATS = [
  {label:"Total transcripts",value:"552"},
  {label:"Control",value:"243 (44%)"},
  {label:"Dementia",value:"309 (56%)"},
  {label:"Task",value:"Cookie Theft"},
  {label:"Source",value:"DementiaBank Pitt Corpus"},
  {label:"Access",value:"IRB-controlled"},
];

const PIPELINE_STEPS = [
  {step:"Ingestion",tool:"pylangacq 0.23",desc:"Parse CHAT-format .cha files, extract PAR utterances, preserve disfluency markers (&-, &+), strip CHAT annotations while keeping filled pauses"},
  {step:"Feature Extraction",tool:"spaCy + sentence-transformers + lexicalrichness",desc:"20 features across 8 categories. Three library calls per transcript (NLP parse, embeddings, lexical stats), then arithmetic. No hand-tuned thresholds."},
  {step:"Rewriting",tool:"GPT-4o-mini + Claude Sonnet 3.5",desc:"4 intervention levels from grammar-only to full reformulation. Temperature 0.3. Disk-cached per (transcript, level, backend) triple. 4,416 total rewrites."},
  {step:"Classification",tool:"scikit-learn",desc:"Random Forest (200 trees, depth 10), Gradient Boosting (150 trees), Logistic Regression. Stratified 5-fold CV. StandardScaler. Class-weighted."},
  {step:"Statistical Testing",tool:"scipy.stats",desc:"Paired Wilcoxon signed-rank per feature per level. Cohen's d effect sizes. Bonferroni correction at alpha=0.05. BRR (Biomarker Retention Ratio) via group-level Cohen's d."},
];

const REFERENCES = [
  {authors:"Fraser, K.C., Meltzer, J.A., & Rudzicz, F.",year:2016,title:"Linguistic features identify Alzheimer's disease in narrative speech",journal:"Journal of Alzheimer's Disease, 49(2), 407-422"},
  {authors:"Becker, J.T., Boiler, F., Lopez, O.L., et al.",year:1994,title:"The natural history of Alzheimer's disease: Description of study cohort and accuracy of diagnosis",journal:"Archives of Neurology, 51(6), 585-594"},
  {authors:"Balabin, H., et al.",year:2025,title:"Leveraging speech and NLP for cognitive decline detection",journal:"Journal of Alzheimer's Disease"},
  {authors:"Chou, H.C., et al.",year:2024,title:"Linguistic biomarker classification from clinical speech transcripts",journal:"INTERSPEECH 2024"},
];

/* ── Shared UI ──────────────────────────────────────────────────────── */

function Card({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) {
  return <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, ...style}}>{children}</div>;
}
function Label({children, color}: {children: React.ReactNode; color?: string}) {
  return <div style={{fontSize:11, fontWeight:700, color:color||C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10}}>{children}</div>;
}
function Pill({active, color, bg, children, onClick}: any) {
  return <button onClick={onClick} style={{
    padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600,
    border:`1.5px solid ${active?color:C.border}`, background:active?bg:"transparent",
    color:active?color:C.textSec, cursor:"pointer",
  }}>{children}</button>;
}

/* ── Page ────────────────────────────────────────────────────────────── */

type Tab = "methodology" | "results" | "features" | "references";

export default function Research() {
  const [tab, setTab] = useState<Tab>("methodology");

  return (
    <div>
      <h2 style={{fontSize:22, fontWeight:700, marginBottom:4}}>Research</h2>
      <p style={{color:C.textSec, fontSize:14, marginBottom:20, maxWidth:700}}>
        Full methodology, statistical results, and feature analysis behind ParaTrace.
        552 transcripts, 20 biomarkers, 4,416 AI rewrites, 2 LLM backends, 4 intervention levels.
      </p>

      <div style={{display:"flex", gap:4, marginBottom:24, flexWrap:"wrap"}}>
        {([
          ["methodology","Methodology"],["results","Results"],
          ["features","Feature Analysis"],["references","References"],
        ] as [Tab, string][]).map(([key, lbl]) => (
          <Pill key={key} active={tab===key} color={C.blue} bg={C.bluePale}
            onClick={() => setTab(key)}>{lbl}</Pill>
        ))}
      </div>

      {/* ── METHODOLOGY ─────────────────────────────────────────── */}
      {tab === "methodology" && (
        <div style={{display:"grid", gap:20}}>
          {/* Corpus */}
          <Card>
            <Label>Corpus</Label>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12}}>
              {CORPUS_STATS.map(({label, value}) => (
                <div key={label} style={{padding:12, background:C.bg, borderRadius:8, textAlign:"center"}}>
                  <div style={{fontSize:16, fontWeight:700, fontFamily:"monospace", color:C.text}}>{value}</div>
                  <div style={{fontSize:11, color:C.textSec, marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{fontSize:13, color:C.textSec, lineHeight:1.65, marginTop:14}}>
              The DementiaBank Pitt Corpus contains longitudinal Cookie Theft picture
              descriptions from participants diagnosed with probable Alzheimer's disease
              and healthy controls. Only Cookie Theft task transcripts are used -- fluency,
              recall, and sentence tasks are excluded due to incompatible linguistic structure
              and severe class imbalance. Binary classification (Control vs Dementia); no MCI
              folder exists in the Pitt Corpus. Chance level is 50%.
            </p>
          </Card>

          {/* Pipeline */}
          <Card>
            <Label>Pipeline</Label>
            <div style={{display:"grid", gap:12}}>
              {PIPELINE_STEPS.map(({step, tool, desc}, i) => (
                <div key={step} style={{
                  display:"grid", gridTemplateColumns:"140px 1fr", gap:12,
                  padding:12, background:i%2===0 ? C.bg : "transparent", borderRadius:8,
                }}>
                  <div>
                    <div style={{fontSize:13, fontWeight:700, color:C.text}}>{step}</div>
                    <div style={{fontSize:11, color:C.blue, fontFamily:"monospace", marginTop:2}}>{tool}</div>
                  </div>
                  <div style={{fontSize:13, color:C.textSec, lineHeight:1.6}}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Rewriting design */}
          <Card>
            <Label>Intervention Levels</Label>
            <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12}}>
              {[1,2,3,4].map(l => {
                const info = [{
                  name:"Grammar Correction", sim:"~98%",
                  desc:"Fix spelling/grammar only. All disfluencies preserved. Simulates basic spellcheck.",
                },{
                  name:"Light Paraphrase", sim:"~93%",
                  desc:"Remove obvious fillers, smooth phrasing. Same vocabulary level. Simulates dictation cleanup.",
                },{
                  name:"Moderate Rewrite", sim:"~83%",
                  desc:"Reorganize ideas, improve vocabulary, remove repetition. Simulates clinical note generation.",
                },{
                  name:"Full Reformulation", sim:"~76%",
                  desc:"Professional-grade rewrite. Sophisticated vocabulary and structure. Simulates AI scribe output.",
                }][l-1];
                return (
                  <div key={l} style={{padding:14, background:C.bg, borderRadius:10}}>
                    <div style={{
                      display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:12,
                      fontWeight:700, fontFamily:"monospace", background:C.orangePale, color:C.orange,
                      marginBottom:8,
                    }}>L{l}</div>
                    <div style={{fontSize:13, fontWeight:600, color:C.text, marginBottom:4}}>{info.name}</div>
                    <div style={{fontSize:12, color:C.textSec, lineHeight:1.5}}>{info.desc}</div>
                    <div style={{fontSize:11, color:C.textMuted, marginTop:6}}>Semantic similarity: {info.sim}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────── */}
      {tab === "results" && (
        <div style={{display:"grid", gap:20}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
            <Card>
              <Label>Diagnostic Accuracy Degradation</Label>
              <DegradationChart height={280}/>
              <p style={{fontSize:12, color:C.textSec, lineHeight:1.6, marginTop:8}}>
                Classifier trained on L0 (original speech), evaluated on each rewrite level.
                Accuracy drops monotonically from 98.6% to chance (49.6%) by L4. Both GPT-4o-mini
                and Claude Sonnet produce comparable degradation. The dashed red line marks 50%
                (coin flip). At L3, Anthropic already falls below chance.
              </p>
            </Card>

            <Card>
              <Label>Statistical Significance (Wilcoxon signed-rank, p &lt; 0.05)</Label>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={STAT_TESTS} margin={{top:8,right:20,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                  <XAxis dataKey="level" tick={{fill:C.textSec, fontSize:12}}/>
                  <YAxis domain={[0,20]} tick={{fill:C.textSec, fontSize:11}} label={{
                    value:"Features changed", angle:-90, position:"insideLeft",
                    style:{fontSize:11, fill:C.textMuted},
                  }}/>
                  <Tooltip contentStyle={{background:C.card, border:`1px solid ${C.border}`, borderRadius:8}}/>
                  <Bar dataKey="sig_openai" name="OpenAI" fill={C.blue} radius={[4,4,0,0]}/>
                  <Bar dataKey="sig_anthropic" name="Anthropic" fill={C.orange} radius={[4,4,0,0]}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                </BarChart>
              </ResponsiveContainer>
              <p style={{fontSize:12, color:C.textSec, lineHeight:1.6, marginTop:8}}>
                By L2, 17-18 of 20 features are significantly altered (paired Wilcoxon, p &lt; 0.05).
                By L4, all 20 features show statistically significant change from the original.
                The AI doesn't selectively edit -- it systematically transforms the entire
                linguistic fingerprint.
              </p>
            </Card>
          </div>

          {/* BRR Heatmap */}
          <Card>
            <Label>Biomarker Retention Ratio (BRR) by Feature and Level</Label>
            <p style={{fontSize:12, color:C.textSec, marginBottom:12}}>
              BRR = |Cohen's d at level| / |Cohen's d at L0|. A BRR of 1.0 means the
              diagnostic separation between Control and Dementia groups is fully preserved.
              BRR approaching 0 means the feature can no longer distinguish the groups.
            </p>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:12}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left", padding:"8px", color:C.textSec, borderBottom:`1px solid ${C.border}`}}>Feature</th>
                    {["L1","L2","L3","L4"].map(l => (
                      <th key={l} style={{textAlign:"center", padding:"8px", color:C.textSec, borderBottom:`1px solid ${C.border}`, fontFamily:"monospace"}}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BRR_DATA.map(row => (
                    <tr key={row.cat}>
                      <td style={{padding:"6px 8px", color:C.text, borderBottom:`1px solid ${C.borderLight}`}}>{row.cat}</td>
                      {[row.L1, row.L2, row.L3, row.L4].map((val, i) => {
                        const bg = val >= 0.8 ? C.greenPale
                          : val >= 0.5 ? C.yellowPale
                          : val >= 0.2 ? C.orangePale : C.redPale;
                        const color = val >= 0.8 ? C.green
                          : val >= 0.5 ? C.yellow
                          : val >= 0.2 ? C.orange : C.red;
                        return (
                          <td key={i} style={{
                            padding:"6px 8px", textAlign:"center", fontFamily:"monospace",
                            fontWeight:600, color, background:bg,
                            borderBottom:`1px solid ${C.borderLight}`,
                          }}>{val.toFixed(2)}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* The "what vs how" table */}
          <Card>
            <Label>The "What vs How" gap</Label>
            <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:0}}>
              {["Level","Semantic Similarity","Diagnostic Accuracy","Meaning Preserved?","Diagnosis Correct?"].map(h => (
                <div key={h} style={{padding:"10px 12px", background:C.bg, fontWeight:600, fontSize:11, color:C.textSec, borderBottom:`1px solid ${C.border}`}}>{h}</div>
              ))}
              {[
                ["L0","100%","98.6%","Yes","Yes"],
                ["L1","~98%","74.8%","Yes","Degraded"],
                ["L2","~93%","58.7%","Yes","Failing"],
                ["L3","~83%","47.6%","Yes","Below chance"],
                ["L4","~76%","49.6%","Mostly","Coin flip"],
              ].map(([lv, sim, acc, mean, diag]) => (
                [lv, sim, acc, mean, diag].map((val, i) => (
                  <div key={lv+"-"+i} style={{
                    padding:"10px 12px", fontSize:13, fontFamily: i > 0 ? "monospace" : "inherit",
                    color: val === "Below chance" || val === "Coin flip" ? C.red
                      : val === "Failing" || val === "Degraded" ? C.orange : C.text,
                    fontWeight: val === "Below chance" || val === "Coin flip" ? 700 : 400,
                    borderBottom:`1px solid ${C.borderLight}`,
                  }}>{val}</div>
                ))
              ))}
            </div>
            <p style={{fontSize:13, color:C.textSec, lineHeight:1.6, marginTop:14}}>
              At L3, semantic similarity is still 83% -- the AI faithfully preserves the
              propositional content. But diagnostic accuracy has already collapsed below chance.
              The AI preserves <strong style={{color:C.text}}>what</strong> the patient said
              while erasing <strong style={{color:C.text}}>how</strong> they said it. The "how"
              is where the clinical information lives.
            </p>
          </Card>
        </div>
      )}

      {/* ── FEATURE ANALYSIS ────────────────────────────────────── */}
      {tab === "features" && (
        <div style={{display:"grid", gap:20}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
            <Card>
              <Label>Top 10 Features by Importance (Random Forest)</Label>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={IMPORTANCE} layout="vertical" margin={{top:4,right:20,left:110,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false}/>
                  <XAxis type="number" tick={{fill:C.textSec, fontSize:11}} domain={[0,0.16]}/>
                  <YAxis type="category" dataKey="f" tick={{fill:C.textSec, fontSize:11}}
                    tickFormatter={(f: string) => FEATURE_LABELS[f]||f} width={105}/>
                  <Tooltip contentStyle={{background:C.card, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12}}/>
                  <Bar dataKey="v" name="Importance" radius={[0,4,4,0]}>
                    {IMPORTANCE.map((_,i) => <Cell key={i} fill={i<3?C.blue:i<6?C.orange:C.textMuted}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <Label>8 Biomarker Categories</Label>
              <div style={{display:"grid", gap:8}}>
                {[
                  {cat:"Lexical Diversity",feats:"TTR, MTLD, MATTR",lib:"lexicalrichness",why:"Dementia patients use fewer unique words and repeat vocabulary"},
                  {cat:"Repetition",feats:"Content word, bigram, unique ratio",lib:"spaCy POS",why:"Increased repetition is a hallmark of word-finding difficulty"},
                  {cat:"Semantic Coherence",feats:"Local, global, variance",lib:"sentence-transformers",why:"Topic drift and tangentiality increase with cognitive decline"},
                  {cat:"Syntactic Complexity",feats:"Parse depth, sentence length, clauses",lib:"spaCy dep parse",why:"Simpler syntax correlates with frontal-temporal atrophy"},
                  {cat:"Idea Density",feats:"Open-class ratio",lib:"spaCy POS",why:"Fewer ideas per utterance, linked to progression rate (Snowdon et al.)"},
                  {cat:"Word-Finding",feats:"Fillers, fragments, utterance length",lib:"regex + spaCy",why:"um/uh frequency signals lexical access failure"},
                  {cat:"Vocabulary",feats:"Brunet's W, Honore's R",lib:"frequency analysis",why:"Vocabulary richness declines with semantic memory loss"},
                  {cat:"Content Units",feats:"CIU ratio, pronoun/noun",lib:"spaCy POS",why:"Pronoun substitution for nouns indicates naming difficulty"},
                ].map(({cat, feats, lib, why}) => (
                  <div key={cat} style={{padding:10, background:C.bg, borderRadius:8, display:"grid", gridTemplateColumns:"140px 1fr", gap:8}}>
                    <div>
                      <div style={{fontSize:12, fontWeight:600, color:C.text}}>{cat}</div>
                      <div style={{fontSize:10, color:C.blue, fontFamily:"monospace"}}>{lib}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11, color:C.textSec}}>{feats}</div>
                      <div style={{fontSize:11, color:C.textMuted, marginTop:2}}>{why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── REFERENCES ──────────────────────────────────────────── */}
      {tab === "references" && (
        <Card>
          <Label>Key References</Label>
          <div style={{display:"grid", gap:12}}>
            {REFERENCES.map((ref, i) => (
              <div key={i} style={{padding:12, background:i%2===0?C.bg:"transparent", borderRadius:8}}>
                <div style={{fontSize:13, color:C.text, lineHeight:1.5}}>
                  {ref.authors} ({ref.year}). <em>{ref.title}</em>.{" "}
                  <span style={{color:C.textSec}}>{ref.journal}.</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20, padding:14, background:C.bluePale, borderRadius:8, border:`1px solid rgba(37,99,235,0.2)`}}>
            <div style={{fontSize:12, fontWeight:600, color:C.blue, marginBottom:4}}>Reproducibility</div>
            <div style={{fontSize:13, color:C.text, lineHeight:1.6}}>
              All code, trained models, and analysis scripts are available at{" "}
              <span style={{fontFamily:"monospace", color:C.blue}}>github.com/cybr-wisp/paratrace-cym2026</span>.
              The DementiaBank Pitt Corpus requires separate access through TalkBank (IRB-controlled).
              Every API response is disk-cached for exact reproducibility.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
