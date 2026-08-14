# Architecture

Updated Again is a modular monolith. The Web/PWA and Tauri desktop shells share one protocol, one capability registry, and one append-only public ledger. Independent services are deliberately avoided until deployment or scale creates a measured need.

## Product invariants

1. Every published update declares at least one real change and one expected effect.
2. A capsule cannot execute arbitrary shell commands or native code.
3. Every capsule is immutable, content-addressed, signed, and locally reversible.
4. Core binaries and daily capsules use separate version streams.
5. The public ledger is append-only; rollback changes local state but never erases history.
6. Agent output is untrusted proposal data, never release authority.

## Dependency direction

```text
recipe data ──> release planner ──> capsule protocol ──> signed public ledger
                                           │
                                           v
desktop/web shell ──> update client ──> capability registry ──> local world state
                                           │
                                           v
                                     snapshot rollback
```

- `src/core/types.ts` owns the wire and persistence contracts.
- `src/capabilities` owns the only allowed state mutations.
- UI components may request install/rollback but cannot bypass signature verification.
- Release scripts may create immutable artifacts but cannot add client capabilities.
- New capabilities require a Core Release; new recipes only select existing capabilities.

## Release state machine

```text
planned -> generated -> schema checked -> hashed -> signed -> validated -> published
                                                                   │
                                                                   v
                                                    installed -> verified -> archived
                                                                   │
                                                                   v
                                                               rolled back
```

An invalid candidate is discarded. At the daily deadline, the scheduler uses a pre-approved reserve path instead of weakening validation.

## Two viable structures considered

### Agent writes and ships code every day

Maximum novelty, but it combines creativity, privileges, code execution, signing, and publication into one failure domain. A single prompt injection or bad generation could become a supply-chain incident. Rejected.

### Constrained capsule runtime with occasional core releases

The client exposes a finite capability registry. Randomness and Agents only fill signed declarative payloads. New capabilities travel through ordinary code review and cross-platform CI. Chosen because it localizes daily change while keeping native authority stable.

## Data ownership

- Public truth: `public/feed/index.json` and immutable files under `public/updates/`.
- Local truth: the latest installed `WorldState` and up to 100 rollback snapshots.
- Core update truth: `public/feed/core-latest.json`, copied from the signed Tauri release manifest.
- Secrets: GitHub Actions secrets only. They must never enter public source, build logs, or Agent context.

## Future seams

- Agent proposal adapter: emits a recipe-shaped proposal; deterministic validation remains unchanged.
- Secondary scheduler: calls the same idempotent daily command for stronger availability.
- Community recipes: accepted as data-only pull requests with licensing metadata.
- Native mobile: separate platform shell; it must not weaken the capsule protocol.
