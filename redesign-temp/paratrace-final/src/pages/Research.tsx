import { useState, type ReactNode } from "react";

type Tab = "methodology" | "results" | "features" | "references";

const ACCURACY = [
  { level: "L0", description: "Original speech", anthropic: 73.4, openai: 73.4, average: 73.4 },
  { level: "L1", description: "Grammar correction", anthropic: 78.1, openai: 74.8, average: 76.5 },
  { level: "L2", description: "Light paraphrase", anthropic: 65.9, openai: 58.7, average: 62.3 },
  { level: "L3", description: "Moderate rewrite", anthropic: 47.6, openai: 53.8, average: 50.7 },
  { level: "L4", description: "Full reformulation", anthropic: 53.8, openai: 49.6, average: 51.7 },
];

const IMPORTANCE = [
  ["Global coherence", .142], ["Pronoun-to-noun ratio", .128], ["CIU ratio", .098],
  ["Mean sentence length", .089], ["Brunet's W", .078], ["Filler rate", .072],
  ["Local coherence", .068], ["MTLD", .062], ["Clause density", .055], ["Mean parse depth", .048],
] as const;

const BRR = [
  ["Global coherence", 0.58, 0.32, 0.15, 0.08],
  ["Pronoun / noun", 1.03, 0.72, 0.41, 0.22],
  ["CIU ratio", 1.01, 0.85, 0.52, 0.35],
  ["Sentence length", 0.62, 0.38, 0.21, 0.12],
  ["Filler rate", 1.18, 0.45, 0.08, 0.02],
  ["Local coherence", 0.82, 0.55, 0.30, 0.18],
  ["MTLD", 1.00, 0.78, 0.55, 0.40],
  ["Parse depth", 0.44, 0.30, 0.18, 0.10],
] as const;

const PIPELINE = [
  ["01", "Ingestion", "pylangacq 0.23", "Parse CHAT-format .cha files, extract participant utterances and preserve disfluency markers while removing incompatible CHAT annotations."],
  ["02", "Feature extraction", "spaCy + sentence-transformers + lexicalrichness", "Extract 20 biomarkers across eight categories using dependency parses, embeddings, lexical richness measures and deterministic arithmetic."],
  ["03", "LLM rewriting", "GPT-4o-mini + Claude Sonnet 3.5", "Apply four intervention levels from grammar correction through full reformulation, with disk caching for each transcript / level / backend combination."],
  ["04", "Classification", "scikit-learn", "Evaluate Random Forest, Gradient Boosting and Logistic Regression with stratified 5-fold cross-validation, scaling and class weighting."],
  ["05", "Statistical testing", "scipy.stats", "Use paired Wilcoxon signed-rank tests, effect sizes and Biomarker Retention Ratio to quantify feature change and diagnostic separation."],
] as const;

const CATEGORIES = [
  ["Lexical diversity", "TTR · MTLD · MATTR", "lexicalrichness", "Captures vocabulary variety and repeated lexical choice."],
  ["Repetition", "Content word · bigram · unique ratio", "spaCy POS", "Measures repeated words and phrase-level reuse."],
  ["Semantic coherence", "Local · global · variance", "sentence-transformers", "Measures topic continuity and discourse drift."],
  ["Syntactic complexity", "Parse depth · sentence length · clauses", "spaCy dependency parse", "Captures simplification or expansion of syntactic structure."],
  ["Idea density", "Open-class ratio", "spaCy POS", "Approximates information-bearing content per unit of speech."],
  ["Word-finding", "Fillers · fragments · utterance length", "regex + spaCy", "Tracks disfluency and lexical-access behaviours."],
  ["Vocabulary", "Brunet's W · Honore's R", "frequency analysis", "Measures vocabulary richness with frequency-sensitive indices."],
  ["Content units", "CIU ratio · pronoun/noun", "spaCy POS", "Captures informative content and noun substitution patterns."],
] as const;

const REFERENCES = [
  ["Fraser, K.C., Meltzer, J.A., & Rudzicz, F.", "2016", "Linguistic features identify Alzheimer's disease in narrative speech", "Journal of Alzheimer's Disease, 49(2), 407–422"],
  ["Becker, J.T., Boiler, F., Lopez, O.L., Saxton, J., & McGonigle, K.L.", "1994", "The natural history of Alzheimer's disease: Description of study cohort and accuracy of diagnosis", "Archives of Neurology, 51(6), 585–594"],
  ["Balabin, H., et al.", "2025", "Leveraging speech and NLP for cognitive decline detection", "Journal of Alzheimer's Disease"],
  ["Chou, H.C., et al.", "2024", "Linguistic biomarker classification from clinical speech transcripts", "INTERSPEECH 2024"],
] as const;

function SectionIndex({ index, children }: { index: string; children: ReactNode }) {
  return <div className="section-index"><span>{index}</span><span>{children}</span></div>;
}

function retentionClass(v: number) {
  if (v >= .8) return "retention-high";
  if (v >= .5) return "retention-mid";
  if (v >= .2) return "retention-low";
  return "retention-critical";
}

