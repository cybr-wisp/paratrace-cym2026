import { C } from "../types/analysis";

export function highlightBiomarkers(text: string) {
  const words = text.split(/(\s+)/);
  const seen: Record<string, boolean> = {};
  return words.map((word, i) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (/^(um|uh|er|ah|hm|hmm|mhm|well)$/.test(clean))
      return <span key={i} style={{ background: C.yellowHL, borderRadius: 3, padding: "1px 3px" }}>{word}</span>;
    if (word.includes("..."))
      return <span key={i} style={{ background: C.redHL, borderRadius: 3, padding: "1px 3px" }}>{word}</span>;
    if (clean && seen[clean] && clean.length > 2)
      return <span key={i} style={{ background: C.orangeHL, borderRadius: 3, padding: "1px 3px" }}>{word}</span>;
    if (clean && clean.length > 2) seen[clean] = true;
    return <span key={i}>{word}</span>;
  });
}

export function BiomarkerLegend() {
  const items: [string, string, string][] = [
    [C.yellowHL, C.yellow, "Fillers (um, uh)"],
    [C.orangeHL, C.orange, "Repetitions"],
    [C.redHL, C.red, "Fragments (...)"],
  ];
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.textMuted, marginTop: 10 }}>
      {items.map(([bg, border, lbl]) => (
        <span key={lbl}>
          <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: 2,
            background: bg, border: `1px solid ${border}`, marginRight: 4,
            verticalAlign: "middle",
          }} />{lbl}
        </span>
      ))}
    </div>
  );
}
