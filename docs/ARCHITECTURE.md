# Architecture — CrashLab

## System overview

Three services, two Docker networks, one shared volume (audit log only).

```
                    red-net                      blue-net
   ┌─────────────┐   ◄──────┐          ┌──────►   ┌──────────────┐
   │  red-team    │          │          │          │   blue-team   │
   │ (attacker)   │          │          │          │  (defender)   │
   └─────────────┘          │          │          └──────────────┘
                              ▼          ▼
                         ┌───────────────────┐
                         │      broker        │
                         │  (on both networks) │
                         │  + target LLM call  │
                         │  + audit log owner   │
                         └───────────────────┘
                                   │
                                   ▼
                          logs/audit.log
                        (HMAC-chained, host volume)
```

**There is no network path between `red-team` and `blue-team`.** This is enforced by Docker Compose's network definitions, not application logic — verified by attempting a request from inside the red-team container to the blue-team container's hostname (fails to resolve/connect).

## Services

### `services/broker`
The only service on both networks. Responsibilities:
- `POST /submit-attack` (red-team only): takes `{ technique, prompt }`, calls the target LLM, logs both the submission and the response, queues the response for blue-team pickup.
- `GET /pending` (blue-team only): hands back `{ attackId, response }` — never the prompt or technique.
- `POST /score` (blue-team only): records a verdict, but only for an `attackId` actually issued via `/pending`, and only once.
- `GET /audit`, `GET /verify` (host/dashboard only, via `AUDIT_TOKEN`): read-only observability — never exposed to red-team or blue-team.
- Owns the audit log (`services/broker/audit.js`) and the LLM client (`services/broker/llm.js`, supports a mock mode with canned responses when no API key is set).

### `services/red-team`
Reads `attacks.json` (a small, real set of prompt-injection techniques) and fires each one at the broker on startup, authenticated with `RED_TEAM_TOKEN`. Has no other token and is on `red-net` only.

### `services/blue-team`
Polls `/pending`, runs a simple heuristic classifier (`services/blue-team/classifier.js` — keyword-based refusal/compliance detection) against the response text only, and posts a verdict back. Authenticated with `BLUE_TEAM_TOKEN`. Has no other token and is on `blue-net` only.

## Data flow (one attack, end to end)

1. `red-team` → `POST /submit-attack` (with `RED_TEAM_TOKEN`) → `broker`
2. `broker` appends an `attack_submitted` audit entry, then calls the target LLM
3. `broker` appends an `llm_response_received` audit entry, queues `{attackId, response}` for blue-team
4. `blue-team` → `GET /pending` (with `BLUE_TEAM_TOKEN`) → `broker` returns the queued item, marks it issued
5. `blue-team` classifies the response (never having seen the prompt), → `POST /score` (with `BLUE_TEAM_TOKEN`)
6. `broker` validates the `attackId` was actually issued and not already scored, appends a `blue_team_verdict` audit entry

Every step 2/3/6 writes one HMAC-chained line to `logs/audit.log`.

## Audit log format

Each line is a JSON object:

```json
{"seq": 12, "ts": "2026-10-18T15:13:10.611Z", "event": "blue_team_verdict",
 "data": {"attackId": "...", "verdict": "blocked", "confidence": 0.8},
 "prevHash": "<hex>", "hash": "<hex>"}
```

`hash = HMAC-SHA256(AUDIT_HMAC_KEY, prevHash|seq|ts|event|JSON(data))`. The chain starts from a genesis hash of 64 zeros. Verification (`GET /verify`, or `scripts/verify-log.js` on the host) recomputes every hash from scratch and reports the first entry where it doesn't match — either a `prevHash` mismatch (an entry was deleted/reordered) or a hash mismatch (an entry's data was altered).

## Hardening applied

- Every container: `cap_drop: ALL`, `security_opt: no-new-privileges:true`, `read_only: true` (except the broker's `/logs` mount, which must be writable).
- Host port binding: `127.0.0.1:4000:4000` — not reachable from outside the host machine.
- Per-role bearer tokens (see `API.md`) — the actual mechanism that prevents cross-role reads, since all three containers share the broker as a common reachable host.

## What's deliberately NOT here (see `THREAT_MODEL.md` for the full list)

- No custom seccomp/AppArmor profiles — Docker defaults only.
- No gVisor/Kata-level sandboxing.
- No defense against a fully compromised broker (it is, by design, the one component that must be trusted — it's the single point with access to both networks and the HMAC key).
