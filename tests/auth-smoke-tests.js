const GAME_ENTRY_PATH = '../index.html';
const DEFAULT_MESSAGES = {
  idle: 'Enter your email and password to continue.',
  submitting: 'Signing you in...',
  success: 'Signed in. Enjoy the run!',
  genericFailure: 'Mock authentication failed. Try again.',
  requiredEmail: 'Email is required.',
  invalidEmail: 'Enter a valid email address.',
  requiredPassword: 'Password is required.',
};
const DEFAULT_CREDENTIALS = { email: 'runner@example.com', password: 'secret-pass' };

const tests = [
  {
    id: 'form-email-required',
    category: 'Form Validation',
    name: 'Email field requires input',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      env.doc.getElementById('login-submit').click();
      const emailError = await ctx.waitForSelector(env.doc, '#login-email-error');
      await ctx.waitForCondition(() => emailError.textContent.trim().length > 0, 800);
      ctx.assertEqual(
        emailError.textContent.trim(),
        env.messages.requiredEmail,
        'Email required message should match copy',
      );
      const passwordError = await ctx.waitForSelector(env.doc, '#login-password-error');
      ctx.assertEqual(
        passwordError.textContent.trim(),
        env.messages.requiredPassword,
        'Password required message should appear when both fields are empty',
      );
    },
  },
  {
    id: 'form-invalid-email',
    category: 'Form Validation',
    name: 'Invalid email format shows message',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.fillInput(env.doc, '#login-email', 'invalid-shape');
      await ctx.fillInput(env.doc, '#login-password', 'pw12345');
      env.doc.getElementById('login-submit').click();
      const emailError = await ctx.waitForSelector(env.doc, '#login-email-error');
      await ctx.waitForCondition(() => emailError.textContent.trim().length > 0, 800);
      ctx.assertEqual(
        emailError.textContent.trim(),
        env.messages.invalidEmail,
        'Invalid email message should render for malformed addresses',
      );
    },
  },
  {
    id: 'form-password-required',
    category: 'Form Validation',
    name: 'Password field requires value',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.fillInput(env.doc, '#login-email', DEFAULT_CREDENTIALS.email);
      env.doc.getElementById('login-submit').click();
      const passwordError = await ctx.waitForSelector(env.doc, '#login-password-error');
      await ctx.waitForCondition(() => passwordError.textContent.trim().length > 0, 800);
      ctx.assertEqual(
        passwordError.textContent.trim(),
        env.messages.requiredPassword,
        'Empty password should trigger required message',
      );
    },
  },
  {
    id: 'form-submit-disabled',
    category: 'Form Validation',
    name: 'Submit button disables while submitting',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.fillInput(env.doc, '#login-email', 'smoke@example.com');
      await ctx.fillInput(env.doc, '#login-password', 'pw');
      env.doc.getElementById('login-submit').click();
      await ctx.waitForCondition(() => {
        const button = env.doc.getElementById('login-submit');
        return button && button.disabled ? button : null;
      }, 800);
      ctx.assertEqual(
        ctx.ensureBridge(env.win).getAuthStatus(),
        'submitting',
        'Auth status should report submitting state',
      );
      const statusText = ctx.getStatusMessage(env.doc);
      ctx.assert(
        statusText.includes(env.messages.submitting ?? DEFAULT_MESSAGES.submitting),
        'Status copy should show submitting feedback',
      );
      await ctx.waitForAuthStatus(env.win, 'success', 2500);
    },
  },
  {
    id: 'auth-success-menu',
    category: 'Authentication Flow',
    name: 'Valid credentials reach MENU phase',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.completeLogin(env);
      ctx.assertEqual(
        ctx.ensureBridge(env.win).getPhase(),
        'MENU',
        'Successful login should switch phase to MENU',
      );
      ctx.assert(!ctx.getOverlayHidden(env.doc), 'Overlay stays visible while in MENU');
      const startButton = Array.from(env.doc.querySelectorAll('#menu-content .btn')).find((btn) =>
        btn.textContent.toLowerCase().includes('start'),
      );
      ctx.assert(startButton, 'Start Game button should be rendered after login success');
    },
  },
  {
    id: 'auth-failure-stays-login',
    category: 'Authentication Flow',
    name: 'Emails containing "fail" stay in LOGIN with generic error',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.submitLogin(env, { email: 'fail-case@example.com', password: 'pw' });
      await ctx.waitForAuthStatus(env.win, 'failure', 2500);
      const snapshot = ctx.ensureBridge(env.win).getAuthSnapshot();
      ctx.assertEqual(snapshot?.message, env.messages.genericFailure, 'Failure message should match copy');
      ctx.assertEqual(snapshot?.status, 'failure', 'Auth status should be failure');
      ctx.assertEqual(ctx.ensureBridge(env.win).getPhase(), 'LOGIN', 'Phase must remain LOGIN');
      ctx.assert(!ctx.getOverlayHidden(env.doc), 'Overlay should still be visible to show errors');
    },
  },
  {
    id: 'auth-status-progression',
    category: 'Authentication Flow',
    name: 'Status timeline goes idle → submitting → success',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      const bridge = ctx.ensureBridge(env.win);
      const seen = [];
      const record = () => {
        const status = bridge.getAuthStatus();
        if (status && seen[seen.length - 1] !== status) {
          seen.push(status);
        }
      };
      record();
      await ctx.submitLogin(env, DEFAULT_CREDENTIALS);
      await ctx.waitForCondition(() => {
        record();
        return seen.includes('submitting') && seen.includes('success');
      }, 3000);
      ctx.assertEqual(seen[0], 'idle', 'Initial status should be idle');
      ctx.assert(seen[1] === 'submitting', 'Submitting status should appear after idle');
      ctx.assert(seen.includes('success'), 'Success status should be observed');
    },
  },
  {
    id: 'state-phase-transitions',
    category: 'State Transitions',
    name: 'LOGIN → MENU → PLAYING updates overlay visibility',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      ctx.assert(!ctx.getOverlayHidden(env.doc), 'Login overlay should be visible initially');
      await ctx.completeLogin(env);
      ctx.assertEqual(ctx.ensureBridge(env.win).getPhase(), 'MENU', 'Phase should be MENU post-login');
      ctx.assert(!ctx.getOverlayHidden(env.doc), 'Overlay remains visible when showing the menu');
      const startButton = Array.from(env.doc.querySelectorAll('#menu-content .btn')).find((btn) =>
        btn.textContent.toLowerCase().includes('start'),
      );
      ctx.assert(startButton, 'Start Game control should exist before attempting PLAYING phase');
      startButton.click();
      await ctx.waitForPhase(env.win, 'PLAYING', 3000);
      ctx.assert(ctx.getOverlayHidden(env.doc), 'Overlay should hide while playing');
    },
  },
  {
    id: 'state-reload-resets',
    category: 'State Transitions',
    name: 'Full reload returns to LOGIN phase',
    async run(ctx) {
      const env = await ctx.loadFreshGame();
      await ctx.completeLogin(env);
      const reloadedEnv = await ctx.loadFreshGame();
      ctx.assertEqual(
        ctx.ensureBridge(reloadedEnv.win).getPhase(),
        'LOGIN',
        'Fresh reload must reset phase to LOGIN',
      );
      ctx.assert(
        !ctx.ensureBridge(reloadedEnv.win).getAuthSnapshot()?.isLoggedIn,
        'Auth snapshot should show logged-out state after reload',
      );
      await ctx.waitForSelector(reloadedEnv.doc, '#login-form');
    },
  },
];

