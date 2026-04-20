import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// ── Auth token storage ────────────────────────────────────────────────────────
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Only use simple string keys for the URL — skip object params
    const urlParts = queryKey.filter((k): k is string => typeof k === "string");
    const url = urlParts.join("/");

    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${url}`, { headers });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") return null;
      // For "throw" mode: don't throw immediately — return empty data
      // to avoid crashing the whole app on auth race conditions
      console.warn(`401 on ${url} — token may not be set yet`);
      return null;
    }

    if (res.status === 404) {
      // Return null for missing resources instead of throwing
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Authenticated fetch wrapper — use instead of raw fetch() for API calls.
 * Automatically includes the Authorization header if a token is set.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return fetch(url, { ...options, headers });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
      retryDelay: 500,
    },
    mutations: {
      retry: false,
    },
  },
});
