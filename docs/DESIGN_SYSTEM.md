# Design System — CrashLab

Visual reference for the dashboard UI. Colors use OKLCH (perceptually uniform — better for generating consistent tints/shades than hex/HSL). Values below match the reference build the team approved.

## Color tokens

```css
--background:        oklch(98.5% .006 85);   /* warm off-white/cream page background */
--foreground:         oklch(22% .015 60);     /* warm near-black ink, primary text */
--muted-foreground:   oklch(52% .015 60);     /* secondary/muted text */
--card:               oklch(100% 0 0);         /* pure white card surface */
--border:             oklch(91% .01 80);       /* 1px card/divider border */
--input:              oklch(90% .01 80);
--primary:            oklch(24% .02 60);       /* near-black — primary buttons */
--primary-foreground: oklch(98% .006 85);
--secondary:          oklch(95.5% .008 85);
--muted:              oklch(95.5% .008 85);
--accent:             oklch(94% .012 85);

/* Domain-specific semantic roles — use these, not generic primary/secondary,
   for anything related to rooms/roles/verdicts */
--attacker:      oklch(60% .16 25);   /* warm red — red team / attack */
--attacker-soft: oklch(96% .03 25);
--defender:      oklch(55% .11 200);  /* blue — blue team / defense */
--defender-soft: oklch(96% .025 200);
--caught:        oklch(56% .12 165);  /* green — verified / blocked / safe */
--caught-soft:   oklch(95% .04 165);
--leak:          oklch(70% .15 60);   /* amber — leaky/inflated state, warnings */

--destructive:   oklch(60% .2 28);
--ring:          oklch(60% .12 165);  /* focus ring — reuses the "caught" green */
```

## Typography

- **Headlines:** Bricolage Grotesque, weights 500/700 — distinctive, editorial, not a default grotesque
- **Body / UI text:** Geist, weights 400/500/600
- **Technical values** (timestamps, hashes, IDs, percentages): Geist Mono, 400/500

Load via Google Fonts: `family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500`

## Shape & elevation

- Border radius: `.75rem` (12px) standard on cards and buttons
- Card shadow: a flat, hard-edged 1px offset shadow (not a soft blur) — e.g. `0 1px 0 oklch(20% .02 60 / 0.08)`. Deliberately a little editorial/bold, not generic soft-SaaS.
- Borders over shadows for most separation — reserve shadow for true overlays.

## Iconography

- Simple emoji are used deliberately as room/role markers, not mascot illustrations: 🎯 Attacker, 🤖 Model under test, 🛡️ Defender, 🚪 Hallway/broker.
- No cartoon character icons, no illustrated mascots, no decorative color-bar/stripe accents on cards.

## Naming conventions (use consistently in copy)

| Internal/API term | UI term |
|---|---|
| red-team | Attacker / Attacker room |
| blue-team | Defender / Defender room |
| broker | Hallway |
| audit log | Notebook |
| verdict: blocked | Caught |
| verdict: passed_through | Got through |
| verdict: ambiguous | Unsure |
| isolation ON | Sealed |
| isolation OFF (illustrative) | Leaky |

## Layout conventions

- Persistent left sidebar: brand mark, a "Workspace" nav section (Overview, Live run, Rooms, Notebook, History), a live status indicator ("Rooms sealed" / "No attacks yet"), a mode badge (Mock/Live).
- Main content: single column, stacked sections — hero line, Trust Switch card, stat-card row, activity/notebook panel, room cards.
- Every page's empty state should say something specific and inviting (e.g. "Every event will be written here, chained to the one before"), never a bare "No data."

## Key interaction: Tamper → Verify

The Notebook page's most important interaction: a "Tamper" button that simulates corrupting one log entry (via the broker's `?simulateTamperSeq=` demo parameter — never touches the real log) paired with a "Verify" button that proves detection. This is the single highest-value interaction in the whole UI for demonstrating the product's actual claim live.