class SmokeTestRunner {
  constructor(elements, suite) {
    this.tests = suite;
    this.frame = elements.frame;
    this.logEl = elements.logEl;
    this.summaryEl = elements.summaryEl;
    this.runButton = elements.runButton;
    this.reloadButton = elements.reloadButton;
    this.passCount = 0;
    this.failCount = 0;
    this.running = false;
    this.bindEvents();
    this.resetLog();
  }

  bindEvents() {
    this.runButton.addEventListener('click', () => this.runAll());
    this.reloadButton.addEventListener('click', () => {
      if (!this.running) {
        this.navigateFrame();
      }
    });
  }

  resetLog() {
    this.logEl.innerHTML = '';
    this.summaryEl.textContent = 'Idle';
    this.passCount = 0;
    this.failCount = 0;
  }

  createLogEntry(test) {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.className = 'name';
    title.textContent = test.name;
    const category = document.createElement('div');
    category.className = 'category';
    category.textContent = test.category;
    const badge = document.createElement('span');
    badge.className = 'badge pending';
    badge.textContent = 'PENDING';
    const details = document.createElement('div');
    details.className = 'details';
    details.textContent = '';
    li.appendChild(title);
    title.appendChild(badge);
    li.appendChild(category);
    li.appendChild(details);
    this.logEl.appendChild(li);
    return { li, badge, details };
  }

