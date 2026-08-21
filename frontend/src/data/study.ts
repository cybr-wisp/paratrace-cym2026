/**
 * Public-site study constants.
 *
 * IMPORTANT: STUDY_ACCURACY mirrors the values reported in the repository README.
 * L0 (73.4%) is the repository's 5-fold CV baseline. L1-L4 are the values reported
 * for the degradation experiment. The committed degradation implementation trains
 * the RF on all L0 samples before testing transformed samples; its in-sample L0
 * reference is 98.6%. The Research page surfaces this protocol distinction instead
 * of silently presenting the sequence as one uniform cross-validation curve.
 */
export const STUDY_ACCURACY = [
  { level: 0, label: "Original speech", short: "RAW", anthropic: 73.4, openai: 73.4, average: 73.4, protocol: "5-fold CV baseline" },
  { level: 1, label: "Grammar correction", short: "CORRECT", anthropic: 78.1, openai: 74.8, average: 76.5, protocol: "degradation evaluation" },
  { level: 2, label: "Light paraphrase", short: "LIGHT", anthropic: 65.9, openai: 58.7, average: 62.3, protocol: "degradation evaluation" },
  { level: 3, label: "Moderate rewrite", short: "MODERATE", anthropic: 47.6, openai: 53.8, average: 50.7, protocol: "degradation evaluation" },
  { level: 4, label: "Full reformulation", short: "FULL", anthropic: 53.8, openai: 49.6, average: 51.7, protocol: "degradation evaluation" },
] as const;

export const COMMITTED_DEGRADATION_L0 = 98.55072463768117;

export const REWRITE_LEVELS = [
  { level: 1, name: "Grammar correction", description: "Fix spelling and grammar while preserving fillers, repetition, wording and sentence structure as much as possible." },
  { level: 2, name: "Light paraphrase", description: "Remove obvious fillers and smooth awkward phrasing while preserving the same ideas and vocabulary level." },
  { level: 3, name: "Moderate rewrite", description: "Reorganize ideas, remove repetition and improve vocabulary and sentence structure while retaining propositional meaning." },
  { level: 4, name: "Full reformulation", description: "Produce a fluent, professional rewrite with sophisticated vocabulary and complex sentence structure." },
] as const;

export const GUIDED_TEXT = [
  "well... there's a girl... um... she's reaching up to the uh cookie jar and the the boy is um standing on a stool and it's it's tipping over and um... the mother is um washing dishes and the the water is is running over onto the floor",
  "Well... there's a girl... um... she's reaching up to the, uh, cookie jar, and the boy is um standing on a stool, and it's tipping over. The mother is um washing dishes, and the water is running over onto the floor.",
  "There's a girl reaching up to the cookie jar while a boy stands on a stool that is tipping over. The mother is washing dishes as the water runs over onto the floor.",
  "A girl reaches for a cookie jar while a boy balances on a tipping stool. Nearby, their mother washes dishes as water spills from the sink onto the floor.",
  "A girl reaches toward a cookie jar while a boy balances on a stool that is beginning to tip. Nearby, their mother washes dishes as water overflows from the sink onto the floor.",
] as const;

/** Exact percentage changes in the committed statistical_tests.json at L2. */
export const L2_FEATURE_CHANGES = [
  { name: "Type-token ratio", anthropic: 8.90, openai: 14.70, significantAnthropic: true, significantOpenAI: true },
  { name: "Global coherence", anthropic: 14.56, openai: 17.41, significantAnthropic: true, significantOpenAI: true },
  { name: "Mean parse depth", anthropic: 50.18, openai: 57.54, significantAnthropic: true, significantOpenAI: true },
  { name: "Mean sentence length", anthropic: 93.48, openai: 96.23, significantAnthropic: true, significantOpenAI: true },
  { name: "Filler rate", anthropic: -40.01, openai: -58.61, significantAnthropic: true, significantOpenAI: true },
  { name: "Pronoun-to-noun ratio", anthropic: -28.56, openai: -28.11, significantAnthropic: true, significantOpenAI: true },
  { name: "Incomplete-word rate", anthropic: 0.00, openai: 0.00, significantAnthropic: false, significantOpenAI: false },
] as const;

export const FEATURE_IMPORTANCE = [
  ["Global coherence", 0.142],
  ["Pronoun-to-noun ratio", 0.128],
  ["CIU ratio", 0.098],
  ["Mean sentence length", 0.089],
  ["Brunet's W", 0.078],
  ["Filler rate", 0.072],
  ["Local coherence", 0.068],
  ["MTLD", 0.062],
  ["Clause density", 0.055],
  ["Mean parse depth", 0.048],
] as const;

export const VERIFIED_SOURCES = [
  {
    id: "fraser",
    title: "Linguistic Features Identify Alzheimer's Disease in Narrative Speech",
    authors: "Fraser, Meltzer & Rudzicz",
    year: "2016",
    venue: "Journal of Alzheimer's Disease 49(2), 407–422",
    image: "/sources/fraser-2016.png",
    href: "https://www.cs.toronto.edu/~kfraser/Fraser15-JAD.pdf",
    supports: "Computational linguistic and acoustic analysis of DementiaBank narrative speech; the paper reports over 81% AD/control classification and motivates language-form features as clinically informative.",
  },
  {
    id: "becker",
    title: "The Natural History of Alzheimer's Disease: Description of Study Cohort and Accuracy of Diagnosis",
    authors: "Becker, Boller, Lopez, Saxton & McGonigle",
    year: "1994",
    venue: "Archives of Neurology 51(6), 585–594",
    image: "/sources/becker-1994.png",
    href: "https://dementia.talkbank.org/access/0docs/Becker1994.pdf",
    supports: "Primary Pitt cohort reference used for DementiaBank Pitt corpus provenance. It establishes the underlying longitudinal cohort; it does not report ParaTrace rewrite results.",
  },
  {
    id: "adress",
    title: "Alzheimer's Dementia Recognition through Spontaneous Speech: The ADReSS Challenge",
    authors: "Luz, Haider, de la Fuente, Fromm & MacWhinney",
    year: "2020",
    venue: "INTERSPEECH 2020, 2172–2176",
    image: "/sources/adress-2020.png",
    href: "https://www.interspeech2020.org/uploadfile/pdf/Wed-SS-1-6-4.pdf",
    supports: "A standardized Alzheimer's recognition benchmark from spontaneous speech, emphasizing controlled datasets and comparable evaluation protocols.",
  },
  {
    id: "lanzi",
    title: "DementiaBank: Theoretical Rationale, Protocol, and Illustrative Analyses",
    authors: "Lanzi, Saylor, Fromm, Liu, MacWhinney & Cohen",
    year: "2023",
    venue: "American Journal of Speech-Language Pathology 32(2), 426–438",
    image: "/sources/lanzi-2023.png",
    href: "https://talkbank.org/dementia/access/0docs/Lanzi2023.pdf",
    supports: "Describes DementiaBank's rationale, standardized discourse protocol, transcription resources and examples of automated linguistic analysis.",
  },
] as const;
