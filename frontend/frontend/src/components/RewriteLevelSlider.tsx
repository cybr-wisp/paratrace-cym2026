import { C, LEVEL_INFO } from "../types/analysis";

interface Props {
  level: number;
  onSelect: (l: number) => void;
}

export default function RewriteLevelSlider({ level, onSelect }: Props) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4].map(l => (
        <div key={l} style={{ textAlign: "center" }}>
          <button onClick={() => onSelect(l)} style={{
            width: 44, height: 38, borderRadius: 8, fontSize: 14, fontWeight: 600,
            fontFamily: "monospace",
            border: `1.5px solid ${level === l ? C.orange : C.border}`,
            background: level === l ? C.orangePale : "transparent",
            color: level === l ? C.orange : C.textMuted, cursor: "pointer",
          }}>L{l}</button>
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3, maxWidth: 55 }}>
            {LEVEL_INFO[l].name}
          </div>
        </div>
      ))}
    </div>
  );
}
