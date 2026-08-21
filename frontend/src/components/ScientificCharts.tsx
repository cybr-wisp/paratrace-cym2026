import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES, FEATURE_LABELS, RANGES } from "../types/analysis";
import { STUDY_ACCURACY } from "../data/study";

export type FeatureMap = Record<string, number | null>;

type HistoryPoint = {
  n: number;
  lexical: number;
  filler: number;
  repetition: number;
};

const BLUE = "#2458d3";
const ORANGE = "#d84b2a";
const MUTED = "#8b897f";
const LINE = "#d5d2c8";
const PAPER = "#f5f3ed";

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizedFeature(name: string, value: unknown): number | null {
  const numeric = finiteOrNull(value);
  if (numeric === null) return null;
  const [lo, hi] = RANGES[name] ?? [0, 1];
  if (hi === lo) return 0;
  return Math.max(0, Math.min(1, (numeric - lo) / (hi - lo)));
}

function categoryRows(features: FeatureMap) {
  return Object.entries(CATEGORIES).map(([category, names]) => {
    const values = names.map((name) => normalizedFeature(name, features[name])).filter((v): v is number => v !== null);
    return {
      category,
      value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  });
}

export function CategoryRadar({ original, rewritten }: { original: FeatureMap; rewritten?: FeatureMap | null }) {
  const originalRows = categoryRows(original);
  const rewrittenRows = rewritten ? categoryRows(rewritten) : null;
  const data = originalRows.map((row, index) => ({
    category: row.category,
    original: row.value,
    rewritten: rewrittenRows?.[index]?.value ?? null,
  }));

  return (
    <div className="chart-shell radar-shell">
      <div className="chart-title"><span>NORMALIZED FEATURE PROFILE</span><small>8 categories / 20 features</small></div>
      <ResponsiveContainer width="100%" height={310}>
        <RadarChart data={data} outerRadius="67%">
          <PolarGrid stroke={LINE} />
          <PolarAngleAxis dataKey="category" tick={{ fill: "#57564f", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
          <Radar name="Original" dataKey="original" stroke={BLUE} fill={BLUE} fillOpacity={0.13} strokeWidth={2} />
          {rewritten && <Radar name="Rewritten" dataKey="rewritten" stroke={ORANGE} fill={ORANGE} fillOpacity={0.09} strokeWidth={2} />}
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StudyAccuracyChart({ activeLevel }: { activeLevel?: number }) {
  const data = STUDY_ACCURACY.map((row) => ({
    level: `L${row.level}`,
    OpenAI: row.openai,
    Anthropic: row.anthropic,
    Chance: 50,
  }));
  return (
    <div className="chart-shell">
      <div className="chart-title"><span>REPOSITORY-REPORTED ACCURACY SUMMARY</span><small>L0 CV baseline · L1–L4 degradation evaluation</small></div>
      <ResponsiveContainer width="100%" height={285}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 2 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="level" tick={{ fill: "#66645d", fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis domain={[40, 82]} tick={{ fill: "#66645d", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, fontSize: 11 }} />
          <Line type="monotone" dataKey="OpenAI" stroke={BLUE} strokeWidth={2.5} dot={(props: any) => <circle {...props} r={props.index === activeLevel ? 5.5 : 3.8} fill={BLUE} />} />
          <Line type="monotone" dataKey="Anthropic" stroke={ORANGE} strokeWidth={2.5} dot={(props: any) => <circle {...props} r={props.index === activeLevel ? 5.5 : 3.8} fill={ORANGE} />} />
          <Line type="monotone" dataKey="Chance" stroke={MUTED} strokeWidth={1} strokeDasharray="5 5" dot={false} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FeatureDeltaChart({ original, rewritten }: { original: FeatureMap; rewritten: FeatureMap }) {
  const rows = Object.keys(FEATURE_LABELS)
    .map((name) => {
      const before = finiteOrNull(original[name]);
      const after = finiteOrNull(rewritten[name]);
      if (before === null || after === null) return null;
      const denom = Math.max(Math.abs(before), 1e-6);
      return {
        feature: FEATURE_LABELS[name],
        delta: ((after - before) / denom) * 100,
      };
    })
    .filter((row): row is { feature: string; delta: number } => row !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 10);

  return (
    <div className="chart-shell">
      <div className="chart-title"><span>LARGEST FEATURE SHIFTS</span><small>relative change / top 10</small></div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} layout="vertical" margin={{ top: 6, right: 18, left: 92, bottom: 6 }}>
          <CartesianGrid stroke={LINE} horizontal={false} />
          <XAxis type="number" tick={{ fill: "#66645d", fontSize: 9 }} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="feature" width={90} tick={{ fill: "#57564f", fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, fontSize: 11 }} />
          <Bar dataKey="delta" radius={0}>
            {rows.map((row) => <Cell key={row.feature} fill={row.delta >= 0 ? BLUE : ORANGE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LiveProxyBars({ values }: { values: { label: string; value: number; display: string }[] }) {
  return (
    <div className="chart-shell compact-chart">
      <div className="chart-title"><span>LIVE SURFACE FEATURES</span><small>browser-side preview</small></div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={values} margin={{ top: 8, right: 8, left: -22, bottom: 38 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="label" interval={0} angle={-28} textAnchor="end" tick={{ fill: "#66645d", fontSize: 9 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis domain={[0, 1]} tick={{ fill: "#66645d", fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(_: number, __: string, item: any) => item.payload.display} contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, fontSize: 11 }} />
          <Bar dataKey="value" fill={BLUE} radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LiveHistoryChart({ history }: { history: HistoryPoint[] }) {
  return (
    <div className="chart-shell compact-chart">
      <div className="chart-title"><span>TRACE WHILE YOU TYPE</span><small>last {history.length} updates</small></div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={history} margin={{ top: 8, right: 8, left: -22, bottom: 8 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="n" hide />
          <YAxis domain={[0, 1]} tick={{ fill: "#66645d", fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, fontSize: 11 }} />
          <Line type="monotone" dataKey="lexical" name="Lexical diversity" stroke={BLUE} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="filler" name="Filler intensity" stroke={ORANGE} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="repetition" name="Repetition intensity" stroke="#7e67bd" strokeWidth={2} dot={false} />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
