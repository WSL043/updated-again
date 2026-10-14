# Languages and calendars

The interface defaults to English. The header selector also offers Simplified Chinese, Japanese, and Spanish. The explicit preference is saved under `updated-again:language:v1`; unavailable storage keeps the current selection usable for the session. Browser language does not override the English default. Puzzle seeds, saves, and installed capsules are independent of language.

`src/i18n/messages.ts` contains source-keyed messages with English, Japanese, and Spanish columns. Chinese source keys supply Simplified Chinese, with a small set of English-key overrides in `src/i18n/index.ts`. Use `t(source, values)` with numbered placeholders for dynamic messages. React components subscribe with `useLanguage()`. To add a language, extend the language list, column mapping, catalog type and rows, and coverage tests together.

The catalog also covers all 84 Patch Mixer names, descriptions, and clues. Signed capsule content, contributor release notes, and arbitrary chat messages retain their original text; they are never rewritten or silently sent to a translation service.

Daily play, weekly boundaries, visual variations, and displayed timestamps follow the device's local calendar via `localDay`. Shared puzzle URLs contain a date explicitly, so opening a link preserves that puzzle across time zones.

New public capsules and feed entries carry signed `calendarTimeZone: "UTC"` metadata. Scheduling, daily status, and health checks use UTC for new releases. Existing signed records are immutable: entries without metadata keep their original calendar when evaluating on-time publication. Backfills restore coverage without repairing on-time streaks.

`pnpm check` verifies catalog coverage, matching placeholders, all game languages, progress preservation, local date offsets and daylight-saving boundaries, historical release calendars, signatures, and the full application build. Check responsive layouts and actual downloaded PNG scorecards when changing translations.
