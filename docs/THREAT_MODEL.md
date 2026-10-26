# Threat Model — CrashLab

This document is a deliberate part of the product, not an afterthought. The core pitch of CrashLab is that a platform which discloses its limits is more trustworthy than one that claims perfect security. This is that disclosure.

## What we defend against

| Threat | How it's stopped |
|---|---|
| Blue team reading the attack prompt or technique before/during scoring | `/pending` only ever returns `{attackId, response}` — the prompt and technique never leave the broker's memory in that direction |
| Red team or blue team reaching each other directly | Separate Docker networks (`red-net`, `blue-net`); only the broker is on both. Verified live: a red-team container cannot resolve the blue-team container's hostname |
| Blue team (or anyone on `blue-net`/`red-net`) reading the audit log | `/audit` and `/verify` require `AUDIT_TOKEN`, which is never distributed to the red-team or blue-team containers — only to the broker and the host/dashboard |
| A forged or duplicated blue-team verdict | `/score` only accepts a verdict for an `attackId` that was genuinely issued via `/pending`, and only once (`409` otherwise) |
| Undetected tampering of the audit record | Every entry is HMAC-SHA256-chained to the previous one, keyed with a secret (`AUDIT_HMAC_KEY`) held only by the broker/host. Altering any entry, or deleting one, breaks the chain at a specific, identifiable point |
| Malformed/injected input via the `technique` field | Server-side validated against `^[a-z0-9_]{1,64}$`, in addition to client-side escaping in the dashboard |
| Stored XSS via attacker-influenced content (attack technique names, LLM response text) rendered in the dashboard | All interpolated values are HTML-escaped before touching the DOM; `verdict` and `event` names are checked against a fixed allow-list before being used as CSS classes |

## What we explicitly do NOT claim to protect against

| Threat | Why it's out of scope for this build |
|---|---|
| Kernel-level side channels (timing, cache, shared-resource contention) between containers on the same Docker host | All containers share one kernel. Docker's process/network isolation does not isolate at this level; would require gVisor/Kata-level sandboxing, not attempted here |
| A sophisticated container escape | We use Docker's standard isolation (`cap_drop: ALL`, `no-new-privileges`, read-only filesystem) — not a hardened runtime. Docker's own documentation does not recommend relying on it as a hard security boundary against a determined adversary |
| A fully compromised broker | The broker is, by necessity, the one component with access to both networks and the HMAC key. If it is compromised, the isolation and audit guarantees both fail. We do not have a design for Byzantine-fault-tolerant brokering in this build |
| LLM-native side channels (response-timing correlation, KV-cache leakage, cross-session contamination) | These are real, documented risks in shared-inference environments, and recent (2023–2025) research territory — not solved or attempted here |
| Confidentiality of the attack techniques themselves from a sufficiently privileged host operator | Anyone with direct access to the Docker host (not just the containers) can read environment variables, process memory, etc. This threat model assumes the host itself is trusted |

## Why this list exists

A judge, auditor, or user who finds a gap we didn't disclose has reason to distrust everything else we claim. A judge who finds a gap we *did* disclose, in writing, before they asked, has reason to trust the rest of what we say more, not less. That trade is the point of this document.

## Residual risk, summarized

The single biggest residual risk in this build is **trust in the broker itself**. Every guarantee in the "what we defend against" column depends on the broker container not being compromised. Strengthening that — through container runtime hardening (gVisor), broker code auditing, or splitting the broker's responsibilities across multiple least-privilege services — is the clearest next step for anyone extending this project beyond a hackathon prototype.
