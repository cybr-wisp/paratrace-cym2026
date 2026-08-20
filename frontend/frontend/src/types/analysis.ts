/* Shared types and constants */

export const FEATURE_NAMES = [
  "ttr","mtld","mattr","content_word_repetition_rate","bigram_repetition_rate",
  "unique_word_ratio","local_coherence","global_coherence","coherence_variance",
  "mean_parse_depth","mean_sentence_length","clause_density","idea_density",
  "filler_rate","incomplete_word_rate","mean_utterance_length","brunets_w",
  "honores_r","ciu_ratio","pronoun_noun_ratio",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type Features = Record<FeatureName, number | null>;

export const FEATURE_LABELS: Record<string, string> = {
  ttr:"Type-Token Ratio",mtld:"MTLD",mattr:"MATTR",
  content_word_repetition_rate:"Content Word Repetition",
  bigram_repetition_rate:"Bigram Repetition",unique_word_ratio:"Unique Word Ratio",
  local_coherence:"Local Coherence",global_coherence:"Global Coherence",
  coherence_variance:"Coherence Variance",mean_parse_depth:"Mean Parse Depth",
  mean_sentence_length:"Mean Sentence Length",clause_density:"Clause Density",
  idea_density:"Idea Density",filler_rate:"Filler Rate",
  incomplete_word_rate:"Incomplete Word Rate",mean_utterance_length:"Mean Utterance Length",
  brunets_w:"Brunet's W",honores_r:"Honore's R",ciu_ratio:"CIU Ratio",
  pronoun_noun_ratio:"Pronoun-to-Noun Ratio",
};

export const CATEGORIES: Record<string, FeatureName[]> = {
  "Lexical Diversity": ["ttr","mtld","mattr"],
  "Repetition": ["content_word_repetition_rate","bigram_repetition_rate","unique_word_ratio"],
  "Coherence": ["local_coherence","global_coherence","coherence_variance"],
  "Syntax": ["mean_parse_depth","mean_sentence_length","clause_density"],
  "Idea Density": ["idea_density"],
  "Word-Finding": ["filler_rate","incomplete_word_rate","mean_utterance_length"],
  "Vocabulary": ["brunets_w","honores_r"],
  "Content Units": ["ciu_ratio","pronoun_noun_ratio"],
};

export const RANGES: Record<string, [number, number]> = {
  ttr:[0,1],mtld:[0,200],mattr:[0,1],content_word_repetition_rate:[0,.5],
  bigram_repetition_rate:[0,.3],unique_word_ratio:[0,1],local_coherence:[0,1],
  global_coherence:[0,1],coherence_variance:[0,.2],mean_parse_depth:[0,8],
  mean_sentence_length:[0,30],clause_density:[0,3],idea_density:[0,.6],
  filler_rate:[0,.1],incomplete_word_rate:[0,.1],mean_utterance_length:[0,25],
  brunets_w:[5,20],honores_r:[0,2000],ciu_ratio:[0,.6],pronoun_noun_ratio:[0,3],
};

export const LEVEL_INFO: Record<number, { name: string; desc: string }> = {
  1:{name:"Grammar fix",desc:"Spelling/grammar only. Fillers preserved."},
  2:{name:"Light paraphrase",desc:"Remove fillers, smooth phrasing."},
  3:{name:"Moderate rewrite",desc:"Reorganize, improve vocabulary."},
  4:{name:"Full reformulation",desc:"Professional-grade rewrite."},
};

export const C = {
  white:"#ffffff",bg:"#f7f8fa",card:"#ffffff",border:"#e2e5ea",
  borderLight:"#eef0f4",text:"#1a1d23",textSec:"#5f6879",textMuted:"#94a0b4",
  blue:"#2563eb",bluePale:"#eff4ff",blueRing:"#93b4fd",blueDark:"#1d4ed8",
  orange:"#ea6d20",orangePale:"#fff5ed",
  yellow:"#d99e0b",yellowPale:"#fffbeb",yellowHL:"rgba(234,179,8,0.18)",
  red:"#dc2626",redPale:"#fef2f2",redHL:"rgba(220,38,38,0.14)",
  orangeHL:"rgba(234,109,32,0.16)",green:"#16a34a",greenPale:"#f0fdf4",
};

export function norm(feat: string, val: number): number {
  const [lo,hi] = RANGES[feat] || [0,1];
  return Math.max(0, Math.min(1, (val - lo) / (hi - lo)));
}

export function catScore(features: Record<string, number|null>, feats: string[]): number {
  const vals = feats.map(f => norm(f, (features[f] as number) || 0));
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

// Sample data from real Pitt Corpus results
export const SAMPLE = {
  text: "well... there's a girl... um... she's reaching up to the uh cookie jar and the the boy is um standing on a stool and it's it's tipping over and um... the mother is um washing dishes and the the water is is running over onto the floor",
  features: {
    ttr:0.61,mtld:45.9,mattr:0.786,content_word_repetition_rate:0.136,
    bigram_repetition_rate:0.071,unique_word_ratio:0.61,local_coherence:0.289,
    global_coherence:0.545,coherence_variance:0.082,mean_parse_depth:2.5,
    mean_sentence_length:8.2,clause_density:0.3,idea_density:0.329,
    filler_rate:0.0132,incomplete_word_rate:0.0,mean_utterance_length:6.8,
    brunets_w:10.42,honores_r:812.3,ciu_ratio:0.329,pronoun_noun_ratio:1.875,
  } as Features,
  prediction: { label: "Dementia" as const, confidence: 0.73 },
};

export const SAMPLE_REWRITE = {
  text: "A girl reaches up toward the cookie jar while a boy stands on a stool that is tipping over. Meanwhile, the mother washes dishes as water runs over onto the floor.",
  features: {
    ttr:0.88,mtld:112.4,mattr:0.91,content_word_repetition_rate:0.02,
    bigram_repetition_rate:0.0,unique_word_ratio:0.88,local_coherence:0.72,
    global_coherence:0.81,coherence_variance:0.01,mean_parse_depth:4.8,
    mean_sentence_length:16.5,clause_density:1.5,idea_density:0.42,
    filler_rate:0.0,incomplete_word_rate:0.0,mean_utterance_length:16.5,
    brunets_w:7.2,honores_r:1420.1,ciu_ratio:0.42,pronoun_noun_ratio:0.6,
  } as Features,
  prediction: { label: "Control" as const, confidence: 0.51 },
};
