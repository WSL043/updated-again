# Updated Again

> A living software toy that changes something every day, because updating is the point.

[Play online](https://wsl043.github.io/updated-again/) · [Release ledger](https://wsl043.github.io/updated-again/feed/index.json) · [Suggest an update](https://github.com/WSL043/updated-again/issues/new?template=update-idea.yml) · [简体中文](README.zh-CN.md)

It updates itself. The reason can be “the author felt like it”; the change must be real, verifiable, installable, and reversible.

<!-- daily-status:start -->
## Daily running record

[![Health audit](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml) [![Daily release](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml)

As of **2026-10-15 (UTC)**: **62 consecutive on-schedule release days**, with **62 consecutive days covered by the ledger**.

| Metric | Record |
|---|---|
| First release date | 2026-08-14 |
| Latest covered date | 2026-10-14 |
| Capsules / covered dates | 90 / 62 |
| Dates covered only by backfills | 0 |
| Completed dates still missing | 0 |

Last seven days:

| Date | Capsules | Publication | Types |
|---|---:|---|---|
| 2026-10-15 | 0 | Pending today | — |
| 2026-10-14 | 4 | Published on schedule | `collectible`, `message` |
| 2026-10-13 | 1 | Published on schedule | `theme` |
| 2026-10-12 | 2 | Published on schedule | `companion`, `theme` |
| 2026-10-11 | 1 | Published on schedule | `constellation` |
| 2026-10-10 | 1 | Published on schedule | `constellation` |
| 2026-10-09 | 3 | Published on schedule | `companion`, `message`, `ritual` |

Generated from the signed ledger during publication and daily audits. New releases use UTC. Historical entries without calendar metadata retain their original recorded calendar; they are never rewritten. Backfills restore ledger coverage, but do not repair on-schedule publication streaks. An unfinished today is allowed; a missing completed day breaks the streak.

This measures release activity, not continuous website uptime. Health audits separately verify the public Pages ledger and latest capsule. Check the snapshot date and audit timestamp for freshness.
<!-- daily-status:end -->

## What you can do

- **Circuit Room:** daily puzzles, historical replay, seven-round weekly challenges, and free practice on 3×3, 4×4, and 5×5 boards. Each puzzle saves separately. Undo, shortest-solution hints, independent scores, share links, and downloadable PNG scorecards are included. No account or capsule installation is required.
- **Patch Mixer:** turn installed changes into 84 collectible experiments, with daily clues and a local notebook.
- **Focused navigation:** Play, Today, Archive, and About have separate pages. One toy is shown at a time; the board, records, and controls retain a consistent layout.
- **Four interface languages:** English by default, plus Simplified Chinese, Japanese, and Spanish. Use the header selector; your choice stays on this device. Switching languages keeps puzzle progress and records.
- **Local play calendar:** daily puzzles, weekly challenges, and displayed timestamps follow your device's local time. New public releases and automated health audits use UTC. Original signed release text and historical records retain their published content.
- **Real daily releases:** GitHub Actions runs at five staggered times. A constrained random planner chooses one to three updates per day. A published Core release counts toward that day's activity. The final slot provides a fallback; later runs backfill missing dates after interruptions.
- **Verified capsules:** Ed25519 signatures and content hashes are checked before installation. Each installation saves a local snapshot for rollback.
- **Shared clients:** Web, PWA, and Tauri desktop apps use the same ledger and capability registry. Daily visual variations are reproducible from the local date and latest capsule seed.
- **Automatic Core releases:** real feature/fix commits enter a release candidate, pass checks, and produce tags, GitHub Releases, installers, and updater manifests. Daily content alone does not issue a new client version.

The ledger aims to cover every day. Third-party scheduling and hosting can still fail; staggered runs, fallback slots, and backfills reduce that risk. Release-day counts are not continuous uptime measurements.

## Two timelines

| Timeline | Example | Publisher | Purpose |
|---|---|---|---|
| Daily Capsule | `D-20260814-0001-museum-object` | Rules engine | Themes, messages, collectibles, rituals, companion states, constellations, and button personalities |
| Core Release | `v0.6.0` | Validated code changes | New games, capabilities, migrations, permissions, and updater changes |

An agent can propose reasons, dialogue, parameters, and recipe PRs. It does not hold the signing key or directly grant native permissions. The deterministic recipe engine and reserve pool work without an agent.

Conventional Commits determine SemVer. Release Please prepares version files and the changelog; project checks must pass before the candidate is merged. A failed candidate leaves existing daily content available.

## Community autopilot

- Public update-idea Issues are sanitized by a trusted workflow and mapped to existing capabilities as signed capsules.
- Declarative community PRs within `content/recipes.json`, `community/`, and `docs/` can merge after full CI.
- Restricted Dependabot dependency PRs can also merge automatically. Arbitrary source code, scripts, workflows, or permissions from ordinary community PRs cannot cross that executable boundary automatically.
- If an automatic community merge breaks main CI, recovery reverts only the latest failed `[auto-community]` commit and records an incident Issue.
- Daily audits check signatures, completed UTC release dates, and the public Pages feed. They open an Issue on failure and close it after recovery.

Issue and PR text never receives signing secrets. Set repository variable `COMMUNITY_AUTOPILOT=false` to disable community autopilot.

## Capabilities

| Kind | Visible effect |
|---|---|
| `theme` | World palette and banner |
| `message` | An installed, archived sentence |
| `collectible` | A unique version artifact |
| `ritual` | A small, unnecessary ritual |
| `companion` | Patch's appearance, mood, and dialogue |
| `constellation` | A new star in the release map |
| `button-personality` | Update-button wording and motion |

Add recipes in [`content/recipes.json`](content/recipes.json). A new capability needs generation, validation, application, visible effects, rollback, and tests; see [`ADDING_UPDATE_TYPES.md`](docs/ADDING_UPDATE_TYPES.md).

## Version chat

Local chat first matches project rules, then searches 410,009 community dialogue pairs. Language packs load on demand: Chinese is about 4.62 MB; other individual packs are at most 2.66 MB. The corpus includes KdConv, ChatterBot Corpus, and XDailyDialog. Local retrieval runs in the browser without sending messages to an external service.

Visitors can explicitly choose anonymous AI Horde or connect Puter for generated replies. Horde sends messages to community workers; queuing failures and timeouts cancel the request and return to local chat. Puter uses the visitor's own monthly allowance, with available usage shown after connection. The app stores no developer API key.

## Run locally

Use Node.js 22.22.2 or later and pnpm 10. Desktop builds also require Rust and the platform's Tauri system dependencies.

```bash
pnpm install
pnpm dev
```

Validate the app and update protocol:

```bash
pnpm check
```

Simulate a future update without writing it:

```bash
pnpm update:simulate
```

Run the desktop shell:

```bash
pnpm tauri:dev
```

Production daily releases use CI secrets `CAPSULE_SIGNING_PRIVATE_KEY` and `CHAOS_SEED`. Keep private keys out of source files, Issues, and logs.

## Platforms

| Platform | Delivery |
|---|---|
| Web | Automatic GitHub Pages deployment |
| Phone/tablet | Responsive PWA with home-screen installation |
| Windows x64 | Tauri NSIS/MSI Developer Preview |
| Linux x64 | Tauri AppImage/deb/rpm Developer Preview |
| macOS Apple Silicon | Tauri DMG/app Developer Preview |
| macOS Intel | Separate Intel CI build |
| Native iOS/Android stores | Not currently claimed; requires accounts, devices, and store signing |

Desktop artifacts use project updater signatures but do not currently have paid Apple Developer ID or Windows Authenticode certificates. They remain Developer Preview until real-device installation, update, rollback, and uninstall have been verified. CI success alone does not establish device support.

## Repository

```text
src/                 Shared Web/PWA and desktop UI
src/i18n/            Interface catalog and language preferences
src/capabilities/    Capsule capabilities and rollback boundaries
src/core/            Protocol, signatures, storage, and update client
content/             Declarative recipes
scripts/             Planning, publishing, signing, and ledger validation
public/feed/         Append-only ledger and Core update pointers
public/updates/      Immutable capsules
src-tauri/           Cross-platform desktop shell
.github/workflows/   CI, daily releases, Pages, and Core releases
```

See [`ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`DAILY_RELEASE_CONTRACT.md`](docs/DAILY_RELEASE_CONTRACT.md), and [`LOCALIZATION.md`](docs/LOCALIZATION.md).

This is a public Developer Preview. The project is in no hurry to declare 1.0; that does not excuse skipping verification, safety, or rollback.

MIT License
