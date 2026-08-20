import { C } from "../types/analysis";

interface Props {
  label: string;
  confidence: number;
  size?: number;
}

export default function ConfidenceGauge({ label, confidence, size = 112 }: Props) {
  const r = size * 0.41;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(confidence * 100);
  const isHealthy = label === "Control";
  const color = isHealthy ? C.blue : C.red;

  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.borderLight} strokeWidth={size*0.06} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.06}
            strokeDasharray={circ} strokeDashoffset={circ - (pct/100) * circ}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          fontSize: size * 0.23, fontWeight: 700, fontFamily: "monospace", color,
        }}>{pct}%</div>
      </div>
      <div style={{
        marginTop: 6, fontSize: 11, fontWeight: 700, color,
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{isHealthy ? "Healthy / Control" : "Probable Dementia"}</div>
    </div>
  );
}
