import {
  Radar, RadarChart as RC, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend,
} from "recharts";
import { CATEGORIES, catScore, C } from "../types/analysis";

interface Props {
  original: Record<string, number | null>;
  rewritten?: Record<string, number | null>;
  showRewritten?: boolean;
  height?: number;
}

export default function BiomarkerRadar({ original, rewritten, showRewritten, height = 280 }: Props) {
  const data = Object.keys(CATEGORIES).map(cat => ({
    category: cat,
    original: catScore(original, CATEGORIES[cat]),
    ...(showRewritten && rewritten ? { rewritten: catScore(rewritten, CATEGORIES[cat]) } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RC data={data} outerRadius="68%">
        <PolarGrid stroke={C.border} />
        <PolarAngleAxis dataKey="category" tick={{ fill: C.textSec, fontSize: 10 }} />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 1]} />
        <Radar name="Original" dataKey="original" stroke={C.blue} fill={C.blue}
          fillOpacity={0.12} strokeWidth={2} />
        {showRewritten && (
          <Radar name="After AI" dataKey="rewritten" stroke={C.red} fill={C.red}
            fillOpacity={0.08} strokeWidth={2} />
        )}
        <Legend wrapperStyle={{ fontSize: 11, color: C.textSec }} />
      </RC>
    </ResponsiveContainer>
  );
}
