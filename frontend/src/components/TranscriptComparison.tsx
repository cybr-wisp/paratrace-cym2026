import { C, FEATURE_LABELS, FEATURE_NAMES } from "../types/analysis";

interface Props {
  features: Record<string, number | null>;
  rewrittenFeatures?: Record<string, number | null>;
}

export default function FeatureTable({ features, rewrittenFeatures }: Props) {
  return (
    <div style={{ maxHeight: 340, overflowY: "auto", fontSize: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={{ textAlign: "left", padding: "6px 8px", color: C.textSec, fontWeight: 600 }}>Feature</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: C.blue, fontWeight: 600 }}>Original</th>
            {rewrittenFeatures && (
              <th style={{ textAlign: "right", padding: "6px 8px", color: C.red, fontWeight: 600 }}>Rewritten</th>
            )}
            {rewrittenFeatures && (
              <th style={{ textAlign: "right", padding: "6px 8px", color: C.textSec, fontWeight: 600 }}>Change</th>
            )}
          </tr>
        </thead>
        <tbody>
          {FEATURE_NAMES.map(f => {
            const orig = features[f] as number;
            const rewr = rewrittenFeatures?.[f] as number;
            const pct = orig != null && rewr != null
              ? ((rewr - orig) / Math.abs(orig || 1) * 100) : null;
            return (
              <tr key={f} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "5px 8px", color: C.text }}>{FEATURE_LABELS[f] || f}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: C.blue }}>
                  {orig != null ? orig.toFixed(3) : "-"}
                </td>
                {rewrittenFeatures && (
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: C.red }}>
                    {rewr != null ? rewr.toFixed(3) : "-"}
                  </td>
                )}
                {rewrittenFeatures && (
                  <td style={{
                    padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 11,
                    color: pct != null ? (pct > 5 ? C.green : pct < -5 ? C.red : C.textMuted) : C.textMuted,
                  }}>
                    {pct != null ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : ""}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
