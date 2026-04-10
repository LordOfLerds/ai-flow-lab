import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(__dirname, '..', '..');
// renderLogin() injects the auth panel into #menu-content; this is the canonical Start UI shell.
const START_UI_SELECTOR = '#menu-content .auth-panel';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter((candidate): candidate is string => Boolean(candidate));

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

describe('headless start UI smoke test', () => {
  const chrome = new HeadlessChrome();
  let chromeReady = false;
  let chromeLaunchError: Error | null = null;

  beforeAll(async () => {
    try {
      await chrome.launch();
      chromeReady = true;
    } catch (error) {
      chromeLaunchError = error as Error;
      console.warn(
        `[headless-start-ui] Unable to start Chrome headless session: ${
          chromeLaunchError?.message ?? 'unknown error'
        }`,
      );
    }
  }, 20_000);

  afterAll(async () => {
    if (chromeReady) {
      await chrome.shutdown();
    }
  });

  it('renders the Start UI overlay after runtime scripts execute', async () => {
    if (!chromeReady) {
      console.warn(
        '[headless-start-ui] Test skipped because Chrome headless session is unavailable.',
      );
      return;
    }

    const entryUrl = pathToFileURL(resolve(REPO_ROOT, 'index.html')).href;
    const page = await chrome.open(entryUrl);

    try {
      await page.waitForVisible('#overlay', 'overlay container');
      await page.waitForVisible(
        START_UI_SELECTOR,
        'auth-panel login shell rendered by runtime scripts',
      );

      const overlayHidden = await page.evaluate<boolean>(
        `(() => {
          const el = document.querySelector('#overlay');
          return el ? el.classList.contains('hidden') : true;
        })()`,
      );
      expect(overlayHidden).toBe(false);

      const startTitle = await page.evaluate<string | null>(
        `(() => {
          const el = document.querySelector('#menu-content .auth-title');
          return el ? el.textContent?.trim() ?? null : null;
        })()`,
      );
      expect(startTitle && startTitle.toLowerCase()).toContain('user login');

      const loginButtonLabel = await page.evaluate<string | null>(
        `(() => document.querySelector('#login-submit')?.textContent?.trim() ?? null)()`,
      );
      expect(loginButtonLabel?.toLowerCase()).toContain('login');

      const statusRole = await page.evaluate<string | null>(
        `(() => document.querySelector('#login-status')?.getAttribute('role') ?? null)()`,
      );
      expect(statusRole).toBe('status');
    } finally {
      await page.close();
    }
  }, 30_000);
});

class HeadlessChrome {
  private chromePath: string | null = null;
  private proc: ChildProcessWithoutNullStreams | null = null;
  private devToolsUrl: URL | null = null;
  private host: string | null = null;
  private port: number | null = null;
  private userDataDir: string | null = null;

  async launch(): Promise<void> {
    if (this.proc) {
      return;
    }

    this.chromePath = this.resolveChromeBinary();
    this.userDataDir = mkdtempSync(join(tmpdir(), 'pixel-runner-chrome-'));

    this.proc = spawn(
      this.chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--remote-debugging-port=0',
        '--allow-file-access-from-files',
        `--user-data-dir=${this.userDataDir}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    const wsEndpoint = await this.waitForWebSocketEndpoint();
    this.devToolsUrl = new URL(wsEndpoint);
    this.host = this.devToolsUrl.hostname;
    this.port = Number(this.devToolsUrl.port);

    await this.waitForHttpEndpoint();
  }

  async open(targetUrl: string): Promise<ChromePage> {
    if (!this.host || !this.port || !this.devToolsUrl) {
      throw new Error('Headless Chrome not initialized');
    }

    const { id, webSocketDebuggerUrl } = await this.requestJson(
      `/json/new?${encodeURIComponent(targetUrl)}`,
      'POST',
    );

    if (!id || !webSocketDebuggerUrl) {
      throw new Error('Failed to create headless page target');
    }

    const session = new CdpSession(webSocketDebuggerUrl);
    await session.connect();
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    await session.send('Page.navigate', { url: targetUrl });
    await session.waitForEvent('Page.loadEventFired', 10_000);

    return new ChromePage(this, session, id, targetUrl);
  }

  async closePage(targetId: string): Promise<void> {
    if (!this.host || !this.port) return;

    try {
      await this.requestJson(`/json/close/${targetId}`);
    } catch {
      // Target may already be closed; best-effort cleanup only.
    }
  }

  async shutdown(): Promise<void> {
    if (this.proc) {
      const procRef = this.proc;
      this.proc = null;
      procRef.kill();
      await new Promise((resolveShutdown) => procRef.once('exit', resolveShutdown));
    }

    if (this.userDataDir) {
      rmSync(this.userDataDir, { recursive: true, force: true });
      this.userDataDir = null;
    }
  }

  private resolveChromeBinary(): string {
    for (const candidate of CHROME_CANDIDATES) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      'Chrome browser binary not found. Set CHROME_PATH to a headless-capable Chrome/Chromium.',
    );
  }

  private waitForWebSocketEndpoint(): Promise<string> {
    if (!this.proc || !this.proc.stderr) {
      throw new Error('Chrome process missing stderr stream');
    }

    return new Promise((resolveEndpoint, rejectEndpoint) => {
      let buffer = '';
      const timeout = setTimeout(() => {
        cleanup();
        rejectEndpoint(new Error('Timed out waiting for Chrome DevTools websocket URL'));
      }, 10_000);

      const handleData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          cleanup();
          resolveEndpoint(match[1]);
        }
      };

      const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
        cleanup();
        rejectEndpoint(
          new Error(`Chrome exited before startup (code=${code ?? 'null'} signal=${signal ?? 'null'})`),
        );
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.proc?.stderr?.off('data', handleData);
        this.proc?.off('exit', handleExit);
      };

      this.proc.stderr.on('data', handleData);
      this.proc.once('exit', handleExit);
    });
  }

  private async waitForHttpEndpoint(): Promise<void> {
    if (!this.host || !this.port) return;

    const start = Date.now();
    while (Date.now() - start < 10_000) {
      try {
        await this.requestJson('/json/version');
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
          throw error;
        }
        await sleep(100);
      }
    }

    throw new Error('Chrome DevTools HTTP endpoint did not become ready in time');
  }

  private requestJson(path: string, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    if (!this.host || !this.port) {
      throw new Error('DevTools host/port not initialized');
    }

    return new Promise((resolveRequest, rejectRequest) => {
      const req = http.request(
        {
          hostname: this.host!,
          port: this.port!,
          path,
          method,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            res.resume();
            rejectRequest(new Error(`DevTools HTTP ${res.statusCode} for ${path}`));
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolveRequest(body ? JSON.parse(body) : {});
            } catch (error) {
              rejectRequest(error);
            }
          });
        },
      );

      req.on('error', rejectRequest);
      req.end();
    });
  }
}

class ChromePage {
  constructor(
    private readonly chrome: HeadlessChrome,
    private readonly session: CdpSession,
    readonly targetId: string,
    readonly url: string,
  ) {}

  async waitForVisible(selector: string, descriptor: string, timeoutMs = 5_000): Promise<void> {
    const expression = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    })()`;

    await waitFor(async () => this.evaluate<boolean>(expression), {
      timeoutMs,
      description: descriptor,
    });
  }

  evaluate<T>(expression: string): Promise<T> {
    return this.session.evaluate<T>(expression);
  }

  async close(): Promise<void> {
    await this.session.dispose();
    await this.chrome.closePage(this.targetId);
  }
}

class CdpSession {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private eventWaiters = new Map<string, Array<{ resolve: (params: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>>();

  constructor(private readonly wsUrl: string) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.wsUrl);

