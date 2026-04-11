---
type: result
task_id: T-0019
created: 2026-04-10
tags: [ai-flow-lab, result]
---

# T-0019 Executor Result

## Task
Add browser smoke coverage for Start UI visibility across supported entry points

## Executor
claude

## Files written
- `starter-test/tests/browser-smoke.test.ts`
- `starter-test/package.json`

## Execution Report

### What was done
- Added `starter-test/tests/browser-smoke.test.ts`, a Vitest suite that (a) inspects `index.html` to ensure the Start UI overlay and menu containers are present and not pre-hidden, and (b) simulates loading `game.html` by executing its inline redirect script inside a VM sandbox before re-checking the canonical Start UI. This covers both entry points called out in the brief.
- Normalized `starter-test/package.json` to include the trailing newline so formatting stays consistent.
- Ran `npm test` (Vitest) inside `starter-test`; all five spec files, including the new smoke spec, passed.

### What was NOT done
- Did not stand up a full headless-browser harness (e.g., Playwright/Puppeteer). The spec cautioned against introducing broad infra when none exists; the new smoke test instead validates the shipped markup/redirect logic via static inspection plus sandboxed script execution.

### Issues discovered
- Current coverage still relies on static markup analysis; if runtime JavaScript later hides the overlay before interactions, these tests will not catch it. Assumption documented so follow-up browser automation can raise fidelity.

### Suggested follow-ups
1. Implement real headless-browser smoke tests that load the pages via an HTTP server and assert computed visibility after runtime scripts execute (test-lane).
2. Document in `docs/ARCHITECTURE.md` how `game.html` serves purely as a compatibility redirect so future specs reference the canonical coverage strategy (docs-lane).

---

## Raw executor output
```file:starter-test/tests/browser-smoke.test.ts
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script, createContext } from 'node:vm';

const REPO_ROOT = resolve(__dirname, '..', '..');

async function readHtml(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), 'utf8');
}

function assertStartUiVisible(html: string, entryLabel: string) {
  const overlayMatch = html.match(/<div\s+id="overlay"([^>]*)>/i);
  expect(overlayMatch, `${entryLabel}: overlay container missing`).toBeTruthy();
  const attrs = overlayMatch ? overlayMatch[1] ?? '' : '';
  const classMatch = attrs.match(/class\s*=\s*"([^"]*)"/i);
  const classList = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];
  expect(classList.includes('hidden'), `${entryLabel}: overlay unexpectedly hidden`).toBe(false);
  expect(html).toMatch(/<h1>[^<]*PIXEL RUNNER/i);
  expect(html).toMatch(/<div\s+id="menu-content"/i);
}

describe('start UI browser smoke', () => {
  it('shows the Start UI on index.html load', async () => {
    const indexHtml = await readHtml('index.html');
    assertStartUiVisible(indexHtml, 'index.html');
  });

  it('redirects game.html to index Start UI', async () => {
    const gameHtml = await readHtml('game.html');

    expect(gameHtml).toMatch(/http-equiv="refresh"[^>]+url=\.\/index\.html/i);
    const scriptMatch = gameHtml.match(/<script>([\s\S]*?)<\/script>/i);
    expect(scriptMatch, 'game.html missing inline redirect script').toBeTruthy();

    const sandbox = {
      window: {
        location: {
          pathname: '/game.html',
          replacedTo: '',
          replace(url: string) {
            this.replacedTo = url;
          },
        },
      },
    };

    const context = createContext(sandbox);
    new Script(scriptMatch![1]).runInContext(context);
    expect(sandbox.window.location.replacedTo).toBe('./index.html');

    const indexHtml = await readHtml('index.html');
    assertStartUiVisible(indexHtml, 'redirected index.html');
  });
});
```

```file:starter-test/package.json
{
  "name": "starter-test",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "directories": {
    "test": "tests"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "testwatch": "vitest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "devDependencies": {
    "@types/node": "^25.5.2",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2",
    "vitest": "^4.1.2"
  }
}
```

## Execution Report

### What was done
- Added `starter-test/tests/browser-smoke.test.ts`, a Vitest suite that (a) inspects `index.html` to ensure the Start UI overlay and menu containers are present and not pre-hidden, and (b) simulates loading `game.html` by executing its inline redirect script inside a VM sandbox before re-checking the canonical Start UI. This covers both entry points called out in the brief.
- Normalized `starter-test/package.json` to include the trailing newline so formatting stays consistent.
- Ran `npm test` (Vitest) inside `starter-test`; all five spec files, including the new smoke spec, passed.

### What was NOT done
- Did not stand up a full headless-browser harness (e.g., Playwright/Puppeteer). The spec cautioned against introducing broad infra when none exists; the new smoke test instead validates the shipped markup/redirect logic via static inspection plus sandboxed script execution.

### Issues discovered
- Current coverage still relies on static markup analysis; if runtime JavaScript later hides the overlay before interactions, these tests will not catch it. Assumption documented so follow-up browser automation can raise fidelity.

### Suggested follow-ups
1. Implement real headless-browser smoke tests that load the pages via an HTTP server and assert computed visibility after runtime scripts execute (test-lane).
2. Document in `docs/ARCHITECTURE.md` how `game.html` serves purely as a compatibility redirect so future specs reference the canonical coverage strategy (docs-lane).


## Related Documents
- [[ai/specs/T-0019_spec.md|T-0019 spec]]
- [[ai/reviews/T-0019_gemini_review.md|T-0019 review]]
- [[ai/briefs/T-0019_implementation.md|T-0019 document]]
- [[ai/followups/T-0019_followups.md|T-0019 followup]]
- [[ai/pr/T-0019_pr_draft.md|T-0019 pr-draft]]
