> **Superseded.** This is an early design note. The built-in demo data it mentions was removed; the dashboard reads only the live broker.

# CrashLab UI rebuild — design

Date: 2026-10-20. Approved in chat ("ok lets build").

## Intent
Replace the removed front end with one Vite + React app in `web/` that serves a
landing page at `/` and the dashboard at `/app`. Light theme only. Clean,
minimal, SaaS-professional, with soft abstract glows as the visual signature.

## Concept: the flight recorder
Every run is a sealed, replayable record. Screens show evidence, not decoration.

## Goals
- Judges can understand red → model → blind judge → sealed chain in 10 seconds.
- Dashboard works against the real broker (`/health`, `/audit`, `/verify`,
  `/trigger-run`) and against built-in demo data when no token is present.
- No flicker on poll: React state keyed by `seq`, never innerHTML.

## Non-goals / anti-goals
- No dark mode. No glassmorphism, no stock video, no ship footage.
- No fake customer logos or fabricated testimonials.
- Audit token is only requested on an explicit click, never on load.

## Palette (tokens in `web/src/index.css`)
canvas #F7F7F8 · surface #FFFFFF · border #E6E7EB · ink #111318 · muted #6B7280
brand/model violet #6D5DF6 · attack red #E5484D · judge blue #2F6FED ·
sealed green #1A9E5C · pending amber #D98A0B. Glows are radial blurs of these
at ~18% opacity behind content.

## Type
Inter (UI) + JetBrains Mono (hashes, ids, prompts). 8px grid, 240px sidebar,
1200px max content width.

## Pages
Landing `/`: hero with glow orbs + three-actor diagram, how a run works,
bento feature grid, sealed-log proof, stats, FAQ, CTA, footer.
Dashboard `/app`: Overview, Runs, Run detail (timeline + verify), Live run,
Attack library, Audit chain.

## Builder calls
- Runs are derived from the audit log: a new run starts when the gap between
  consecutive `attack_submitted` entries exceeds 45 seconds.
- Demo data toggle lives in the sidebar; it is clearly labelled.
- Deploy via root `vercel.json` building `web/`.
