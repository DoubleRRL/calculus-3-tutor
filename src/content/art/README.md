# Art module

Matisse-cut-inspired SVG artwork for lessons, path headers, and mastery
moments. Fully self-contained: no app code depends on anything in here
except the five call sites listed below.

## Kill switch

Set `ART_ENABLED = false` in `config.ts` — every slot renders `null`.

## Full removal

1. Delete this directory.
2. Revert the call sites, each marked with an `ART:` comment:

```
grep -rn "ART:" src/ --include="*.tsx"
```

- `src/pages/Path.tsx` — unit header chip
- `src/pages/SkillSheet.tsx` — header piece
- `src/session/LessonDeck.tsx` — lesson intro page
- `src/session/SessionComplete.tsx` — mastery moment

No store / scheduler / grading / content-JSON code touches this module.
Unknown unit/skill ids render `null`, so content changes can never break
the app through art.
