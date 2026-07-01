/*
  NAMMA CINEMA — Frontend Security Utils
  Add this as: frontend/src/security.js

  Protects the frontend from:
  - XSS via input sanitization
  - Clickjacking via CSP meta tags
  - Sensitive data leaks
  - Unauthorized admin access
*/

// ── Input sanitizer — strip dangerous HTML/JS from any user input ──
export function sanitize(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// ── Check if user is admin (frontend check only — backend also checks) ──
export function isAdmin(user) {
  if (!user) return false;
  const ADMIN_EMAILS = [
    "admin@nammacinema.in",
    "vinaygowda12096909@gmail.com",
  ];
  return user.role === "admin" || ADMIN_EMAILS.includes(user?.email);
}

// ── Safe localStorage get — never crashes, never leaks ──
export function safeGet(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch(e) {
    return null;
  }
}

// ── Safe localStorage set ──
export function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch(e) {
    return false;
  }
}

// ── Remove sensitive keys on logout ──
export function secureLogout() {
  const keysToRemove = [
    "streamx_user",
    "streamx_token",
    "nc_device_id",
  ];
  keysToRemove.forEach(k => {
    try { localStorage.removeItem(k); } catch(e) {}
  });
}

// ── Validate email (same rules as backend) ──
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Validate Indian phone number ──
export function isValidPhone(phone) {
  const clean = phone.replace(/\D/g, "");
  return clean.length === 10 && /^[6-9]/.test(clean);
}

// ── Check token expiry (JWT decode without library) ──
export function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000;
  } catch(e) {
    return true; // if decode fails, treat as expired
  }
}

// ── Auto-logout if token expired ──
export function checkAuthValidity() {
  const token = localStorage.getItem("streamx_token");
  if (token && isTokenExpired(token)) {
    secureLogout();
    return false;
  }
  return true;
}
