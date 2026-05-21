// frontend/src/api.js
// All API calls to our backend in one place

const BASE = "http://localhost:5000/api";

// ── Helper ─────────────────────────────────────
async function request(url, options = {}) {
  const token = localStorage.getItem("streamx_token");
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  return data;
}

// ── AUTH ────────────────────────────────────────
export const auth = {
  register: (name, email, password) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request("/auth/logout", { method: "POST" }),

  me: () => request("/auth/me"),
};

// ── CONTENT ─────────────────────────────────────
export const content = {
  getAll:      ()  => request("/content"),
  getFeatured: ()  => request("/content/featured"),
  getTrending: ()  => request("/content/trending"),
  search:      (q) => request(`/content/search?q=${q}`),
  getById:     (id)=> request(`/content/${id}`),
};

// ── SUBSCRIPTIONS ────────────────────────────────
export const subscriptions = {
  getPlans:   ()       => request("/subscriptions/plans"),
  getCurrent: ()       => request("/subscriptions/current"),
  subscribe:  (planId) =>
    request("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  cancel: () =>
    request("/subscriptions/cancel", { method: "POST" }),
};

// ── USER ────────────────────────────────────────
export const user = {
  getWatchlist:  ()         => request("/users/watchlist"),
  addWatchlist:  (contentId)=>
    request("/users/watchlist", {
      method: "POST",
      body: JSON.stringify({ contentId }),
    }),
  removeWatchlist: (id)     => request(`/users/watchlist/${id}`, { method: "DELETE" }),
  getHistory:    ()         => request("/users/history"),
  getDownloads:  ()         => request("/users/downloads"),
  getPreferences:()         => request("/users/preferences"),
  updatePreferences: (data) =>
    request("/users/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── ADMIN ───────────────────────────────────────
export const admin = {
  getStats:   () => request("/admin/stats"),
  getUsers:   () => request("/admin/users"),
  getContent: () => request("/admin/content"),
};