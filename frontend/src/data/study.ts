/**
 * Public-site study constants.
 *
 * All levels evaluated using the same stratified 5-fold cross-validation:
 * each fold trains on L0 training rows and evaluates held-out rows at
 * every rewrite level. No train-set leakage.
 */
export const STUDY_ACCURACY = [
  { level: 0, label: "Original speech", short: "RAW", anthropic: 73.4, openai: 73.4, average: 73.4 },
  { level: 1, label: "Grammar correction", short: "CORRECT", anthropic: 68.8, openai: 66.5, average: 67.7 },
  { level: 2, label: "Light paraphrase", short: "LIGHT", anthropic: 62.3, openai: 56.9, average: 59.6 },
  { level: 3, label: "Moderate rewrite", short: "MODERATE", anthropic: 51.8, openai: 52.5, average: 52.2 },
  { level: 4, label: "Full reformulation", short: "FULL", anthropic: 54.2, openai: 53.3, average: 53.8 },
] as const;

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
    venue: "Journal of Alzheimer's Disease 49(2), 407-422",
    image: "/sources/fraser-2016.png",
    href: "https://www.cs.toronto.edu/~kfraser/Fraser15-JAD.pdf",
    supports: "Computational linguistic and acoustic analysis of DementiaBank narrative speech; the paper reports over 81% AD/control classification and motivates language-form features as clinically informative.",
  },
  {
    id: "becker",
    title: "The Natural History of Alzheimer's Disease: Description of Study Cohort and Accuracy of Diagnosis",
    authors: "Becker, Boller, Lopez, Saxton & McGonigle",
    year: "1994",
    venue: "Archives of Neurology 51(6), 585-594",
    image: "/sources/becker-1994.png",
    href: "https://dementia.talkbank.org/access/0docs/Becker1994.pdf",
    supports: "Primary Pitt cohort reference used for DementiaBank Pitt corpus provenance.",
  },
  {
    id: "adress",
    title: "Alzheimer's Dementia Recognition through Spontaneous Speech: The ADReSS Challenge",
    authors: "Luz, Haider, de la Fuente, Fromm & MacWhinney",
    year: "2020",
    venue: "INTERSPEECH 2020, 2172-2176",
    image: "/sources/adress-2020.png",
    href: "https://www.interspeech2020.org/uploadfile/pdf/Wed-SS-1-6-4.pdf",
    supports: "A standardized Alzheimer's recognition benchmark from spontaneous speech, emphasizing controlled datasets and comparable evaluation protocols.",
  },
  {
    id: "farzana",
    title: "How You Say It Matters: Measuring the Impact of Verbal Disfluency Tags on Automated Dementia Detection",
    authors: "Farzana, Deshpande & Parde",
    year: "2022",
    venue: "BioNLP 2022 (ACL)",
    image: "/sources/fraser-2016.png",
    href: "https://aclanthology.org/2022.bionlp-1.4/",
    supports: "Direct predecessor to ParaTrace. Removing gold-standard disfluencies reduced dementia-classification accuracy by 5.6 percentage points.",
  },
  {
    id: "lanzi",
    title: "DementiaBank: Theoretical Rationale, Protocol, and Illustrative Analyses",
    authors: "Lanzi, Saylor, Fromm, Liu, MacWhinney & Cohen",
    year: "2023",
    venue: "American Journal of Speech-Language Pathology 32(2), 426-438",
    image: "/sources/lanzi-2023.png",
    href: "https://talkbank.org/dementia/access/0docs/Lanzi2023.pdf",
    supports: "Describes DementiaBank's rationale, standardized discourse protocol, transcription resources and examples of automated linguistic analysis.",
  },
] as const;