export default function Research() {
  const [tab, setTab] = useState<Tab>("methodology");

  return (
    <div className="research-page">
      <section className="research-hero">
        <SectionIndex index="02 / RESEARCH">METHODS · RESULTS · REPRODUCIBILITY</SectionIndex>
        <div className="research-title-grid">
          <div>
            <h1>ParaTrace: measuring clinical signal erosion under LLM rewriting.</h1>
            <p className="research-authors">Marie Sindhu · University of Ottawa · CYM 2026</p>
          </div>
          <div className="abstract-block">
            <span>ABSTRACT</span>
            <p>AI clinical scribes are optimized to produce fluent documentation. ParaTrace asks whether that transformation is compatible with speech-based cognitive screening. Using 552 clinically labelled DementiaBank Pitt transcripts, two LLM backends, four rewrite levels and 20 linguistic biomarkers, diagnostic accuracy fell toward chance under strong rewriting while semantic content remained high.</p>
          </div>
        </div>
        <div className="research-statline">
          <div><strong>552</strong><span>transcripts</span></div><div><strong>4,416</strong><span>rewrites</span></div><div><strong>20</strong><span>biomarkers</span></div><div><strong>8</strong><span>categories</span></div><div><strong>2</strong><span>LLM backends</span></div>
        </div>
      </section>

      <div className="research-tabs" role="tablist" aria-label="Research sections">
        {([['methodology','01 Methodology'],['results','02 Results'],['features','03 Feature analysis'],['references','04 References']] as [Tab,string][]).map(([key,label]) => (
          <button role="tab" aria-selected={tab===key} key={key} className={tab===key ? "research-tab active" : "research-tab"} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "methodology" && (
        <div className="research-content">
          <section className="paper-section">
            <div className="paper-margin"><span>01.1</span><p>CORPUS</p></div>
            <div className="paper-body">
              <h2>DementiaBank Pitt Corpus</h2>
              <p className="lead">The study uses Cookie Theft picture-description transcripts from clinically labelled control and dementia groups. The access-controlled source data are not stored in the public repository.</p>
              <div className="corpus-grid">
                <div><span>TOTAL</span><strong>552</strong><small>transcripts</small></div>
                <div><span>CONTROL</span><strong>243</strong><small>44%</small></div>
                <div><span>DEMENTIA</span><strong>309</strong><small>56%</small></div>
                <div><span>TASK</span><strong>Cookie Theft</strong><small>BDAE picture description</small></div>
              </div>
              <p>Only Cookie Theft transcripts are used so that the linguistic structure and elicitation task remain comparable. Classification is binary (Control vs Dementia). The raw Pitt Corpus remains subject to TalkBank/DementiaBank access controls.</p>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>01.2</span><p>PIPELINE</p></div>
            <div className="paper-body">
              <h2>Experimental pipeline</h2>
              <div className="method-list">
                {PIPELINE.map(([n, name, tool, description]) => <div className="method-row" key={name}><span className="method-num">{n}</span><div><strong>{name}</strong><code>{tool}</code></div><p>{description}</p></div>)}
              </div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>01.3</span><p>INTERVENTION</p></div>
            <div className="paper-body">
              <h2>Four controlled rewrite levels</h2>
              <div className="intervention-table">
                {[
                  ["L1", "Grammar correction", "Fix spelling and grammar while preserving disfluencies and original wording as much as possible."],
                  ["L2", "Light paraphrase", "Remove obvious fillers and smooth phrasing while maintaining the same propositional content."],
                  ["L3", "Moderate rewrite", "Reorganize ideas, remove repetition and improve vocabulary and sentence structure."],
                  ["L4", "Full reformulation", "Produce a professional, fluent rewrite representative of high-intervention documentation."],
                ].map(([level,name,desc]) => <div key={level}><span>{level}</span><strong>{name}</strong><p>{desc}</p></div>)}
              </div>
              <div className="method-note"><span>DESIGN CONTROL</span><p>Every rewrite is paired with its original transcript, enabling within-transcript comparison of feature movement rather than comparison between unrelated speakers.</p></div>
            </div>
          </section>
        </div>
      )}

      {tab === "results" && (
        <div className="research-content">
          <section className="paper-section">
            <div className="paper-margin"><span>02.1</span><p>PRIMARY RESULT</p></div>
            <div className="paper-body">
              <h2>Diagnostic performance approaches chance.</h2>
              <p className="lead">The baseline classifier reaches 73.4% on original speech. Under moderate and full rewriting, both LLM backends converge near the 50% chance level.</p>
              <div className="result-table">
                <div className="result-head"><span>LEVEL</span><span>INTERVENTION</span><span>ANTHROPIC</span><span>OPENAI</span><span>AVERAGE</span></div>
                {ACCURACY.map((row) => <div className={row.level === "L3" || row.level === "L4" ? "result-row critical" : "result-row"} key={row.level}><span>{row.level}</span><span>{row.description}</span><span>{row.anthropic.toFixed(1)}%</span><span>{row.openai.toFixed(1)}%</span><span><strong>{row.average.toFixed(1)}%</strong></span></div>)}
              </div>
              <div className="finding-callout"><span>KEY FINDING</span><p>Semantic similarity remained above 83% even as diagnostic accuracy collapsed. The rewrite preserved <em>what</em> the patient said while altering <em>how</em> it was said.</p></div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>02.2</span><p>STATISTICS</p></div>
            <div className="paper-body">
              <h2>Feature change is broad, not isolated.</h2>
              <div className="stat-evidence">
                <div><strong>19 / 20</strong><span>features significantly altered by L2</span><small>paired Wilcoxon, p &lt; 0.05</small></div>
                <div><strong>20 / 20</strong><span>features altered by L4 in the project analysis</span><small>system-wide linguistic transformation</small></div>
                <div><strong>2 / 2</strong><span>LLM backends converge toward chance</span><small>architecture-general failure pattern</small></div>
              </div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>02.3</span><p>RETENTION</p></div>
            <div className="paper-body">
              <h2>Biomarker Retention Ratio</h2>
              <p>BRR compares the magnitude of diagnostic group separation after rewriting with the original separation. A value near 1 indicates preservation; values approaching 0 indicate erosion.</p>
              <div className="brr-table">
                <div className="brr-head"><span>FEATURE</span><span>L1</span><span>L2</span><span>L3</span><span>L4</span></div>
                {BRR.map(([name,...values]) => <div className="brr-row" key={name}><span>{name}</span>{values.map((v,i) => <span className={retentionClass(v)} key={i}>{v.toFixed(2)}</span>)}</div>)}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "features" && (
        <div className="research-content">
          <section className="paper-section">
            <div className="paper-margin"><span>03.1</span><p>IMPORTANCE</p></div>
            <div className="paper-body">
              <h2>Which features carry the most signal?</h2>
              <p className="lead">Global coherence, pronoun-to-noun ratio and CIU ratio are the strongest predictors in the project’s feature-importance analysis.</p>
              <div className="importance-chart">
                {IMPORTANCE.map(([name,value],i) => <div className="importance-row" key={name}><span>{String(i+1).padStart(2,'0')}</span><strong>{name}</strong><div className="importance-track"><i style={{width:`${(value/.15)*100}%`}} /></div><code>{value.toFixed(3)}</code></div>)}
              </div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>03.2</span><p>TAXONOMY</p></div>
            <div className="paper-body">
              <h2>Eight biomarker categories</h2>
              <div className="category-list">
                {CATEGORIES.map(([name,features,tool,why],i) => <div className="category-row" key={name}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{name}</strong><code>{tool}</code></div><div><span>{features}</span><p>{why}</p></div></div>)}
              </div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>03.3</span><p>INTERPRETATION</p></div>
            <div className="paper-body">
              <h2>Why rewriting is clinically consequential</h2>
              <div className="two-column-copy"><p>Clinical language models are rewarded for coherence, concision and fluency. Those are valuable documentation properties, but they are not neutral transformations when downstream analysis depends on disfluency, repetition, lexical choice, syntactic simplification or discourse coherence.</p><p>ParaTrace therefore treats the raw transcript as a measurement surface. The proposed safeguard extracts the linguistic profile before any generative rewrite, then keeps the polished note and the preserved profile as separate outputs.</p></div>
            </div>
          </section>
        </div>
      )}

      {tab === "references" && (
        <div className="research-content">
          <section className="paper-section">
            <div className="paper-margin"><span>04.1</span><p>REFERENCES</p></div>
            <div className="paper-body">
              <h2>Selected literature</h2>
              <div className="reference-list">{REFERENCES.map(([authors,year,title,journal],i) => <div className="reference-row" key={title}><span>{String(i+1).padStart(2,'0')}</span><p>{authors} ({year}). <em>{title}</em>. <span>{journal}.</span></p></div>)}</div>
            </div>
          </section>

          <section className="paper-section">
            <div className="paper-margin"><span>04.2</span><p>REPRODUCIBILITY</p></div>
            <div className="paper-body">
              <h2>Open pipeline, controlled data access.</h2>
              <div className="repro-box"><span>SOURCE</span><a href="https://github.com/cybr-wisp/paratrace-cym2026" target="_blank" rel="noreferrer">github.com/cybr-wisp/paratrace-cym2026 ↗</a><p>Code, analysis scripts and the reproducible pipeline are public. DementiaBank participant transcripts require separate TalkBank access and are not included in the repository. LLM responses are disk-cached for reproducibility.</p></div>
              <div className="citation-box"><span>CITATION</span><pre>{`@inproceedings{sindhu2026paratrace,\n  title={ParaTrace: AI makes dementia invisible},\n  author={Sindhu, Marie},\n  booktitle={CYM 2026},\n  year={2026},\n  institution={University of Ottawa}\n}`}</pre></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
