import { useState, type ReactNode } from "react";
import {
  COMMITTED_DEGRADATION_L0,
  L2_FEATURE_CHANGES,
  REWRITE_LEVELS,
  STUDY_ACCURACY,
  VERIFIED_SOURCES,
} from "../data/study";
import { StudyAccuracyChart } from "../components/ScientificCharts";

type Tab = "methodology" | "results" | "features" | "sources";

const PIPELINE = [
  ["01", "Ingestion", "pylangacq / CHAT", "Parse CHAT-format .cha files and assemble participant speech into the project transcript table."],
  ["02", "Feature extraction", "spaCy · sentence-transformers · lexicalrichness", "Extract 20 numerical features. The extractor makes three main library calls, then computes the remaining measurements arithmetically."],
  ["03", "LLM rewriting", "GPT-4o-mini · Claude Sonnet 4.6", "Apply four controlled prompt levels at temperature 0.3. Rewrites are cached by transcript, level and backend."],
  ["04", "Classification", "scikit-learn", "The baseline routine evaluates Random Forest, Gradient Boosting and Logistic Regression with stratified 5-fold CV; the degradation routine separately fits a Random Forest on all L0 samples and evaluates transformed feature sets."],
  ["05", "Statistics", "scipy.stats", "Use paired Wilcoxon signed-rank tests, paired Cohen's d and a separate group-separation Biomarker Retention Ratio analysis."],
] as const;

const CATEGORIES = [
  ["Lexical diversity", "TTR · MTLD · MATTR", "Vocabulary variety and lexical reuse."],
  ["Repetition", "content-word repetition · bigram repetition · unique-word ratio", "Repeated lexical or phrase-level material."],
  ["Semantic coherence", "local coherence · global coherence · coherence variance", "Discourse continuity and topic drift from sentence embeddings."],
  ["Syntactic complexity", "parse depth · mean sentence length · clause density", "Structural complexity estimated from the dependency parse."],
  ["Idea density", "open-class word ratio", "Information-bearing content relative to total words."],
  ["Word-finding", "fillers · incomplete words · utterance length", "Surface disfluency and lexical-access behaviour."],
  ["Vocabulary", "Brunet's W · Honore's R", "Frequency-sensitive vocabulary richness."],
  ["Content units", "CIU ratio · pronoun-to-noun ratio", "Informative content and noun/pronoun substitution patterns."],
] as const;

const REFERENCES = [
  ["Fraser, K. C., Meltzer, J. A., & Rudzicz, F.", "2016", "Linguistic Features Identify Alzheimer's Disease in Narrative Speech", "Journal of Alzheimer's Disease, 49(2), 407–422. DOI 10.3233/JAD-150520"],
  ["Becker, J. T., Boller, F., Lopez, O. L., Saxton, J., & McGonigle, K. L.", "1994", "The Natural History of Alzheimer's Disease: Description of Study Cohort and Accuracy of Diagnosis", "Archives of Neurology, 51(6), 585–594. DOI 10.1001/archneur.1994.00540180063015"],
  ["Luz, S., Haider, F., de la Fuente, S., Fromm, D., & MacWhinney, B.", "2020", "Alzheimer's Dementia Recognition through Spontaneous Speech: The ADReSS Challenge", "INTERSPEECH 2020, 2172–2176. DOI 10.21437/Interspeech.2020-2571"],
  ["Lanzi, A. M., Saylor, A. K., Fromm, D., Liu, H., MacWhinney, B., & Cohen, M. L.", "2023", "DementiaBank: Theoretical Rationale, Protocol, and Illustrative Analyses", "American Journal of Speech-Language Pathology, 32(2), 426–438. DOI 10.1044/2022_AJSLP-22-00281"],
] as const;

function SectionIndex({ index, children }: { index: string; children: ReactNode }) {
  return <div className="section-index"><span>{index}</span><span>{children}</span></div>;
}

