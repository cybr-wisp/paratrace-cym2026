import { useState } from "react";
import Demo from "./pages/Demo";
import Research from "./pages/Research";

type Page = "demo" | "research";

export default function App() {
  const [page, setPage] = useState<Page>("demo");

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setPage("demo")} aria-label="ParaTrace home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand-copy">
            <strong>PARATRACE</strong>
            <small>Clinical language preservation study</small>
          </span>
        </button>

        <div className="header-meta" aria-hidden="true">
          <span>PT—26</span>
          <span>UNIVERSITY OF OTTAWA</span>
        </div>

        <nav className="site-nav" aria-label="Primary navigation">
          <button className={page === "demo" ? "nav-link active" : "nav-link"} onClick={() => setPage("demo")}>
            <span>01</span> Demo
          </button>
          <button className={page === "research" ? "nav-link active" : "nav-link"} onClick={() => setPage("research")}>
            <span>02</span> Research
          </button>
          <a className="nav-link" href="https://github.com/cybr-wisp/paratrace-cym2026" target="_blank" rel="noreferrer">
            <span>↗</span> Source
          </a>
        </nav>
      </header>

      <main className="page-frame">{page === "demo" ? <Demo onOpenResearch={() => setPage("research")} /> : <Research />}</main>

      <footer className="site-footer">
        <div>
          <span className="mono-label">PARATRACE / CYM 2026</span>
          <p>Measuring cognitive-linguistic signal erosion under LLM rewriting.</p>
        </div>
        <div className="footer-right">
          <span>Marie Sindhu</span>
          <span>University of Ottawa</span>
        </div>
      </footer>
    </div>
  );
}
