# Daily release contract

The project promises an append-only calendar with at least one real update assigned to every Asia/Shanghai day after launch.

## Planning

- A deterministic random seed is derived from a private chaos salt, date, sequence, and generation mode.
- The daily target is weighted to 1, 2, or 3 releases.
- Release slots avoid the top of the hour because scheduled GitHub Actions can be delayed under load.
- Cooldowns prevent one recipe from dominating consecutive days.
- Every published seed is stored so the decision can be audited later.

## Priority

Core releases count toward the day's target. A core release may therefore postpone or replace a planned daily capsule. If a daily capsule shipped first, the later core release becomes a legitimate extra update.

## Guarantee mechanism

Five scheduled invocations run each day. The last slot publishes through reserve mode when no update exists. On recovery after an outage, the generator detects calendar gaps and creates signed reserve capsules for missing dates before handling today.

This guarantees ledger continuity after recovery. It does not claim that GitHub can never have an outage. A strict wall-clock SLA requires a second scheduler with independent infrastructure.

## Idempotency

- One workflow writer runs at a time through a GitHub concurrency group.
- Every capsule has a unique ID and monotonically increasing sequence.
- Existing core versions are not recorded twice.
- Installing an already installed capsule is a no-op.

## Non-empty proof

CI rejects a capsule unless:

- `changes` is non-empty;
- `expectedEffects` is non-empty;
- the payload hash matches the kind and payload;
- the Ed25519 signature verifies;
- the file is reachable from the feed;
- the capability has an executable consumer and rollback test.
