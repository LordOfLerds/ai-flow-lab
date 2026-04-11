---
type: review
task_id: T-0050
created: 2026-04-10
tags: [ai-flow-lab, review]
---

# T-0050 Gemini Review

## Review target
Spec T-0050: Add Supabase backend for user auth, persistent progress, and leaderboard.

## Contradictions
- Spec says "Replace all localStorage calls with Supabase API calls" in the task description, but later says "Do NOT remove localStorage fallback." These are compatible (localStorage as fallback), but the task description is misleading. The spec body is correct.

## Missing edge cases
1. **Concurrent sessions**: If user logs in on two devices, last-write-wins on progress. No conflict resolution specified — this is acceptable for v1 but should be documented.
2. **Supabase CDN blocked by sandbox**: The sandbox proxy blocks external JS modules. The Supabase CDN `<script>` tag will likely get a 503. The fallback check (`window.supabase ? ... : null`) handles this, but the auth UI should not show signup/login if Supabase isn't loaded.
3. **Email verification**: By default Supabase requires email confirmation. If not disabled, users will get stuck on "verify your email" screen. Spec should note this.
4. **Leaderboard privacy**: Showing email prefix could expose personal info. Consider allowing users to set a display name.
5. **Save frequency**: Saving on every level complete could be frequent for early levels. Consider debouncing or batching saves.

## Scope risks
- This is a large integration. The Supabase CDN issue in sandbox means this feature may only work outside the sandbox.
- Database schema creation requires Supabase dashboard access — cannot be done from game code.

## Missing tests
- No test for what happens when Supabase returns an error during save (network timeout, rate limit).
- No test for migration from localStorage to Supabase on first login.
- No test for leaderboard with zero entries.

## Hidden assumptions
- Assumes Supabase project exists and is configured. The executor cannot create the Supabase project — only add the client code.
- Assumes the leaderboard view works with RLS. Views and RLS can have complex interactions.

## Recommended corrections
1. Add graceful degradation: if `window.supabase` is undefined, hide auth form entirely and show only "Play as Guest."
2. Add a `SUPABASE_CONFIGURED` boolean check — if URL/key are placeholder values, skip all Supabase calls.
3. Note that database schema must be created manually in Supabase dashboard (not from game code).
4. Add error toast/notification for failed saves rather than silent failure.
5. Consider adding display_name field to user_progress for leaderboard privacy.


## Related Documents
- [[ai/specs/T-0050_spec.md|T-0050 spec]]
- [[ai/briefs/T-0050_implementation.md|T-0050 document]]
- [[ai/results/T-0050_executor_report.md|T-0050 result]]
- [[ai/followups/T-0050_followups.md|T-0050 followup]]
- [[ai/pr/T-0050_pr_draft.md|T-0050 pr-draft]]