  updateSummary() {
    const total = this.tests.length;
    this.summaryEl.textContent = `Pass: ${this.passCount}/${total} • Fail: ${this.failCount}`;
  }

  async runAll() {
    if (this.running) return;
    this.running = true;
    this.runButton.disabled = true;
    this.resetLog();
    for (const test of this.tests) {
      const entry = this.createLogEntry(test);
      try {
        const ctx = this.createContext();
        await test.run(ctx);
        entry.badge.className = 'badge pass';
        entry.badge.textContent = 'PASS';
        this.passCount += 1;
      } catch (error) {
        entry.badge.className = 'badge fail';
        entry.badge.textContent = 'FAIL';
        entry.details.textContent = String(error?.message ?? error);
        this.failCount += 1;
      }
      this.updateSummary();
    }
    this.runButton.disabled = false;
    this.running = false;
  }

  createContext() {
    return {
      loadFreshGame: () => this.loadFreshGame(),
      submitLogin: (env, creds) => this.submitLogin(env, creds),
      completeLogin: (env, overrides) => this.completeLogin(env, overrides),
      fillInput: (doc, selector, value) => this.fillInput(doc, selector, value),
      waitForSelector: (doc, selector, timeout) => this.waitForSelector(doc, selector, timeout),
      waitForCondition: (fn, timeout, interval) => this.waitForCondition(fn, timeout, interval),
      waitForAuthStatus: (win, status, timeout) => this.waitForAuthStatus(win, status, timeout),
      waitForPhase: (win, phase, timeout) => this.waitForPhase(win, phase, timeout),
      ensureBridge: (win) => this.ensureBridge(win),
      getOverlayHidden: (doc) => this.getOverlayHidden(doc),
      getStatusMessage: (doc) => this.getStatusMessage(doc),
      assert: (condition, message) => {
        if (!condition) throw new Error(message);
      },
      assertEqual: (actual, expected, message) => {
        if (actual !== expected) {
          throw new Error(`${message} (expected "${expected}", received "${actual}")`);
        }
      },
      waitForConditionValue: (fn, timeout, interval) => this.waitForCondition(fn, timeout, interval),
    };
  }

  async navigateFrame() {
    return new Promise((resolve, reject) => {
      const url = `${GAME_ENTRY_PATH}?_t=${Date.now()}`;
      const onLoad = () => {
        cleanup();
        resolve(this.frame.contentWindow);
      };
      const onError = (event) => {
        cleanup();
        reject(new Error(`Failed to load game frame: ${event?.message || 'unknown error'}`));
      };
      const cleanup = () => {
        this.frame.removeEventListener('load', onLoad);
        this.frame.removeEventListener('error', onError);
      };
      this.frame.addEventListener('load', onLoad, { once: true });
      this.frame.addEventListener('error', onError, { once: true });
      this.frame.src = url;
    });
  }

  async loadFreshGame() {
    const win = await this.navigateFrame();
    const doc = win.document;
    await this.waitForCondition(() => doc.readyState === 'complete', 4000);
    await this.waitForCondition(() => typeof win.renderLogin === 'function', 4000);
    const bridge = this.ensureBridge(win);
    if (bridge?.forceLogout) {
      bridge.forceLogout();
    } else if (typeof win.renderLogin === 'function') {
      win.renderLogin();
    }
    await this.waitForSelector(doc, '#login-form', 1500);
    return { win, doc, bridge, messages: this.resolveMessages(win) };
  }

