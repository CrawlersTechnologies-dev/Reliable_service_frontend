// ---------------------------------------------------------------------------
// API layer — talks to the Node.js backend (reliable-api).
// In development Vite proxies /api and /uploads to http://localhost:4000
// (see vite.config.js). In production set VITE_API_URL if the API lives on
// another domain, e.g. VITE_API_URL=https://api.reliableservices.in
// Pages call these functions only; none of them use fetch directly.
// ---------------------------------------------------------------------------

const BASE = import.meta.env?.VITE_API_URL || '';
const TOKEN_KEY = 'reliable_token';
const USER_KEY = 'reliable_user';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const store = {
  get token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* storage blocked */ }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
  },
  user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
};

async function request(method, path, { body, form, auth = true } = {}) {
  const headers = {};
  if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection or that the API is running.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth) {
    // token expired / account suspended → back to login
    store.clear();
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.details);
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ---------------- Auth ----------------
export const auth = {
  login: async (email, password) => {
    const { token, user } = await request('POST', '/api/auth/login', { body: { email, password, app: 'panel' }, auth: false });
    store.set(token, user);
    return user;
  },
  current: () => (store.token ? store.user() : null),
  refresh: async () => {
    const { user } = await request('GET', '/api/auth/me');
    store.set(store.token, user);
    return user;
  },
  logout: () => {
    request('POST', '/api/auth/logout').catch(() => {});
    store.clear();
  },
  changePassword: (currentPassword, newPassword) => request('POST', '/api/auth/change-password', { body: { currentPassword, newPassword } }),
};

// ---------------- Banks ----------------
export const banks = {
  list: async () => (await request('GET', '/api/banks')).items,
  create: async (data) => (await request('POST', '/api/banks', { body: data })).bank,
  update: async (id, data) => (await request('PATCH', `/api/banks/${id}`, { body: data })).bank,
};

// ---------------- Users ----------------
export const users = {
  list: async (role) => (await request('GET', `/api/users${qs({ role })}`)).items,
  nextEmployeeId: async (role) => (await request('GET', `/api/users/next-id${qs({ role })}`)).employeeId,
  // returns { user, tempPassword } — show the password once to the admin
  create: (data) => request('POST', '/api/users', { body: data }),
  update: async (id, data) => (await request('PATCH', `/api/users/${id}`, { body: data })).user,
  resetPassword: async (id) => (await request('POST', `/api/users/${id}/reset-password`)).tempPassword,
};

// ---------------- Cases ----------------
export const cases = {
  list: async (filters = {}) => (await request('GET', `/api/cases${qs(filters)}`)).items,
  get: async (id) => (await request('GET', `/api/cases/${id}`)).case,
  // legs[i].attachments may hold { file } entries (document verification) — uploaded after the case is created
  create: async (data) => {
    const { case: created } = await request('POST', '/api/cases', { body: data });
    let result = created;
    for (let i = 0; i < data.legs.length; i++) {
      const files = (data.legs[i].attachments || []).map((a) => a.file).filter(Boolean);
      if (!files.length) continue;
      const form = new FormData();
      files.forEach((f) => form.append('files', f, f.name));
      result = (await request('POST', `/api/cases/${created.id}/legs/${created.legs[i].id}/attachments`, { form })).case;
    }
    return result;
  },
  reassign: async (caseId, legId, executiveId) => (await request('PATCH', `/api/cases/${caseId}/legs/${legId}/assign`, { body: { executiveId } })).case,
  setOutcome: async (caseId, data) => (await request('POST', `/api/cases/${caseId}/outcome`, { body: data })).case,
  // DEMO ONLY — backend must run with ENABLE_DEMO_TOOLS=true
  simulateVisit: async (caseId, legId) => (await request('POST', `/api/cases/${caseId}/legs/${legId}/simulate`)).case,
};

// ---------------- Customer feedback (public) ----------------
export const feedback = {
  get: (token) => request('GET', `/api/public/feedback/${token}`, { auth: false }),
  submit: (token, data) => request('POST', `/api/public/feedback/${token}`, { body: data, auth: false }),
};

// ---------------- Sampling logins ----------------
export const logins = {
  list: async (filters = {}) => (await request('GET', `/api/sampling-logins${qs(filters)}`)).items,
};

// Uploaded file URLs come back as /uploads/... — prefix when the API is on another domain.
export const fileUrl = (u) => (!u || /^https?:/.test(u) ? u : BASE + u);
