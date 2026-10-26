# Product Requirements Document — CrashLab

**Status:** Living document, Phase 0/1 build
**Owner:** Byteforce (Nikunj, Abhishek, Nikhil)
**Hackathon:** Hack in Hills '26 — Problem Statement 04, "Securing Adversarial AI Safety Testing Infrastructure"

---

## 1. Problem

AI safety evaluation works by pitting a **red team** (tries to trick the model) against a **blue team** (tries to catch the trick) and scoring how often the blue team catches it. Today, these two teams and the model under test typically run in one shared, unisolated sandbox.

This creates a specific, concrete failure: if the blue team can observe the red team's payloads before or during a test, the resulting "safety score" is not a measurement — it's a number a leaky environment handed you. There is currently no way to tell, from the outside, whether a published AI safety score came from an honest test or a rigged one.

**Core question:** how do you let an attacker, a defender, and the model under test operate concurrently without leaking state between them — and prove, not just claim, that the isolation held?

## 2. Target users

| User | Need |
|---|---|
| AI safety teams (internal red/blue-team evaluation) | A way to run adversarial tests without worrying the defense team is "grading its own homework" |
| Third-party AI auditors / certification bodies | Evaluate a vendor's model without either party having to fully trust the other's environment |
| External red-teaming contractors | Prove their findings weren't invalidated by environment leakage back to the client |

## 3. Goals (Phase 0/1 — this build)

1. Demonstrate **real, verifiable isolation** between a red-team agent, a blue-team agent, and a target model — enforced at the network layer, not just claimed in a diagram.
2. Demonstrate **blind evaluation**: the blue team scores only the model's response, never the attack prompt or technique.
3. Produce a **tamper-evident audit log** of every event, with a verification check that can prove (not assert) whether the log has been altered.
4. State an explicit, honest **threat model** — what this protects against, what it doesn't — rather than claiming airtight security the team cannot actually deliver or verify.
5. Package all of the above behind a UI a non-security person can understand in under a minute ("the rooms," the Trust Switch), while still giving a technical reviewer (e.g. a judge) something real to probe.

## 4. Non-goals (explicitly out of scope for this build)

- Production-grade container hardening (custom seccomp profiles, gVisor/Kata-level isolation). Documented as residual risk, not solved.
- Defense against a fully compromised broker container, or a kernel-level side-channel attack.
- Multi-tenant / multi-customer SaaS features (billing, orgs, RBAC beyond the three fixed roles).
- Real attack-payload sourcing pipeline from AdvBench/JailbreakBench at scale — Phase 0 ships with a small, hardcoded, real set of prompt-injection techniques.
- A persistent "leaky mode" toggle in the backend (the Trust Switch's "95% / leaky" comparison is illustrative until this is built — see Open Questions).

## 5. Core user story

> As a safety team, I configure three "rooms" (attacker, defender, model under test), each with its own credential. I start a run. I watch attacks go in, responses come back, and verdicts get stamped — live. At any point I can hit "Verify" and get cryptographic proof the log hasn't been tampered with. I can also see, in plain terms, what this system does and does not protect against.

## 6. Key features

### 6.1 The Rooms (isolation architecture)
- Red team, blue team, and broker run as separate Docker containers on **two separate Docker networks** (`red-net`, `blue-net`); only the broker is attached to both.
- Verified: a red-team container cannot resolve or reach the blue-team container at all (not an application-layer restriction — a real network-layer one).

### 6.2 Blind evaluation
- The blue team receives only `{ attackId, response }` from the broker — never the prompt or technique label.
- `/score` only accepts a verdict for an `attackId` that was genuinely issued via `/pending`, exactly once — prevents a forged or duplicate verdict.

### 6.3 Tamper-evident audit log
- Every event (`attack_submitted`, `llm_response_received`, `blue_team_verdict`) is appended to a flat file as an HMAC-SHA256-chained entry (`hash = HMAC(prevHash | seq | ts | event | data)`).
- The HMAC key is held only by the broker/host — never by the red-team or blue-team containers — so the chain can't be recomputed or forged by anyone who merely reads the log.
- `/verify` independently recomputes the entire chain server-side and reports exactly where it breaks, if it does. A `simulateTamperSeq` demo mode shows this live without ever touching the real log.

### 6.4 Role-based authentication
- Three bearer tokens: `RED_TEAM_TOKEN`, `BLUE_TEAM_TOKEN`, `AUDIT_TOKEN`. Each container/consumer is handed only the token(s) it needs. This is what actually stops the blue team from reading attack prompts out of the audit log, even though it's network-reachable to the broker.

### 6.5 Honest threat model (see `THREAT_MODEL.md`)
- Explicitly disclosed, not hidden: what's protected, what isn't, and why that disclosure is itself the differentiator rather than a weakness.

### 6.6 The Trust Switch (UI centerpiece)
- A toggle comparing a "sealed" (real) catch rate against a "leaky" (illustrative, inflated) one, with the gap between them framed as "how much a leaky test lies to you."
- **Current status:** the "sealed" number is computed from real audit-log data. The "leaky" comparison number is illustrative until a real leaky-mode backend path is built (see Open Questions, #1).

## 7. Success metrics (for the hackathon, not a business)

- Live demo: a judge can watch an attack go in, a verdict come out, and click Verify and see a real pass/fail.
- Live demo: a judge can `docker exec` into the blue-team container and confirm it cannot reach `/audit` or the red-team container — i.e., the isolation claim survives an adversarial judge, not just a friendly one.
- The pitch's "honest disclosure" framing is reflected in the actual product (the threat model is a first-class screen/section, not an appendix).

## 8. Open questions / next decisions

1. **Real leaky-mode toggle:** build a second code path where the blue team *is* given the prompt, so the Trust Switch's "leaky" number is measured, not illustrative. (Biggest remaining gap between pitch and product.)
2. **History persistence:** currently no durable storage of past runs across restarts — in-memory + flat file only. Needed for the "History" screen to be real rather than always-empty.
3. **Real attack-payload sourcing:** move from 5 hardcoded techniques to a larger, categorized set from AdvBench/JailbreakBench.
4. **Container hardening depth:** decide how far to go on seccomp/gVisor given team skillset and remaining time — currently Docker defaults only (`cap_drop: ALL`, `no-new-privileges`, read-only FS).

## 9. Related documents
- `ARCHITECTURE.md` — system design and data flow
- `API.md` — broker endpoint reference
- `THREAT_MODEL.md` — explicit security disclosure
- `DESIGN_SYSTEM.md` — visual design tokens and UI conventions
