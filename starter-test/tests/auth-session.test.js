import { describe, expect, it } from 'vitest';
import {
  AUTH_MESSAGES,
  applyLoginFailure,
  applyLoginSuccess,
  applyLogout,
  createInitialAuthState,
  getIndicatorLabel,
  shouldShowIndicator,
  validateLoginInput,
} from '../../auth-state.js';

describe('mock auth session state', () => {
  it('hides the indicator when logged out', () => {
    const state = createInitialAuthState();
    expect(shouldShowIndicator(state)).toBe(false);
    expect(getIndicatorLabel(state)).toBe('Logged in');
  });

  it('shows session chip label when logged in', () => {
    const state = createInitialAuthState({ email: 'runner@example.com' });
    applyLoginSuccess(state);
    expect(shouldShowIndicator(state)).toBe(true);
    expect(getIndicatorLabel(state)).toBe('runner@example.com');
    expect(state.message).toBe(AUTH_MESSAGES.success);
  });

  it('logout resets message and hides indicator', () => {
    const state = createInitialAuthState({ email: 'runner@example.com' });
    applyLoginSuccess(state);
    applyLogout(state);
    expect(shouldShowIndicator(state)).toBe(false);
    expect(state.message).toBe(AUTH_MESSAGES.idle);
    expect(state.email).toBe('');
  });

  it('validation enforces email shape and password presence', () => {
    const { errors } = validateLoginInput('invalid', '');
    expect(errors.email).toBe(AUTH_MESSAGES.invalidEmail);
    expect(errors.password).toBe(AUTH_MESSAGES.requiredPassword);
  });

  it('login failure removes indicator visibility and stores message', () => {
    const state = createInitialAuthState({ email: 'runner@example.com' });
    applyLoginSuccess(state);
    applyLoginFailure(state);
    expect(shouldShowIndicator(state)).toBe(false);
    expect(state.message).toBe(AUTH_MESSAGES.genericFailure);
  });
});
