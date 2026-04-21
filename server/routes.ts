import type { Express } from "express";
import { createServer } from "http";
import { supabase, createUserClient } from "./supabase";

// ── Beta Coupon Codes ───────────────────────────────────────────────────
// Add/remove/modify codes here. Each code has a discount description,
// a type (percent or fixed), and optional max uses.
const BETA_COUPONS: Record<string, { discount: string; type: 'percent' | 'fixed'; amount: number; maxUses?: number }> = {
  'BETA50':      { discount: '50% off first 3 months', type: 'percent', amount: 50 },
  'BIOFORMA100': { discount: 'Free lifetime access — Founding Member', type: 'percent', amount: 100 },
  'LAUNCH30':    { discount: '30% off annual plan', type: 'percent', amount: 30 },
  'PEPTIDE25':   { discount: '25% off any plan', type: 'percent', amount: 25 },
  'BETATESTER':  { discount: '3 months free Pro access', type: 'fixed', amount: 0 },
};

// Track redeemed coupons in memory (will persist in Supabase later)
const redeemedCoupons: Map<string, Set<string>> = new Map(); // code -> set of userIds

// ── Case conversion helpers ────────────────────────────────────────────────

function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    result[snakeKey] = val;
  }
  return result;
}

function toCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = val;
  }
  return result;
}

