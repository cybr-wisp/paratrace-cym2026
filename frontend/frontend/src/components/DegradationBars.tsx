import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { C } from "../types/analysis";

const DATA = [
  { level: "L0 Original", OpenAI: 98.6, Anthropic: 98.6, chance: 50 },
  { level: "L1 Grammar",  OpenAI: 74.8, Anthropic: 78.1, chance: 50 },
  { level: "L2 Light",    OpenAI: 58.7, Anthropic: 65.9, chance: 50 },
  { level: "L3 Moderate", OpenAI: 53.8, Anthropic: 47.6, chance: 50 },
  { level: "L4 Full",     OpenAI: 49.6, Anthropic: 53.8, chance: 50 },
];

export default function DegradationChart({ height = 260 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={DATA} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
        <XAxis dataKey="level" tick={{ fill: C.textSec, fontSize: 11 }} />
        <YAxis domain={[30, 100]} tick={{ fill: C.textSec, fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12,
        }} />
        <Line type="monotone" dataKey="OpenAI" stroke={C.blue} strokeWidth={2.5}
          dot={{ r: 4, fill: C.blue }} />
        <Line type="monotone" dataKey="Anthropic" stroke={C.orange} strokeWidth={2.5}
          dot={{ r: 4, fill: C.orange }} />
        <Line type="monotone" dataKey="chance" stroke={C.red} strokeWidth={1}
          strokeDasharray="6 4" dot={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