  resolveMessages(win) {
    return { ...DEFAULT_MESSAGES, ...(win.AuthShared?.AUTH_MESSAGES ?? {}) };
  }

  fillInput(doc, selector, value) {
    const input = doc.querySelector(selector);
    if (!input) throw new Error(`Input ${selector} not found`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async submitLogin(env, creds) {
    const values = { ...DEFAULT_CREDENTIALS, ...creds };
    await this.waitForSelector(env.doc, '#login-form', 1000);
    this.fillInput(env.doc, '#login-email', values.email);
    this.fillInput(env.doc, '#login-password', values.password);
    const submit = env.doc.getElementById('login-submit');
    if (!submit) throw new Error('Submit button not found');
    submit.click();
  }

  async completeLogin(env, overrides = {}) {
    await this.submitLogin(env, overrides);
    await this.waitForAuthStatus(env.win, 'success', 3000);
    await this.waitForPhase(env.win, 'MENU', 3000);
  }

  async waitForSelector(doc, selector, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const poll = () => {
        const el = doc.querySelector(selector);
        if (el) return resolve(el);
        if (performance.now() - start >= timeout) {
          return reject(new Error(`Timeout waiting for ${selector}`));
        }
        requestAnimationFrame(poll);
      };
      poll();
    });
  }

  async waitForCondition(fn, timeout = 2000, interval = 50) {
    const start = performance.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          const result = fn();
          if (result) return resolve(result);
        } catch (error) {
          return reject(error);
        }
        if (performance.now() - start >= timeout) {
          return reject(new Error('Condition timed out'));
        }
        setTimeout(check, interval);
      };
      check();
    });
  }

  waitForAuthStatus(win, status, timeout = 2000) {
    return this.waitForCondition(() => this.ensureBridge(win).getAuthStatus() === status, timeout);
  }

  waitForPhase(win, phase, timeout = 2000) {
    return this.waitForCondition(() => this.ensureBridge(win).getPhase() === phase, timeout);
  }

  getOverlayHidden(doc) {
    const overlay = doc.getElementById('overlay');
    return overlay ? overlay.classList.contains('hidden') : null;
  }

  getStatusMessage(doc) {
    const status = doc.getElementById('login-status');
    return status ? status.textContent.trim() : '';
  }

  ensureBridge(win) {
    if (win.__authSmokeBridge) return win.__authSmokeBridge;
    const doc = win.document;
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `
      window.__authSmokeBridge = window.__authSmokeBridge || {
        getPhase: () => (typeof gs !== 'undefined' ? gs.phase : null),
        getAuthStatus: () => (typeof gs !== 'undefined' && gs.auth ? gs.auth.status : null),
        getAuthSnapshot: () => (typeof gs !== 'undefined' && gs.auth ? ({ ...gs.auth }) : null),
        forceLogout: () => {
          if (typeof gs !== 'undefined' && gs.auth) {
            gs.auth.isLoggedIn = false;
            gs.auth.status = 'idle';
            gs.auth.error = '';
            gs.auth.message = (window.AuthShared && window.AuthShared.AUTH_MESSAGES)
              ? window.AuthShared.AUTH_MESSAGES.idle
              : '${DEFAULT_MESSAGES.idle.replace(/'/g, "\\'")}';
          }
          if (typeof renderLogin === 'function') {
            renderLogin();
          }
        }
      };
    `;
    doc.documentElement.appendChild(script);
    script.remove();
    return win.__authSmokeBridge;
  }
}

const frame = document.getElementById('game-frame');
const logEl = document.getElementById('test-log');
const summaryEl = document.getElementById('summary');
const runButton = document.getElementById('run-all');
const reloadButton = document.getElementById('reload-game');
new SmokeTestRunner({ frame, logEl, summaryEl, runButton, reloadButton }, tests);
