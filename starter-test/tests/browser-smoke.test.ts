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
