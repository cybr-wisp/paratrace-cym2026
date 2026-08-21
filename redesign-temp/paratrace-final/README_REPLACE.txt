PARATRACE — FINAL FRONTEND REDESIGN

Replace these 4 files in your existing frontend:

  frontend/src/App.tsx
  frontend/src/pages/Demo.tsx
  frontend/src/pages/Research.tsx
  frontend/src/styles/index.css

Keep your existing:

  frontend/src/main.tsx
  frontend/src/types/analysis.ts
  frontend/package.json

Your current main.tsx already imports ./styles/index.css, so no entrypoint edit is needed.
No new npm dependency is required.

RUN

  cd frontend
  npm install
  npm run build
  npm run dev

WHAT CHANGED

- Replaced the generic SaaS/dashboard visual language with an editorial scientific-instrument design.
- Removed the gradient-letter logo, pill navigation, card-grid feel, shadows, and inline-style-heavy App shell.
- Added a high-impact result-first hero with the real L0–L4 study curve.
- Added an interactive guided L0→L4 rewrite experiment.
- Added transcript-level disfluency/repetition highlighting.
- Added an interactive biomarker-retention map using the existing project's BRR data.
- Added a dark proposed-safeguard architecture reveal.
- Reworked Research into a digital-paper layout while retaining methodology, results, feature importance, BRR, corpus details, references, and reproducibility.
- Kept the live speech demo, but made it explicitly non-diagnostic and browser-side illustrative.
- Standardized the primary accuracy figures to the repository README:
    L0 73.4%
    L1 76.5%
    L2 62.3%
    L3 50.7%
    L4 51.7%
- Responsive layouts are included for desktop, tablet, and mobile.

NOTE

The stylesheet imports IBM Plex Mono, Instrument Sans, and Newsreader from Google Fonts.
If the demo venue has no internet, either preload those fonts locally or accept the system-font fallbacks.
