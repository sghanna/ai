# Agy-Solitaire (Solitaire for Low Vision)

An ad-free, high-legibility, culturally authentic Klondike Solitaire progressive web app engineered for seniors with low vision.

- **Live Web App:** [https://sghanna.github.io/agy-solitaire/](https://sghanna.github.io/agy-solitaire/)
- **Interactive Web Case Study:** [https://sghanna.github.io/agy-solitaire/case-study.html](https://sghanna.github.io/agy-solitaire/case-study.html)
- **Product & Design Leadership Case Study (Markdown):** [CASE-STUDY.md](CASE-STUDY.md)

---

## The Origin & Purpose

Commercial card games on the App Store are cluttered with aggressive video ads, deceptive close buttons, tiny corner indices designed for 20/20 vision, and toolbars that invite accidental taps.

When my 78-year-old mother—who has sight in only one eye with floaters—struggled with commercial solitaire apps, I led the end-to-end design and delivery of **Agy-Solitaire**: a zero-friction, offline-first mobile web app tailored specifically to her sensory, motor, and cultural needs on an iPhone 16e.

## Core Features & Accessibility Highlights

1. **High-Legibility Traced Vector Typography**: High-contrast Didone-style serif ranks and French Curve suits rendered via zero-dependency SVGs. The distinctive downward tail of the Queen (`Q`) is fully preserved even under tight tableau cascading (32px vertical step).
2. **Accidental Tap Prevention & Spatial Isolation**:
   - `[＋ New]` locked to the far left.
   - `[↶ Undo]` locked to the far right.
   - Utility controls (`[? Help]` and `[☰ Menu]`) centered.
   - Generous ~38px physical buffer preventing destructive miss-taps during fast Undo play.
3. **Cognitive De-cluttering (Separated Telemetry)**:
   - Header is clean with only essential navigational buttons as stand-alone oval pills.
   - Score and Moves docked into a non-intrusive floating brass pill at the bottom of the screen (`pointer-events: none`).
   - Timer hidden by default (toggleable in Menu) to prevent timer anxiety.
   - Sound toggles located inside Menu settings.
4. **Cultural Authenticity (Hong Kong / Cantonese Heritage)**:
   - Features the **Imperial Golden Dragon (金龍)** medallion on the card backs, victory screens, and confirmation seals with 36 sunburst notches and a flaming ruby pearl.
   - Bespoke vector icons for How-to-Play instructions (no generic emojis).
   - Auspicious sky lanterns (`久`, `龍`, `福`, `禄`, `寿`, `吉`, `财`, `旺`, `春`, `和`) ascending across the victory celebration.
5. **Psychological Safety & Deal Modes**:
   - **Guaranteed Winnable First Deal**: Deal #1 is verified by an algorithmic solver to ensure a winnable layout.
   - Settings toggle between Deal 1 and Deal 3 modes, and between Two-Tap and Single-Tap auto-fly.
6. **Offline PWA**: Vanilla ES6 JavaScript, HTML5 canvas/SVG, CSS3, Service Worker caching (`CACHE_NAME = 'agy-solitaire-v15'`), and procedural Web Audio synthesis with no external framework dependencies.

## Case Study

Read the full executive case study covering product constraints, human-in-the-loop AI orchestration, design overrides, and leadership takeaways:

👉 **[Read the Full Case Study (CASE-STUDY.md)](CASE-STUDY.md)**
