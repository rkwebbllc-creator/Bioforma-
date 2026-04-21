import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { apiRequest, API_BASE, setAuthToken } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  goal: string | null;
  onboardingComplete: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isPro: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AuthUser, "name" | "goal" | "onboardingComplete" | "plan">>) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ─── Persistence helpers (try multiple methods) ──────────────────────────────

// Use a global window variable as last-resort in-memory persistence.
// This survives React re-renders and hot-module-replacement but not full page reloads.
const STORAGE_KEY = "__bioforma_session__";

interface StoredSession {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

function storeSession(session: StoredSession) {
  try {
    const json = JSON.stringify(session);
    // Try sessionStorage first (works in most iframes)
    try { sessionStorage.setItem(STORAGE_KEY, json); } catch {}
    // Try localStorage as fallback
    try { localStorage.setItem(STORAGE_KEY, json); } catch {}
    // Always store in window as last resort
    (window as any)[STORAGE_KEY] = session;
  } catch {}
}

function loadSession(): StoredSession | null {
  try {
    // Try window variable first (fastest, always works)
    const win = (window as any)[STORAGE_KEY];
    if (win && win.token) return win;
    // Try sessionStorage
    try {
      const ss = sessionStorage.getItem(STORAGE_KEY);
      if (ss) { const parsed = JSON.parse(ss); (window as any)[STORAGE_KEY] = parsed; return parsed; }
    } catch {}
    // Try localStorage
    try {
      const ls = localStorage.getItem(STORAGE_KEY);
      if (ls) { const parsed = JSON.parse(ls); (window as any)[STORAGE_KEY] = parsed; return parsed; }
    } catch {}
  } catch {}
  return null;
}

function clearSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  delete (window as any)[STORAGE_KEY];
}

// ─── Authenticated fetch helper ──────────────────────────────────────────────

async function authFetchHelper(method: string, url: string, token: string | null, data?: unknown) {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).error || text; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ─── Token refresh interval (50 min — tokens expire at 60) ──────────────────
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;

// Guard against concurrent refresh calls — Supabase rotates refresh tokens
// on each successful use, so a second concurrent call with a now-stale token
// produces a 401 and would log the user out. We de-duplicate by sharing a promise.
let inFlightRefresh: Promise<any> | null = null;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared, de-duplicated refresh function. Never throws — on failure it just
  // leaves the existing token in place so the next real API request surfaces
  // any real auth problem naturally instead of force-logging out.
  async function refreshNow() {
    if (!refreshTokenRef.current) return;
    if (inFlightRefresh) return inFlightRefresh;
    const current = refreshTokenRef.current;
    inFlightRefresh = (async () => {
      try {
        const data = await authFetchHelper("POST", "/api/auth/refresh", null, {
          refreshToken: current,
        });
        setTokenAndStore(data.token, data.refreshToken, data.user);
      } catch {
        // Swallow: keep existing session. Don't kick the user out from a
        // background timer — let an actual failed request decide.
      } finally {
        inFlightRefresh = null;
      }
    })();
    return inFlightRefresh;
  }

  function startRefreshTimer() {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(() => {
      // Only refresh while the tab is visible — avoids racing with the
      // visibility-change refresh on backgrounded tabs.
      if (typeof document !== "undefined" && document.hidden) return;
      refreshNow();
    }, REFRESH_INTERVAL_MS);
  }

  function stopRefreshTimer() {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  function setTokenAndStore(newToken: string, newRefreshToken: string, newUser: AuthUser) {
    setToken(newToken);
    setAuthToken(newToken);
    refreshTokenRef.current = newRefreshToken;
    setUser(newUser);
    storeSession({ token: newToken, refreshToken: newRefreshToken, user: newUser });
  }

  function doLogout() {
    setToken(null);
    setAuthToken(null);
    setUser(null);
    refreshTokenRef.current = null;
    clearSession();
    stopRefreshTimer();
  }

  // On mount: try to restore session (do NOT set user until verified)
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = loadSession();
      if (stored && stored.token && stored.refreshToken) {
        // First try verifying the stored token
        try {
          setAuthToken(stored.token);
          const data = await authFetchHelper("GET", "/api/auth/me", stored.token);
          if (!cancelled) {
            const u = data.user ?? data;
            setToken(stored.token);
            refreshTokenRef.current = stored.refreshToken;
            setUser(u);
            storeSession({ token: stored.token, refreshToken: stored.refreshToken, user: u });
            startRefreshTimer();
          }
        } catch {
          // Token expired — try refreshing
          try {
            const data = await authFetchHelper("POST", "/api/auth/refresh", null, {
              refreshToken: stored.refreshToken,
            });
            if (!cancelled) {
              setTokenAndStore(data.token, data.refreshToken, data.user);
              startRefreshTimer();
            }
          } catch {
            // Refresh also failed — clear stale session, show login
            if (!cancelled) {
              clearSession();
              setAuthToken(null);
            }
          }
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    restore();
    return () => { cancelled = true; stopRefreshTimer(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetchHelper("POST", "/api/auth/login", null, { email, password });
    setTokenAndStore(data.token, data.refreshToken, data.user);
    startRefreshTimer();
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const data = await authFetchHelper("POST", "/api/auth/signup", null, { name, email, password });
    setTokenAndStore(data.token, data.refreshToken, data.user);
    startRefreshTimer();
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await authFetchHelper("POST", "/api/auth/logout", token);
    } catch {}
    doLogout();
  }, [token]);

  const updateProfile = useCallback(async (data: Partial<Pick<AuthUser, "name" | "goal" | "onboardingComplete" | "plan">>) => {
    const result = await authFetchHelper("PATCH", "/api/auth/profile", token, data);
    const newUser = result.user;
    setUser(newUser);
    // Update stored session too
    if (token && refreshTokenRef.current) {
      storeSession({ token, refreshToken: refreshTokenRef.current, user: newUser });
    }
  }, [token]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    isPro: user?.plan === "pro",
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
