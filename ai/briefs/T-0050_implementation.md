---
type: brief
task_id: T-0050
created: 2026-04-10
tags: [ai-flow-lab, brief]
---

# T-0050 Implementation Brief

## Goal
Integrate Supabase client for real user authentication, cloud-persisted game progress, and a global leaderboard. Keep localStorage as offline fallback.

## Scope
1. Add Supabase JS CDN script tag to index.html.
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` config constants with placeholder values.
3. Add `SUPABASE_CONFIGURED` check — if URL contains 'YOUR_PROJECT', skip all Supabase calls.
4. Update auth UI: real email/password signup/login when Supabase available, "Play as Guest" always shown.
5. Implement `saveProgress()` — upserts to `user_progress` table on level complete, purchase, logout.
6. Implement `loadProgress()` — reads from `user_progress` on login, merges into gs.
7. Add leaderboard UI accessible from main menu — fetches top 100 by total_score.
8. Keep all existing localStorage logic as fallback when Supabase unavailable.
9. SQL schema provided as comments only (must be created in Supabase dashboard manually).

## Constraints
- All game code changes in `index.html` only.
- If `window.supabase` is undefined (CDN blocked), hide signup/login forms, show only "Play as Guest."
- Placeholder SUPABASE_URL/KEY trigger immediate fallback to localStorage.
- No email verification required for dev (note in comments).
- Leaderboard shows email prefix (before @) only for privacy.
- Error handling: failed saves show a small toast notification, do not crash the game.
- Save debounce: max 1 save per 5 seconds to avoid rate limits.

## File targets
- `index.html` — Supabase CDN script, config constants, auth UI update, `saveProgress()`, `loadProgress()`, `showLeaderboard()`, leaderboard UI, error toast system.

## Tests required
- Verify game works without Supabase (guest mode, localStorage)
- Verify auth UI hides signup/login when Supabase CDN fails
- Verify placeholder URL/key triggers fallback mode
- Verify save/load cycle preserves all progress fields
- Verify leaderboard renders with 0 entries (empty state)
- Verify error toast appears on save failure

## Chosen minimal policy
- Add Supabase CDN as last `<script>` before game script.
- Wrap all Supabase calls in `if (supabase && SUPABASE_CONFIGURED)` checks.
- Auth state tracked in `gs.authUser` (null = guest).
- Save: `supabase.from('user_progress').upsert({...})` with `onConflict: 'user_id'`.
- Load: `supabase.from('user_progress').select('*').eq('user_id', id).single()`.
- Leaderboard: `supabase.from('user_progress').select('*').order('total_score', {ascending: false}).limit(100)`.
- Toast: absolute-positioned div at top-right, auto-hide after 3s.

## Risks
- Supabase CDN will almost certainly be blocked in the sandbox proxy (503). This is expected — the feature will only work when the game runs outside the sandbox or when the user deploys to their own hosting.
- Without a real Supabase project configured, this is effectively dead code with a good fallback. That's acceptable.
- RLS policy creation must happen in Supabase dashboard — executor cannot create it from code.

## Explicit non-goals
- Creating the actual Supabase project or database tables (manual step).
- OAuth/social login (email/password only).
- Real-time leaderboard updates (polling only).
- Guest-to-account progress migration.
- Display name customization (v2).


## Related Documents
- [[ai/specs/T-0050_spec.md|T-0050 spec]]
- [[ai/reviews/T-0050_gemini_review.md|T-0050 review]]
- [[ai/results/T-0050_executor_report.md|T-0050 result]]
- [[ai/followups/T-0050_followups.md|T-0050 followup]]
- [[ai/pr/T-0050_pr_draft.md|T-0050 pr-draft]]