    await new Promise<void>((resolveConnect, rejectConnect) => {
      if (!this.ws) {
        rejectConnect(new Error('WebSocket not initialized'));
        return;
      }

      this.ws.onopen = () => resolveConnect();
      this.ws.onerror = () => rejectConnect(new Error('CDP websocket connection failed'));
    });

    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => {
      for (const [, waiter] of this.pending) {
        waiter.reject(new Error('CDP websocket closed'));
      }
      this.pending.clear();
    };
  }

  async send(method: string, params?: Record<string, unknown>): Promise<any> {
    if (!this.ws) throw new Error('CDP websocket not ready');

    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    this.ws.send(payload);

    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
    });
  }

  waitForEvent(eventName: string, timeoutMs: number): Promise<any> {
    return new Promise((resolveEvent, rejectEvent) => {
      const timer = setTimeout(() => {
        const waiters = this.eventWaiters.get(eventName);
        if (waiters) {
          this.eventWaiters.set(
            eventName,
            waiters.filter((entry) => entry.resolve !== resolveEvent),
          );
        }
        rejectEvent(new Error(`Timed out waiting for event ${eventName}`));
      }, timeoutMs);

      const waiters = this.eventWaiters.get(eventName) ?? [];
      waiters.push({ resolve: resolveEvent, reject: rejectEvent, timer });
      this.eventWaiters.set(eventName, waiters);
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });

    if (response?.exceptionDetails) {
      throw new Error(`Evaluation failed: ${response.exceptionDetails.text ?? 'unknown error'}`);
    }

    return response?.result?.value as T;
  }

  async dispose(): Promise<void> {
    if (!this.ws) return;

    await new Promise<void>((resolveDispose) => {
      if (!this.ws) {
        resolveDispose();
        return;
      }

      this.ws.onclose = () => resolveDispose();
      this.ws.close();
    });
  }

  private handleMessage(event: MessageEvent): void {
    const rawData =
      typeof event.data === 'string' ? event.data : Buffer.from(event.data as ArrayBuffer).toString();
    const message = JSON.parse(rawData);

    if (typeof message.id === 'number') {
      const pendingRequest = this.pending.get(message.id);
      if (!pendingRequest) return;
      this.pending.delete(message.id);

      if (message.error) {
        pendingRequest.reject(new Error(message.error.message || 'CDP command failed'));
      } else {
        pendingRequest.resolve(message.result);
      }
      return;
    }

    if (message.method) {
      const waiters = this.eventWaiters.get(message.method);
      if (waiters?.length) {
        const waiter = waiters.shift();
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(message.params);
        }
        if (!waiters.length) {
          this.eventWaiters.delete(message.method);
        } else {
          this.eventWaiters.set(message.method, waiters);
        }
      }
    }
  }
}

async function waitFor<T>(
  checkFn: () => Promise<T>,
  options: { timeoutMs?: number; intervalMs?: number; description?: string } = {},
): Promise<T> {
  const { timeoutMs = 5_000, intervalMs = 100, description = 'condition' } = options;
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      const value = await checkFn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }

  const baseMessage = `Timed out waiting for ${description}`;
  if (lastError instanceof Error) {
    throw new Error(`${baseMessage}: ${lastError.message}`);
  }
  throw new Error(baseMessage);
}