function ProtocolAudit() {
  return <div className="protocol-audit">
    <div className="protocol-audit-label">REPRODUCIBILITY / PROTOCOL AUDIT</div>
    <div className="protocol-audit-grid">
      <div><span>README BASELINE</span><strong>73.4%</strong><p>Original-speech baseline reported from the baseline routine using stratified 5-fold cross-validation.</p></div>
      <div><span>DEGRADATION L0 REFERENCE</span><strong>{COMMITTED_DEGRADATION_L0.toFixed(1)}%</strong><p>The committed degradation routine fits on all L0 samples and predicts those same L0 samples for its reference value.</p></div>
      <div className="protocol-audit-conclusion"><span>HOW THIS SITE HANDLES IT</span><p><strong>It does not silently merge the two protocols.</strong> L0 is labelled as the CV baseline; L1–L4 are labelled as degradation evaluations. For a final paper-quality curve, regenerate L0–L4 with fold-wise out-of-fold predictions under one shared protocol.</p></div>
    </div>
  </div>;
}

export default function Research() {
  const [tab, setTab] = useState<Tab>("methodology");

  return <div className="research-page">
    <section className="research-hero">
      <SectionIndex index="02 / RESEARCH">METHODS · RESULTS · SOURCE EVIDENCE</SectionIndex>
      <div className="research-title-grid">
        <div><h1>ParaTrace: measuring clinical signal erosion under LLM rewriting.</h1><p className="research-authors">Marie Sindhu · University of Ottawa · CYM 2026</p></div>
        <div className="abstract-block"><span>PROJECT SUMMARY</span><p>ParaTrace studies a compatibility risk between AI documentation and speech-based cognitive analysis. The public repository reports 552 clinically labelled DementiaBank Pitt transcripts, two LLM backends, four rewrite levels, 4,416 rewrites and 20 extracted linguistic features. The interface below separates project-generated evidence from external literature and explicitly flags an evaluation-protocol mismatch present in the committed analysis code.</p></div>
      </div>
      <div className="research-statline"><div><strong>552</strong><span>project transcripts</span></div><div><strong>4,416</strong><span>LLM rewrites</span></div><div><strong>20</strong><span>features</span></div><div><strong>4</strong><span>rewrite levels</span></div><div><strong>2</strong><span>LLM backends</span></div></div>
      <div className="accuracy-note"><strong>SOURCE DISCIPLINE</strong> ParaTrace-specific numbers come from the repository's README, result artifacts and implementation. External papers establish corpus provenance and prior speech/language evidence; they are not used to manufacture ParaTrace results.</div>
    </section>

    <div className="research-tabs" role="tablist" aria-label="Research sections">
      {([['methodology','01 Methodology'],['results','02 Results'],['features','03 Feature system'],['sources','04 Sources & paper scans']] as [Tab,string][]).map(([key,label]) => <button role="tab" aria-selected={tab === key} key={key} className={tab === key ? "research-tab active" : "research-tab"} onClick={() => setTab(key)}>{label}</button>)}
    </div>

    {tab === "methodology" && <div className="research-content">
      <section className="paper-section"><div className="paper-margin"><span>01.1</span><p>CORPUS</p></div><div className="paper-body"><h2>DementiaBank Pitt / Cookie Theft</h2><p className="lead">ParaTrace's processed study set contains 552 labelled transcripts: 243 control and 309 dementia. These are project-level counts and should not be confused with sample counts in any one external paper.</p><div className="corpus-grid"><div><span>TOTAL</span><strong>552</strong><small>processed project transcripts</small></div><div><span>CONTROL</span><strong>243</strong><small>44%</small></div><div><span>DEMENTIA</span><strong>309</strong><small>56%</small></div><div><span>TASK</span><strong>Cookie Theft</strong><small>picture description</small></div></div><p>The underlying clinical media/transcripts are governed by DementiaBank/TalkBank access rules and are not redistributed by this public showcase. Becker et al. (1994) is the foundational Pitt cohort citation used in the source section.</p></div></section>

      <section className="paper-section"><div className="paper-margin"><span>01.2</span><p>PIPELINE</p></div><div className="paper-body"><h2>What the repository actually computes</h2><div className="method-list">{PIPELINE.map(([n,name,tool,description]) => <div className="method-row" key={name}><span className="method-num">{n}</span><div><strong>{name}</strong><code>{tool}</code></div><p>{description}</p></div>)}</div><div className="method-note"><span>FEATURE EXTRACTOR</span><p>The extractor returns 20 features across eight groups and uses spaCy, sentence-transformers and lexicalrichness before arithmetic aggregation. Arbitrary web-demo input is therefore only a faithful research-pipeline run when the FastAPI backend is running.</p></div></div></section>

      <section className="paper-section"><div className="paper-margin"><span>01.3</span><p>INTERVENTION</p></div><div className="paper-body"><h2>Four controlled rewrite levels</h2><div className="intervention-table">{REWRITE_LEVELS.map((row) => <div key={row.level}><span>L{row.level}</span><strong>{row.name}</strong><p>{row.description}</p></div>)}</div><div className="method-note"><span>MODEL IMPLEMENTATION</span><p>The current repository rewrite module calls <strong>gpt-4o-mini</strong> and <strong>claude-sonnet-4-6</strong> with temperature 0.3. The interface labels backend outputs rather than treating model names as timeless study metadata.</p></div></div></section>

      <section className="paper-section"><div className="paper-margin"><span>01.4</span><p>EVALUATION</p></div><div className="paper-body"><h2>Baseline and degradation are not currently the same evaluation protocol.</h2><p className="lead">This matters enough to display rather than hide.</p><ProtocolAudit /></div></section>
    </div>}

    {tab === "results" && <div className="research-content">
      <section className="paper-section"><div className="paper-margin"><span>02.1</span><p>REPORTED SUMMARY</p></div><div className="paper-body"><h2>Rewriting approaches chance-level classification in the repository summary.</h2><p className="lead">The README reports a 73.4% L0 CV baseline and L3/L4 average values of 50.7% and 51.7%. Semantic similarity is reported as remaining above 83%.</p><div className="research-chart-wide"><StudyAccuracyChart activeLevel={3} /></div><div className="result-table"><div className="result-head result-head-protocol"><span>LEVEL</span><span>INTERVENTION</span><span>ANTHROPIC</span><span>OPENAI</span><span>AVERAGE</span><span>PROTOCOL</span></div>{STUDY_ACCURACY.map((row) => <div className={row.level >= 3 ? "result-row result-row-protocol critical" : "result-row result-row-protocol"} key={row.level}><span>L{row.level}</span><span>{row.label}</span><span>{row.anthropic.toFixed(1)}%</span><span>{row.openai.toFixed(1)}%</span><span><strong>{row.average.toFixed(1)}%</strong></span><span className="protocol-cell">{row.protocol}</span></div>)}</div><div className="finding-callout"><span>PROJECT CLAIM</span><p>The public repository summarizes the central phenomenon as a “what vs. how” gap: semantic content stays highly similar while the linguistic representation used for classification changes substantially.</p></div><ProtocolAudit /></div></section>

      <section className="paper-section"><div className="paper-margin"><span>02.2</span><p>PAIRED STATISTICS</p></div><div className="paper-body"><h2>At L2, 19 of 20 features are significant in each backend.</h2><p className="lead">The table below uses exact percentage-change values from the committed <code>statistical_tests.json</code>, not hand-entered “retention” estimates.</p><div className="evidence-matrix research-evidence"><div className="evidence-matrix-head"><span>FEATURE / L2 CHANGE FROM L0</span><span>ANTHROPIC</span><span>OPENAI</span></div>{L2_FEATURE_CHANGES.map((row) => <div className="evidence-matrix-row" key={row.name}><span>{row.name}</span><strong className={row.significantAnthropic ? "evidence-hot" : "evidence-neutral"}>{row.anthropic > 0 ? "+" : ""}{row.anthropic.toFixed(2)}%</strong><strong className={row.significantOpenAI ? "evidence-hot" : "evidence-neutral"}>{row.openai > 0 ? "+" : ""}{row.openai.toFixed(2)}%</strong></div>)}<div className="evidence-matrix-foot"><span>Incomplete-word rate is the non-significant feature in this L2 slice.</span><span>paired Wilcoxon · p &lt; 0.05</span></div></div><div className="method-note"><span>WHY NO SIMPLIFIED BRR HEATMAP HERE?</span><p>The repository defines BRR as |d<sub>level</sub>| / |d<sub>original</sub>|, so values can exceed 1 when group separation increases after rewriting. A decorative 0–1 “signal survival” heatmap would therefore misstate the artifact. This site uses exact paired-change values unless the full backend-specific BRR artifact is rendered directly.</p></div></div></section>
    </div>}

    {tab === "features" && <div className="research-content">
      <section className="paper-section"><div className="paper-margin"><span>03.1</span><p>FEATURE SYSTEM</p></div><div className="paper-body"><h2>Twenty measurements across eight linguistic categories.</h2><p className="lead">These names follow the repository extractor. They are measurements—not independent clinical diagnoses.</p><div className="feature-taxonomy">{CATEGORIES.map(([name,features,why],index) => <div key={name}><span>{String(index + 1).padStart(2,"0")}</span><strong>{name}</strong><code>{features}</code><p>{why}</p></div>)}</div></div></section>

      <section className="paper-section"><div className="paper-margin"><span>03.2</span><p>INTERPRETATION</p></div><div className="paper-body"><h2>What the live visualizations mean.</h2><div className="interpretation-grid"><div><span>LIVE SURFACE PROXY</span><p>Word count, lexical uniqueness, fillers, repetitions, fragments, pronoun share, content-word share and sentence length are computed instantly in the browser. They are deterministic descriptive signals only.</p></div><div><span>VERIFIED FEATURE RUN</span><p>When the backend is available, the site calls the repository's 20-feature extraction logic and can compare the resulting original/rewrite vectors.</p></div><div><span>STUDY-LEVEL CLASSIFICATION</span><p>Accuracy percentages belong to the study dataset. The public live demo intentionally does not convert a visitor's short transcript into a dementia/control verdict.</p></div></div></div></section>
    </div>}

    {tab === "sources" && <div className="research-content">
      <section className="paper-section source-section"><div className="paper-margin"><span>04.1</span><p>PRIMARY SOURCES</p></div><div className="paper-body"><h2>Read the papers behind the corpus and language-analysis context.</h2><p className="lead">These are real cropped first-page/title renders from the linked source PDFs, bundled into the site so a judge can inspect the literature without leaving the exhibit. Click any page to open the original source.</p><div className="source-gallery">{VERIFIED_SOURCES.map((source) => <a className="source-card" href={source.href} target="_blank" rel="noreferrer" key={source.id}><div className="source-image-wrap"><img src={source.image} alt={`Cropped first page of ${source.title}`} loading="lazy" /></div><div className="source-card-body"><span>{source.year} / SOURCE PDF</span><h3>{source.title}</h3><p className="source-authors">{source.authors} · {source.venue}</p><p>{source.supports}</p><strong>OPEN ORIGINAL PDF ↗</strong></div></a>)}</div><div className="source-rules"><strong>BOUNDARY</strong> The screenshots support literature provenance and context only. ParaTrace's 552-transcript counts, rewrite results and statistical tests come from the project repository.</div></div></section>

      <section className="paper-section"><div className="paper-margin"><span>04.2</span><p>REFERENCES</p></div><div className="paper-body"><h2>Verified bibliography</h2><div className="reference-list">{REFERENCES.map(([authors,year,title,venue],index) => <div className="reference-row" key={title}><span>[{index + 1}]</span><p><strong>{authors}</strong> ({year}). {title}. <em>{venue}</em></p></div>)}</div></div></section>
    </div>}
  </div>;
}
