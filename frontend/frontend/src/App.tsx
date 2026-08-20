import { useState } from "react";
import { C } from "./types/analysis";
import Demo from "./pages/Demo";
import Research from "./pages/Research";

type Page = "demo" | "research";

export default function App() {
  const [page, setPage] = useState<Page>("demo");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <header style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => setPage("demo")}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.blue}, ${C.orange})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: C.white,
          }}>P</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>ParaTrace</span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>CYM 2026</span>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {([["demo", "Demo"], ["research", "Research"]] as [Page, string][]).map(([key, lbl]) => (
            <button key={key} onClick={() => setPage(key)} style={{
              padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${page === key ? C.blue : C.border}`,
              background: page === key ? C.bluePale : "transparent",
              color: page === key ? C.blue : C.textSec, cursor: "pointer",
            }}>{lbl}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px" }}>
        {page === "demo" && <Demo />}
        {page === "research" && <Research />}
      </main>

      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: "14px 24px",
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: C.textMuted, marginTop: 40,
      }}>
        <span>ParaTrace &middot; CYM 2026 &middot; University of Ottawa</span>
        <span>Marie Sindhu</span>
      </footer>

      <style>{`
        @keyframes pt-spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
