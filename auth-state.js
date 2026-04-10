const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_MESSAGES = {
  idle: 'Enter your email and password to continue.',
  submitting: 'Signing you in...',
  success: 'Signed in. Enjoy the run!',
  genericFailure: 'Mock authentication failed. Try again.',
  requiredEmail: 'Email is required.',
  invalidEmail: 'Enter a valid email address.',
  requiredPassword: 'Password is required.',
};

function createInitialAuthState(overrides = {}) {
  return Object.assign({
    isLoggedIn: false,
    status: 'idle',
    message: AUTH_MESSAGES.idle,
    error: '',
    email: '',
  }, overrides);
}

function validateLoginInput(email, password) {
  const normalizedEmail = email.trim();
  const errors = {};

  if (!normalizedEmail) {
    errors.email = AUTH_MESSAGES.requiredEmail;
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = AUTH_MESSAGES.invalidEmail;
  }

  if (!password) {
    errors.password = AUTH_MESSAGES.requiredPassword;
  }

  return { errors, normalizedEmail };
}

function applyLoginSuccess(state) {
  state.status = 'success';
  state.isLoggedIn = true;
  state.error = '';
  state.message = AUTH_MESSAGES.success;
  return state;
}

function applyLoginFailure(state, message = AUTH_MESSAGES.genericFailure) {
  state.status = 'failure';
  state.isLoggedIn = false;
  state.error = message;
  state.message = message;
  return state;
}

function applyLogout(state) {
  const reset = createInitialAuthState();
  state.isLoggedIn = reset.isLoggedIn;
  state.status = reset.status;
  state.message = reset.message;
  state.error = reset.error;
  state.email = '';
  return state;
}

function shouldShowIndicator(state) {
  return !!state.isLoggedIn;
}

function getIndicatorLabel(state) {
  return state.email || 'Logged in';
}

const exported = {
  AUTH_MESSAGES,
  createInitialAuthState,
  validateLoginInput,
  applyLoginSuccess,
  applyLoginFailure,
  applyLogout,
  shouldShowIndicator,
  getIndicatorLabel,
};

if (typeof window !== 'undefined') {
  window.AuthShared = exported;
}

export {
  AUTH_MESSAGES,
  createInitialAuthState,
  validateLoginInput,
  applyLoginSuccess,
  applyLoginFailure,
  applyLogout,
  shouldShowIndicator,
  getIndicatorLabel,
};