function toCamelArray(arr: Record<string, any>[]): Record<string, any>[] {
  return arr.map(toCamel);
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getToken(req: any): string | null {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function getAuthUser(req: any): Promise<{ id: string; email: string } | null> {
  const token = getToken(req);
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? '' };
}

async function getProfile(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return toCamel(data);
}

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";

async function fetchOura(token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${OURA_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Oura API error: ${res.status}`);
  return res.json();
}

// ── In-memory Oura settings (per-server, no user scoping needed for Oura token) ──
const ouraStore = new Map<string, { personalAccessToken: string | null; connected: boolean }>();

function getOuraSettings(userId: string) {
  if (!ouraStore.has(userId)) {
    ouraStore.set(userId, { personalAccessToken: null, connected: false });
  }
  return ouraStore.get(userId)!;
}

export function registerRoutes(httpServer: ReturnType<typeof createServer>, app: Express) {
  // ── Auth routes ──────────────────────────────────────────────────────────────

  // POST /api/auth/signup
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body as { email: string; password: string; name: string };
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: undefined,
        },
      });
      if (error) return res.status(400).json({ error: error.message });

      // If email confirmation is enabled, Supabase returns user but no session.
      // In that case, try signing in immediately (works when confirm is disabled,
      // or when the user already confirmed).
      let session = data.session;
      let user = data.user;
      if (!session && user) {
        // Attempt auto-login — will work if email confirmation is disabled in Supabase settings
        const loginAttempt = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        if (loginAttempt.data.session) {
          session = loginAttempt.data.session;
          user = loginAttempt.data.user;
        } else {
          return res.status(400).json({
            error: "Account created. Please check your email for a confirmation link, then sign in.",
          });
        }
      }
      if (!session || !user) {
        return res.status(400).json({ error: "Signup failed — please try again." });
      }
      // Update profile with name
      await supabase
        .from('profiles')
        .upsert({ id: user.id, email: email.toLowerCase().trim(), name: name.trim() });

      const profile = await getProfile(user.id);
      const token = session.access_token;
      const refreshToken = session.refresh_token;
      res.json({ token, refreshToken, user: profile ?? { id: user.id, email: user.email, name: name.trim(), plan: 'free', goal: null, onboardingComplete: false } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) return res.status(401).json({ error: error.message });
      if (!data.session || !data.user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const profile = await getProfile(data.user.id);
      const token = data.session.access_token;
      const refreshToken = data.session.refresh_token;
      res.json({ token, refreshToken, user: profile ?? { id: data.user.id, email: data.user.email, name: '', plan: 'free', goal: null, onboardingComplete: false } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/forgot-password — send reset email via Supabase
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: 'https://bioforma.dev/reset-password',
      });
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true, message: "If an account exists with that email, a reset link has been sent." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/reset-password — update password using recovery token
  app.post("/api/auth/reset-password", async (req, res) => {
    const { accessToken, newPassword } = req.body as { accessToken: string; newPassword: string };
    if (!accessToken || !newPassword) return res.status(400).json({ error: "accessToken and newPassword required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    try {
      const client = createUserClient(accessToken);
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true, message: "Password updated successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/refresh — exchange refresh token for a new access token
  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) return res.status(401).json({ error: error?.message || "Session expired" });
      const profile = await getProfile(data.user!.id);
      res.json({
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: profile ?? { id: data.user!.id, email: data.user!.email, name: '', plan: 'free', goal: null, onboardingComplete: false },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: "Invalid or expired session" });
      const profile = await getProfile(user.id);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json({ user: profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    // Client discards token; no server action needed
    res.json({ ok: true });
  });

  // PATCH /api/auth/profile
  app.patch("/api/auth/profile", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: "Invalid session" });
      const { name, goal, onboardingComplete, plan } = req.body;
      const update: Record<string, any> = {};
      if (name !== undefined) update.name = name;
      if (goal !== undefined) update.goal = goal;
      if (onboardingComplete !== undefined) update.onboarding_complete = onboardingComplete;
      if (plan !== undefined) update.plan = plan;
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user.id)
        .select()
        .single();
      if (updateError) return res.status(500).json({ error: updateError.message });
      res.json({ user: toCamel(updated) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Supplements ─────────────────────────────────────────────────────────────

  app.get("/api/supplements", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const client = createUserClient(token);
      const { data, error } = await client.from('supplements').select('*').order('id');
      if (error) {
        if (error.message?.includes('JWT')) return res.status(401).json({ error: "Invalid or expired token" });
        return res.status(500).json({ error: error.message });
      }
      res.json(toCamelArray(data ?? []));
    } catch (e: any) {
      if (e.message?.includes('JWT') || e.message?.includes('parts')) return res.status(401).json({ error: "Invalid or expired token" });
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/supplements", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    try {
      const body = { ...req.body };
      if (Array.isArray(body.scheduleDays)) {
        body.scheduleDays = body.scheduleDays.length > 0 ? JSON.stringify(body.scheduleDays) : null;
      }
      const snakeBody = toSnake(body);
      const { data, error } = await client
        .from('supplements')
        .insert({ ...snakeBody, user_id: authUser.id })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(toCamel(data));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/supplements/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    try {
      const body = { ...req.body };
      if (Array.isArray(body.scheduleDays)) {
        body.scheduleDays = body.scheduleDays.length > 0 ? JSON.stringify(body.scheduleDays) : null;
      }
      const snakeBody = toSnake(body);
      const { data, error } = await client
        .from('supplements')
        .update(snakeBody)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) return res.status(404).json({ error: error.message });
      res.json(toCamel(data));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/supplements/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('supplements').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  // ── Protocols ──────────────────────────────────────────────────────────────

  app.get("/api/protocols", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client.from('protocols').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.post("/api/protocols", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    try {
      const { data, error } = await client
        .from('protocols')
        .insert({ ...toSnake(req.body), user_id: authUser.id })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(toCamel(data));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/protocols/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('protocols')
      .update(toSnake(req.body))
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.delete("/api/protocols/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    // Protocol supplements are cascade deleted by DB
    await client.from('protocols').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/protocols/:id/activate", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    // Deactivate all, then activate target
    await client.from('protocols').update({ active: false }).neq('id', 0);
    await client.from('protocols').update({ active: true }).eq('id', req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/protocols/deactivate-all", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('protocols').update({ active: false }).neq('id', 0);
    res.json({ ok: true });
  });

  // ── Protocol supplements ────────────────────────────────────────────────────

  app.get("/api/protocols/:id/supplements", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('protocol_supplements')
      .select('*')
      .eq('protocol_id', req.params.id)
      .order('sort_order');
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.post("/api/protocols/:id/supplements", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('protocol_supplements')
      .insert({ ...toSnake(req.body), protocol_id: Number(req.params.id), user_id: authUser.id })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.delete("/api/protocol-supplements/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('protocol_supplements').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  // ── Supplement logs ─────────────────────────────────────────────────────────

  app.get("/api/supplement-logs", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const { data, error } = await client
      .from('supplement_logs')
      .select('*')
      .eq('date', date);
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.post("/api/supplement-logs", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const body = {
      ...toSnake(req.body),
      user_id: authUser.id,
      date: req.body.date || new Date().toISOString().slice(0, 10),
      taken_at: new Date().toISOString(),
    };
    const { data, error } = await client.from('supplement_logs').insert(body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.delete("/api/supplement-logs/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('supplement_logs').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  // ── Nutrition logs ──────────────────────────────────────────────────────────

  app.get("/api/nutrition-logs", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const { data, error } = await client
      .from('nutrition_logs')
      .select('*')
      .eq('date', date);
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.get("/api/nutrition-history", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const days = Number(req.query.days) || 30;
    const { data, error } = await client
      .from('nutrition_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(days * 8);
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.post("/api/nutrition-logs", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const body = {
      ...toSnake(req.body),
      user_id: authUser.id,
      date: req.body.date || new Date().toISOString().slice(0, 10),
      logged_at: new Date().toISOString(),
    };
    const { data, error } = await client.from('nutrition_logs').insert(body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.patch("/api/nutrition-logs/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('nutrition_logs')
      .update(toSnake(req.body))
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.delete("/api/nutrition-logs/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('nutrition_logs').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  // ── Daily targets ───────────────────────────────────────────────────────────

  app.get("/api/targets", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data } = await client
      .from('daily_targets')
      .select('*')
      .eq('user_id', authUser.id)
      .single();
    if (!data) {
      // Return defaults if not set
      return res.json({ calories: 2500, protein: 180, carbs: 250, fat: 80, water: 3 });
    }
    res.json(toCamel(data));
  });

  app.patch("/api/targets", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    // Check if record exists
    const { data: existing } = await client
      .from('daily_targets')
      .select('id')
      .eq('user_id', authUser.id)
      .single();
    if (existing) {
      const { data, error } = await client
        .from('daily_targets')
        .update(toSnake(req.body))
        .eq('user_id', authUser.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(toCamel(data));
    } else {
      const defaults = { calories: 2500, protein: 180, carbs: 250, fat: 80, water: 3 };
      const { data, error } = await client
        .from('daily_targets')
        .insert({ ...defaults, ...toSnake(req.body), user_id: authUser.id })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(toCamel(data));
    }
  });

  // ── InBody logs ─────────────────────────────────────────────────────────────

  app.get("/api/inbody", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    let query = client
      .from('inbody_logs')
      .select('*')
      .order('date', { ascending: false });
    // Filter by scan type if provided
    if (req.query.type) {
      query = query.eq('scan_type', req.query.type as string);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.get("/api/inbody/latest", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    let query = client
      .from('inbody_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);
    // Filter by scan type if provided
    if (req.query.type) {
      query = query.eq('scan_type', req.query.type as string);
    }
    const { data, error } = await query.single();
    if (error || !data) return res.status(404).json({ error: "No scans yet" });
    res.json(toCamel(data));
  });

  app.post("/api/inbody", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const body = {
      ...toSnake(req.body),
      user_id: authUser.id,
      date: req.body.date || new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await client.from('inbody_logs').insert(body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.patch("/api/inbody/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('inbody_logs')
      .update(toSnake(req.body))
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(toCamel(data));
  });

  app.delete("/api/inbody/:id", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    await client.from('inbody_logs').delete().eq('id', req.params.id);
    res.json({ ok: true });
  });

  // ── InBody batch import ─────────────────────────────────────────────────────

  app.post("/api/inbody/import", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const rows: any[] = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Expected array of scan rows" });
    }
    const client = createUserClient(token);
    const toInsert = rows.map((row) => ({
      user_id: authUser.id,
      date: row.date,
      weight: row.weight ?? null,
      body_fat_percent: row.bodyFatPercent ?? null,
      muscle_mass: row.muscleMass ?? null,
      bmi: row.bmi ?? null,
      bmr: row.bmr ?? null,
      visceral_fat: row.visceralFat ?? null,
      body_water: row.bodyWater ?? null,
      bone_mass: row.boneMass ?? null,
      protein_mass: row.proteinMass ?? null,
      lean_mass: row.leanMass ?? null,
      notes: row.notes ?? null,
    }));
    const { data, error } = await client.from('inbody_logs').insert(toInsert).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ imported: (data ?? []).length, skipped: rows.length - (data ?? []).length, results: toCamelArray(data ?? []) });
  });

  // ── Oura settings (in-memory per user) ─────────────────────────────────────

  app.get("/api/oura/settings", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const s = getOuraSettings(authUser.id);
    res.json({
      connected: s.connected,
      hasToken: !!s.personalAccessToken,
      tokenPreview: s.personalAccessToken
        ? `••••••••${s.personalAccessToken.slice(-6)}`
        : null,
    });
  });

  app.post("/api/oura/connect", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const { token: ouraToken } = req.body;
    if (!ouraToken || typeof ouraToken !== "string") {
      return res.status(400).json({ error: "Token required" });
    }
    try {
      await fetchOura(ouraToken, "personal_info".replace("usercollection/", ""));
      ouraStore.set(authUser.id, { personalAccessToken: ouraToken, connected: true });
      res.json({ ok: true, connected: true });
    } catch {
      try {
        const today = new Date().toISOString().slice(0, 10);
        await fetchOura(ouraToken, "daily_sleep", { start_date: today, end_date: today });
        ouraStore.set(authUser.id, { personalAccessToken: ouraToken, connected: true });
        res.json({ ok: true, connected: true });
      } catch (e: any) {
        res.status(401).json({ error: "Invalid token — check your Oura Personal Access Token" });
      }
    }
  });

  app.post("/api/oura/disconnect", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    ouraStore.set(authUser.id, { personalAccessToken: null, connected: false });
    res.json({ ok: true });
  });

  // ── Oura data proxy ─────────────────────────────────────────────────────────

  app.get("/api/oura/today", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const settings = getOuraSettings(authUser.id);
    if (!settings.connected || !settings.personalAccessToken) {
      return res.status(401).json({ error: "Oura not connected" });
    }
    const ouraToken = settings.personalAccessToken;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    try {
      const [sleep, readiness, activity] = await Promise.all([
        fetchOura(ouraToken, "daily_sleep", { start_date: yesterday, end_date: today }).catch(() => ({ data: [] })),
        fetchOura(ouraToken, "daily_readiness", { start_date: yesterday, end_date: today }).catch(() => ({ data: [] })),
        fetchOura(ouraToken, "daily_activity", { start_date: yesterday, end_date: today }).catch(() => ({ data: [] })),
      ]);
      const latestSleep = sleep.data?.[sleep.data.length - 1] ?? null;
      const latestReadiness = readiness.data?.[readiness.data.length - 1] ?? null;
      const latestActivity = activity.data?.[activity.data.length - 1] ?? null;
      res.json({
        sleep: latestSleep ? { score: latestSleep.score, day: latestSleep.day, contributors: latestSleep.contributors } : null,
        readiness: latestReadiness ? { score: latestReadiness.score, day: latestReadiness.day, contributors: latestReadiness.contributors, temperatureDeviation: latestReadiness.temperature_deviation } : null,
        activity: latestActivity ? { score: latestActivity.score, day: latestActivity.day, activeCalories: latestActivity.active_calories, totalCalories: latestActivity.total_calories, steps: latestActivity.steps, contributors: latestActivity.contributors } : null,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/oura/history", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const settings = getOuraSettings(authUser.id);
    if (!settings.connected || !settings.personalAccessToken) {
      return res.status(401).json({ error: "Oura not connected" });
    }
    const ouraToken = settings.personalAccessToken;
    const days = Number(req.query.days) || 14;
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    try {
      const [sleep, readiness, activity] = await Promise.all([
        fetchOura(ouraToken, "daily_sleep", { start_date: start, end_date: end }).catch(() => ({ data: [] })),
        fetchOura(ouraToken, "daily_readiness", { start_date: start, end_date: end }).catch(() => ({ data: [] })),
        fetchOura(ouraToken, "daily_activity", { start_date: start, end_date: end }).catch(() => ({ data: [] })),
      ]);
      res.json({ sleep: sleep.data ?? [], readiness: readiness.data ?? [], activity: activity.data ?? [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Oura logs (Supabase) ────────────────────────────────────────────────────
  // Note: oura_logs table not in Supabase schema — use health_logs for wearable data

  app.get("/api/oura/logs", async (req, res) => {
    // Return empty array — Supabase schema doesn't have oura_logs
    res.json([]);
  });

  app.get("/api/oura/latest", async (req, res) => {
    res.status(404).json({ error: "No Oura data yet" });
  });

  app.post("/api/oura/import-csv", async (req, res) => {
    res.json({ imported: 0, updated: 0 });
  });

  // ── Regimen Consistency Score ─────────────────────────────────────────────
  // GET /api/score — Returns a 0-100 consistency score based on last 30 days
  app.get("/api/score", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    try {
      const client = createUserClient(token);

      // Date range: last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

      // Fetch all the data we need in parallel
      const [supplementsRes, supplementLogsRes, nutritionLogsRes, inbodyRes, targetsRes] = await Promise.all([
        client.from('supplements').select('id, active, schedule_days').eq('active', true),
        client.from('supplement_logs').select('supplement_id, date').gte('date', startDate),
        client.from('nutrition_logs').select('date, calories, protein').gte('date', startDate),
        client.from('inbody_logs').select('date').gte('date', startDate),
        client.from('daily_targets').select('calories, protein').limit(1).maybeSingle(),
      ]);

      const activeSupplements = supplementsRes.data || [];
      const supplementLogs = supplementLogsRes.data || [];
      const nutritionLogs = nutritionLogsRes.data || [];
      const inbodyLogs = inbodyRes.data || [];
      const targets = targetsRes.data || { calories: 2000, protein: 150 };

      // Generate the last 30 days as an array of date strings
      const days: string[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }

      // Map day-of-week helper ("Sun", "Mon", etc.)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const getDayName = (dateStr: string) => dayNames[new Date(dateStr + 'T12:00:00Z').getDay()];

      // ── COMPONENT 1: Supplement Adherence (40% weight) ──
      // % of scheduled supplement doses actually taken over 30 days
      let totalScheduled = 0;
      let totalTaken = 0;

      for (const day of days) {
        const dayName = getDayName(day);
        for (const sup of activeSupplements) {
          let scheduled = true;
          if (sup.schedule_days) {
            try {
              const sch = typeof sup.schedule_days === 'string' ? JSON.parse(sup.schedule_days) : sup.schedule_days;
              if (Array.isArray(sch) && sch.length > 0 && sch.length < 7) {
                scheduled = sch.includes(dayName);
              }
            } catch {}
          }
          if (scheduled) {
            totalScheduled++;
            const taken = supplementLogs.some(l => l.supplement_id === sup.id && l.date === day);
            if (taken) totalTaken++;
          }
        }
      }
      const supplementScore = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

      // ── COMPONENT 2: Nutrition Logging (30% weight) ──
      // % of days where the user logged at least one meal
      const daysWithMeals = new Set(nutritionLogs.map(l => l.date));
      const nutritionScore = (daysWithMeals.size / 30) * 100;

      // ── COMPONENT 3: Nutrition Target Hit (20% weight) ──
      // Among days with logs, how close to protein target (most important macro)
      const dailyProtein: Record<string, number> = {};
      for (const log of nutritionLogs) {
        dailyProtein[log.date] = (dailyProtein[log.date] || 0) + (log.protein || 0);
      }
      const proteinTarget = targets?.protein || 150;
      const loggedDays = Object.keys(dailyProtein);
      let targetScore = 0;
      if (loggedDays.length > 0) {
        const totalRatio = loggedDays.reduce((sum, day) => {
          const ratio = Math.min(1, dailyProtein[day] / proteinTarget);
          return sum + ratio;
        }, 0);
        targetScore = (totalRatio / loggedDays.length) * 100;
      }

      // ── COMPONENT 4: Body Comp Tracking (10% weight) ──
      // At least 2 scans in 30 days = 100, 1 scan = 50, 0 scans = 0
      const bodyCompScore = inbodyLogs.length >= 2 ? 100 : inbodyLogs.length === 1 ? 50 : 0;

      // ── OVERALL SCORE (weighted) ──
      const overall = Math.round(
        supplementScore * 0.40 +
        nutritionScore * 0.30 +
        targetScore * 0.20 +
        bodyCompScore * 0.10
      );

      // ── STREAK: consecutive days with at least one supplement log OR meal log ──
      let streak = 0;
      for (const day of days) {
        const hasSupp = supplementLogs.some(l => l.date === day);
        const hasMeal = nutritionLogs.some(l => l.date === day);
        if (hasSupp || hasMeal) streak++;
        else break;
      }

      // ── GRADE ──
      let grade: string;
      let gradeColor: string;
      if (overall >= 90) { grade = 'A'; gradeColor = 'hsl(142 65% 52%)'; }
      else if (overall >= 80) { grade = 'B'; gradeColor = 'hsl(142 50% 58%)'; }
      else if (overall >= 70) { grade = 'C'; gradeColor = 'hsl(46 95% 60%)'; }
      else if (overall >= 60) { grade = 'D'; gradeColor = 'hsl(32 95% 58%)'; }
      else { grade = 'F'; gradeColor = 'hsl(4 72% 62%)'; }

      // ── INSIGHT (AI-like feedback based on components) ──
      let insight = '';
      if (overall >= 90) insight = "You're crushing it. Keep this pace to maximize your results.";
      else if (overall >= 80) insight = "Strong consistency. Small tweaks could push you into elite territory.";
      else if (overall >= 70) insight = "Solid foundation. Focus on the weakest area below to level up.";
      else if (overall >= 60) insight = "You're building momentum. Log more days to see real progress.";
      else if (overall > 0) insight = "Your regimen needs more consistency. Start with just the basics daily.";
      else insight = "Log your first supplement or meal to start tracking your progress.";

      // Find weakest component for actionable suggestion
      const components = [
        { name: 'Supplements', score: supplementScore, key: 'supplements' },
        { name: 'Nutrition Logging', score: nutritionScore, key: 'nutrition' },
        { name: 'Macro Targets', score: targetScore, key: 'targets' },
        { name: 'Body Comp', score: bodyCompScore, key: 'body' },
      ];
      const weakest = components.reduce((min, c) => c.score < min.score ? c : min, components[0]);

      res.json({
        overall,
        grade,
        gradeColor,
        streak,
        insight,
        weakest: weakest.key,
        components: {
          supplements: {
            score: Math.round(supplementScore),
            taken: totalTaken,
            scheduled: totalScheduled,
          },
          nutrition: {
            score: Math.round(nutritionScore),
            daysLogged: daysWithMeals.size,
            totalDays: 30,
          },
          targets: {
            score: Math.round(targetScore),
            loggedDays: loggedDays.length,
          },
          body: {
            score: bodyCompScore,
            scans: inbodyLogs.length,
          },
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Coupon Codes ─────────────────────────────────────────────────────────

  // POST /api/coupon/validate — check if a coupon code is valid
  app.post("/api/coupon/validate", async (req, res) => {
    const { code } = req.body as { code: string };
    if (!code) return res.status(400).json({ valid: false, message: "No code provided" });

    const coupon = BETA_COUPONS[code.toUpperCase()];
    if (!coupon) {
      return res.json({ valid: false, message: "Invalid coupon code" });
    }

    // Check if already redeemed by this user
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const redeemed = redeemedCoupons.get(code.toUpperCase());
        if (redeemed?.has(user.id)) {
          return res.json({ valid: false, message: "You've already redeemed this code" });
        }
      }
    }

    return res.json({
      valid: true,
      message: coupon.discount,
      discount: coupon.discount,
      type: coupon.type,
      amount: coupon.amount,
    });
  });

  // POST /api/coupon/redeem — mark a coupon as used
  app.post("/api/coupon/redeem", async (req, res) => {
    const { code } = req.body as { code: string };
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    const coupon = BETA_COUPONS[code?.toUpperCase()];
    if (!coupon) return res.status(400).json({ error: "Invalid coupon" });

    // Mark as redeemed
    if (!redeemedCoupons.has(code.toUpperCase())) {
      redeemedCoupons.set(code.toUpperCase(), new Set());
    }
    redeemedCoupons.get(code.toUpperCase())!.add(user.id);

    return res.json({ success: true, discount: coupon.discount });
  });

  // ── Health logs (Apple Health) ──────────────────────────────────────────────

  app.get("/api/health/logs", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const days = Number(req.query.days) || 90;
    const { data, error } = await client
      .from('health_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelArray(data ?? []));
  });

  app.get("/api/health/latest", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data, error } = await client
      .from('health_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return res.status(404).json({ error: "No health data yet" });
    res.json(toCamel(data));
  });

  app.post("/api/health/sync", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const rows: any[] = Array.isArray(req.body) ? req.body : [req.body];
    if (rows.length === 0) return res.status(400).json({ error: "No data provided" });
    const client = createUserClient(token);
    let synced = 0, updated = 0;
    for (const row of rows) {
      const { data: existing } = await client
        .from('health_logs')
        .select('id')
        .eq('date', row.date)
        .single();
      if (existing) {
        await client.from('health_logs').update(toSnake(row)).eq('id', existing.id);
        updated++;
      } else {
        await client.from('health_logs').insert({ ...toSnake(row), user_id: authUser.id });
        synced++;
      }
    }
    res.json({ synced, updated });
  });

  // ── Meal schedule ───────────────────────────────────────────────────────────

  app.get("/api/meal-schedule", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const { data } = await client
      .from('meal_schedule')
      .select('*')
      .eq('user_id', authUser.id)
      .single();
    if (!data) {
      const defaults = {
        user_id: authUser.id,
        meal_count: 3,
        meals: JSON.stringify([
          { id: 1, name: "Breakfast", time: "07:30", enabled: true, targetCalories: 0, targetProtein: 0 },
          { id: 2, name: "Lunch", time: "12:30", enabled: true, targetCalories: 0, targetProtein: 0 },
          { id: 3, name: "Dinner", time: "18:30", enabled: true, targetCalories: 0, targetProtein: 0 },
        ]),
        reminders_enabled: false,
      };
      const { data: inserted } = await client.from('meal_schedule').insert(defaults).select().single();
      return res.json(inserted ? toCamel(inserted) : toCamel(defaults));
    }
    res.json(toCamel(data));
  });

  app.patch("/api/meal-schedule", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Not authenticated" });
    const client = createUserClient(token);
    const body = { ...req.body };
    if (Array.isArray(body.meals)) body.meals = JSON.stringify(body.meals);
    const { data: existing } = await client
      .from('meal_schedule')
      .select('id')
      .eq('user_id', authUser.id)
      .single();
    if (existing) {
      const { data, error } = await client
        .from('meal_schedule')
        .update(toSnake(body))
        .eq('user_id', authUser.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(toCamel(data));
    } else {
      const defaults = { user_id: authUser.id, meal_count: 3, meals: '[]', reminders_enabled: false };
      const { data, error } = await client
        .from('meal_schedule')
        .insert({ ...defaults, ...toSnake(body) })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(toCamel(data));
    }
  });

  // ── AI Chat ─────────────────────────────────────────────────────────────────

  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body as { messages: { role: string; content: string }[] };
    if (!messages?.length) return res.status(400).json({ error: "messages required" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic.default();

      const SYSTEM = `You are a knowledgeable research assistant specializing in peptides, supplements, nutrition, and biohacking. You help users understand research-backed information about:
- Peptide protocols (BPC-157, TB-500, CJC-1295, Ipamorelin, GHK-Cu, Selank, Semax, DSIP, NAD+, Retatrutide, MOTS-c, etc.)
- Supplement stacking and synergies
- Nutrition, macros, and body composition
- Recovery, sleep optimization, and HRV
- Longevity protocols and research

Always:
- Cite research or mechanisms when relevant
- Mention typical dosing ranges and protocols
- Note important safety considerations and drug interactions
- Recommend consulting a qualified healthcare provider before starting any peptide or supplement protocol
- Be clear about what is research-backed vs anecdotal

You are integrated into FitTrack, a supplement and nutrition tracker app. Users may ask about their own stack or general research questions.`;

      const stream = await client.messages.stream({
        model: "claude_sonnet_4_6",
        max_tokens: 1024,
        system: SYSTEM,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  // ── Protocol AI optimizer ───────────────────────────────────────────────────

  app.post("/api/protocol-chat", async (req, res) => {
    const { messages, protocolContext } = req.body as {
      messages: { role: string; content: string }[];
      protocolContext?: {
        protocolName: string;
        protocolGoal: string;
        protocolDescription?: string;
        supplements: { name: string; dose: number; unit: string; timing: string; category: string }[];
        allSupplements: { name: string; dose: number; unit: string; timing: string; category: string }[];
      };
    };
    if (!messages?.length) return res.status(400).json({ error: "messages required" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic.default();

      let systemPrompt = `You are an expert supplement protocol optimization assistant integrated into FitTrack.\nYou specialize in supplement stacking, peptide protocols, timing optimization, and biohacking best practices.`;

      if (protocolContext) {
        const { protocolName, protocolGoal, protocolDescription, supplements, allSupplements } = protocolContext;
        const suppList = supplements.map(s => `• ${s.name} — ${s.dose} ${s.unit} (${s.timing}, category: ${s.category})`).join("\n");
        const libList = allSupplements.filter(s => !supplements.some(ps => ps.name === s.name))
          .map(s => `• ${s.name} — ${s.dose} ${s.unit} (${s.timing}, ${s.category})`).join("\n");

        systemPrompt += `

## Current Protocol Being Optimized
**Name:** ${protocolName}
**Goal:** ${protocolGoal}
${protocolDescription ? `**Description:** ${protocolDescription}` : ""}

## Supplements Currently in This Protocol
${suppList || "None yet"}

## Other Supplements in Their Library (available to add)
${libList || "None"}

## Your Role
Analyze this protocol and provide specific, actionable optimization advice:
1. Identify timing conflicts or suboptimal windows (e.g., fat-soluble vitamins taken without food)
2. Flag potential synergies not being utilized
3. Suggest supplements from their library worth adding and why
4. Identify any potential interactions or redundancies
5. Suggest an optimal daily/weekly schedule

Be concrete and reference actual supplement names from their stack.
Always note: consult a healthcare provider before making changes.`;
      } else {
        systemPrompt += `\nHelp the user build or optimize supplement protocols. Be specific, practical, and reference research where relevant.\nAlways recommend consulting a healthcare provider before making changes.`;
      }

      const stream = await client.messages.stream({
        model: "claude_sonnet_4_6",
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  // ── Body Composition Weekly Optimizer ──────────────────────────────────────

  app.post("/api/body/optimize", async (req, res) => {
    const {
      goal,
      latestScan,
      previousScan,
      currentProtocols,
      currentSupplements,
      currentTargets,
      weekNumber,
    } = req.body as {
      goal: string;
      latestScan: Record<string, any> | null;
      previousScan: Record<string, any> | null;
      currentProtocols: { name: string; goal: string; supplements: { name: string; dose: number; unit: string; timing: string }[] }[];
      currentSupplements: { name: string; category: string; dose: number; unit: string; timing: string; active: boolean }[];
      currentTargets: { calories: number; protein: number; carbs: number; fat: number };
      weekNumber?: number;
    };

    if (!goal) return res.status(400).json({ error: "goal required" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic.default();

      const scanSection = latestScan ? `
## Latest Body Composition Scan
- Weight: ${latestScan.weight ?? "—"} lbs
- Body Fat: ${latestScan.bodyFatPercent ?? "—"}%
- Muscle Mass: ${latestScan.muscleMass ?? "—"} lbs
- Lean Mass: ${latestScan.leanMass ?? "—"} lbs
- BMI: ${latestScan.bmi ?? "—"}
- BMR: ${latestScan.bmr ?? "—"} kcal
- Visceral Fat: ${latestScan.visceralFat ?? "—"}
- Date: ${latestScan.date ?? "—"}
` : "## Body Composition: No scan data yet";

      const progressSection = (latestScan && previousScan) ? `
## Progress Since Last Scan (${previousScan.date ?? "prior scan"})
- Weight: ${previousScan.weight ?? "—"} → ${latestScan.weight ?? "—"} lbs (${latestScan.weight && previousScan.weight ? (latestScan.weight - previousScan.weight > 0 ? "+" : "") + (latestScan.weight - previousScan.weight).toFixed(1) : "N/A"} lbs)
- Body Fat: ${previousScan.bodyFatPercent ?? "—"}% → ${latestScan.bodyFatPercent ?? "—"}%
- Muscle Mass: ${previousScan.muscleMass ?? "—"} → ${latestScan.muscleMass ?? "—"} lbs
` : "";

      const targetsSection = `
## Current Nutrition Targets
- Calories: ${currentTargets?.calories ?? 2000} kcal
- Protein: ${currentTargets?.protein ?? 150} g
- Carbs: ${currentTargets?.carbs ?? 200} g
- Fat: ${currentTargets?.fat ?? 65} g
`;

      const supplementSection = currentSupplements?.length ? `
## Current Supplement Stack (${currentSupplements.filter(s => s.active).length} active)
${currentSupplements.filter(s => s.active).map(s => `• ${s.name} — ${s.dose} ${s.unit} (${s.timing}, ${s.category})`).join("\n")}
` : "";

      const protocolSection = currentProtocols?.length ? `
## Active Protocols
${currentProtocols.map(p => `### ${p.name} (${p.goal})\n${p.supplements.map(s => `  • ${s.name} ${s.dose} ${s.unit} @ ${s.timing}`).join("\n")}`).join("\n\n")}
` : "## Protocols: None active yet";

      const SYSTEM_PROMPT = `You are an elite performance nutrition and peptide protocol coach integrated into BioForma.
You specialize in body recomposition, evidence-based supplementation, peptide optimization, and weekly protocol periodization.

You have access to the user's real body composition data, supplement stack, and active protocols.
Your job is to generate a specific, actionable WEEKLY OPTIMIZATION PLAN based on their goal.

${scanSection}
${progressSection}
${targetsSection}
${supplementSection}
${protocolSection}

## User's Primary Goal This Week: ${goal}
${weekNumber ? `## Week Number: ${weekNumber} (adjust if periodization applies)` : ""}

## Your Output Format
Respond with a structured weekly optimization plan using these exact sections:

### 📊 Body Composition Assessment
Brief analysis of current metrics and progress trend (2-3 sentences).

### 🎯 Weekly Nutrition Targets
Provide SPECIFIC macro targets for this week based on goal and current stats. Format exactly as:
**Calories:** [number] kcal
**Protein:** [number] g
**Carbs:** [number] g
**Fat:** [number] g
*Reasoning: [1 sentence explaining the approach]*

### 💉 Peptide Protocol Recommendations
For each peptide recommendation, be specific:
- Which peptides to prioritize for this goal
- Dosing adjustments if warranted
- Timing optimization (e.g., fasted morning, pre-workout, night)
- Any cycling recommendations (e.g., 5 days on / 2 days off)

### 💊 Supplement Stack Adjustments
Review their current active stack and suggest:
- Supplements to emphasize this week and why
- Any timing adjustments for goal alignment
- Optional additions that would support the goal

### 📅 Weekly Schedule Template
Provide a simple AM/PM schedule showing when to take what (keep it concise).

### ⚡ Key Actions This Week
3-5 specific bullet points the user should implement immediately.

---
IMPORTANT: Be specific with numbers. Reference their actual data. Keep each section concise but actionable.
Always note: consult a healthcare provider before changing peptide protocols.`;

      const stream = await client.messages.stream({
        model: "claude_sonnet_4_6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Generate my weekly optimization plan for goal: ${goal}. Base it entirely on my current data above.` }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  // ── Data Export ─────────────────────────────────────────────────────────────

  app.get("/api/export/all", async (req, res) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Invalid or expired session" });
    const profile = await getProfile(authUser.id);
    if (!profile) return res.status(401).json({ error: "User not found" });

    try {
      const client = createUserClient(token);
      const [
        { data: supps },
        { data: protos },
        { data: protoSupps },
        { data: suppLogs },
        { data: nutLogs },
        { data: targets },
        { data: inbodyArr },
        { data: healthArr },
        { data: mealSched },
      ] = await Promise.all([
        client.from('supplements').select('*').order('id'),
        client.from('protocols').select('*').order('id'),
        client.from('protocol_supplements').select('*').order('id'),
        client.from('supplement_logs').select('*').order('date', { ascending: false }),
        client.from('nutrition_logs').select('*').order('date', { ascending: false }),
        client.from('daily_targets').select('*').eq('user_id', authUser.id).single(),
        client.from('inbody_logs').select('*').order('date', { ascending: false }),
        client.from('health_logs').select('*').order('date', { ascending: false }),
        client.from('meal_schedule').select('*').eq('user_id', authUser.id).single(),
      ]);

      const exportPayload: Record<string, any> = {
        exportDate: new Date().toISOString(),
        user: { id: profile.id, name: profile.name, email: profile.email, plan: profile.plan, goal: profile.goal, createdAt: profile.createdAt },
        supplements: toCamelArray(supps ?? []),
        protocols: toCamelArray(protos ?? []),
        protocolSupplements: toCamelArray(protoSupps ?? []),
        supplementLogs: toCamelArray(suppLogs ?? []),
        nutritionLogs: toCamelArray(nutLogs ?? []),
        dailyTargets: targets ? toCamel(targets) : null,
        inbodyLogs: toCamelArray(inbodyArr ?? []),
        healthLogs: toCamelArray(healthArr ?? []),
        mealSchedule: mealSched ? toCamel(mealSched) : null,
      };

      const format = (req.query.format as string) || "json";

      if (format === "csv") {
        function toCSV(rows: Record<string, any>[]): string {
          if (!rows || rows.length === 0) return "";
          const keys = Object.keys(rows[0]);
          const header = keys.join(",");
          const body = rows.map((row) =>
            keys.map((k) => {
              const v = row[k];
              if (v === null || v === undefined) return "";
              const s = String(v);
              return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            }).join(",")
          ).join("\n");
          return header + "\n" + body;
        }
        const csvExport = {
          exportDate: exportPayload.exportDate,
          user: toCSV([exportPayload.user]),
          supplements: toCSV(exportPayload.supplements),
          protocols: toCSV(exportPayload.protocols),
          protocolSupplements: toCSV(exportPayload.protocolSupplements),
          supplementLogs: toCSV(exportPayload.supplementLogs),
          nutritionLogs: toCSV(exportPayload.nutritionLogs),
          dailyTargets: exportPayload.dailyTargets ? toCSV([exportPayload.dailyTargets]) : "",
          inbodyLogs: toCSV(exportPayload.inbodyLogs),
          healthLogs: toCSV(exportPayload.healthLogs),
          mealSchedule: exportPayload.mealSchedule ? toCSV([exportPayload.mealSchedule]) : "",
        };
        return res.json(csvExport);
      }

      res.json(exportPayload);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
