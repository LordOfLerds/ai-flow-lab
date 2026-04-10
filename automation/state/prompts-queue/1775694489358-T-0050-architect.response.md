# T-0050 Spec

## Task metadata
- task_id: T-0050
- title: Add Supabase backend for user auth, persistent progress, and leaderboard
- lane_type: feature-lane
- executor: claude

## Problem statement
Currently the game uses mock auth (fake login screen) and localStorage for progress. There is no persistent backend — progress is lost on browser clear, no leaderboard exists, and no real user accounts. Need to integrate Supabase for real auth, cloud-persisted progress, and a global leaderboard.

## Source of truth
- `index.html` — current auth UI, mock login/logout, localStorage persistence
- Supabase project (to be configured) — database schema, auth config

## Desired behavior

### 1. Supabase Client Integration
Add Supabase JS client via CDN in index.html:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Configuration at top of game script:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
```

### 2. Auth Flow
- **Email/Password signup**: Email + password form, Supabase `signUp()`
- **Email/Password login**: Supabase `signInWithPassword()`
- **Guest mode**: Skip auth, use localStorage only (existing behavior)
- **Logout**: Supabase `signOut()`, clear session
- **Session persistence**: Supabase handles session tokens automatically

Update auth UI to show:
- Login form (email + password)
- "Create Account" toggle
- "Play as Guest" button
- Error messages from Supabase

### 3. Database Schema
```sql
-- User progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_level INT DEFAULT 1,
  current_level INT DEFAULT 1,
  total_score INT DEFAULT 0,
  coins INT DEFAULT 0,
  gems INT DEFAULT 0,
  owned_skins TEXT[] DEFAULT ARRAY['default'],
  owned_trails TEXT[] DEFAULT ARRAY['none'],
  active_skin TEXT DEFAULT 'default',
  active_trail TEXT DEFAULT 'none',
  active_boosters JSONB DEFAULT '[]',
  skills_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
  levels_completed INT[] DEFAULT ARRAY[]::INT[],
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Leaderboard view
CREATE VIEW leaderboard AS
  SELECT 
    u.email,
    p.player_level,
    p.total_score,
    p.levels_completed,
    p.updated_at
  FROM user_progress p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.total_score DESC
  LIMIT 100;

-- RLS policies
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read leaderboard" ON user_progress FOR SELECT USING (true);
```

### 4. Save/Load Progress
```js
async function saveProgress() {
  if (!supabase || !currentUser) {
    savePurchasesLocal(); // fallback
    return;
  }
  const data = {
    user_id: currentUser.id,
    player_level: gs.playerLevel,
    current_level: gs.currentLevel,
    total_score: gs.totalScore,
    coins: gs.coins,
    gems: gs.gems,
    owned_skins: gs.purchases.owned_skins,
    owned_trails: gs.purchases.owned_trails,
    active_skin: gs.purchases.active_skin,
    active_trail: gs.purchases.active_trail,
    active_boosters: gs.purchases.active_boosters,
    skills_unlocked: SKILLS.filter(s => s.unlocked).map(s => s.id),
    levels_completed: gs.levelsCompleted || []
  };
  await supabase.from('user_progress').upsert(data, { onConflict: 'user_id' });
}

async function loadProgress() {
  if (!supabase || !currentUser) {
    loadPurchasesLocal(); // fallback
    return;
  }
  const { data } = await supabase.from('user_progress').select('*').eq('user_id', currentUser.id).single();
  if (data) {
    gs.playerLevel = data.player_level;
    gs.currentLevel = data.current_level;
    // ... merge all fields into gs
  }
}
```

### 5. Leaderboard UI
Add "Leaderboard" button on main menu. Shows:
- Top 100 players by total_score
- Columns: Rank, Player (email prefix), Level, Score
- Current player's rank highlighted
- Auto-refresh every 30s when visible

### 6. Offline Fallback
If Supabase is unreachable:
- Use localStorage as before (guest mode behavior)
- Show "Offline Mode" indicator
- Queue saves, sync when back online (best-effort, no conflict resolution)

## Constraints
- All game code changes in `index.html` only
- Supabase CDN loaded via script tag (no npm/bundler)
- SUPABASE_URL and SUPABASE_ANON_KEY as constants at top of script (user must replace with their own project values)
- Do NOT remove localStorage fallback — it must work without Supabase configured
- Email shown in leaderboard is prefix only (before @) for privacy
- RLS must be enabled — users can only modify their own progress
- Save triggers: on level complete, on purchase, on logout
- Load triggers: on login success

## Acceptance criteria
- [ ] Supabase client loaded via CDN
- [ ] Real email/password signup and login
- [ ] Guest mode still works without Supabase
- [ ] Progress saves to Supabase on level complete
- [ ] Progress loads from Supabase on login
- [ ] Leaderboard shows top 100 by score
- [ ] localStorage fallback works when Supabase unavailable
- [ ] RLS policies prevent cross-user data access

## Risks
- Supabase CDN script may be blocked by sandbox proxy (same issue as auth-state.js). Fallback to localStorage is critical.
- Real auth requires email verification — may need to disable email confirmation in Supabase dashboard for testing.
- Leaderboard view requires Supabase function or direct query — RLS on the view may need special handling.

## Open questions
- Should we use Supabase realtime for live leaderboard updates?
- Should guest progress be migrated to account on signup?
