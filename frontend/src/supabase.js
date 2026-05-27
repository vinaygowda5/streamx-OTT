import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbW16dm1lYm55enhyeWN1dWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjM0NzcsImV4cCI6MjA5NTM5OTQ3N30.khXzHByowmD2zWk0xW4DwdVfGrIsEq3O4SYj5twA6aU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── AUTH ─────────────────────────────────── */
export const auth = {

  // Send OTP to phone
  async sendOTP(phone) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
    });
    if (error) throw error;
    return data;
  },

  // Verify OTP
  async verifyOTP(phone, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throw error;
    return data;
  },

  // Get current user
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign out
  async signOut() {
    await supabase.auth.signOut();
  },
};

/* ── USERS ────────────────────────────────── */
export const users = {

  async getByPhone(phone) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();
    return data;
  },

  async getByEmail(email) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    return data;
  },

  async create(userData) {
    const { data, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  },
};

/* ── CONTENT ──────────────────────────────── */
export const content = {

  async getAll(filters = {}) {
    let query = supabase
      .from("content")
      .select("*")
      .eq("is_active", true);

    if (filters.genre)      query = query.eq("genre", filters.genre);
    if (filters.type)       query = query.eq("type", filters.type);
    if (filters.is_premium !== undefined) query = query.eq("is_premium", filters.is_premium);
    if (filters.is_featured) query = query.eq("is_featured", true);

    query = query.order("views", { ascending: false });

    const { data } = await query;
    return data || [];
  },

  async getFeatured() {
    const { data } = await supabase
      .from("content")
      .select("*")
      .eq("is_featured", true)
      .eq("is_active", true)
      .order("views", { ascending: false })
      .limit(5);
    return data || [];
  },

  async getTrending() {
    const { data } = await supabase
      .from("content")
      .select("*")
      .eq("is_active", true)
      .order("views", { ascending: false })
      .limit(10);
    return data || [];
  },

  async search(query) {
    const { data } = await supabase
      .from("content")
      .select("*")
      .eq("is_active", true)
      .ilike("title", `%${query}%`)
      .order("views", { ascending: false });
    return data || [];
  },

  async getById(id) {
    const { data } = await supabase
      .from("content")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      // Increment views
      await supabase
        .from("content")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", id);
    }
    return data;
  },
};

/* ── WATCHLIST ────────────────────────────── */
export const watchlist = {

  async get(userId) {
    const { data } = await supabase
      .from("watchlist")
      .select("*, content(*)")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    return data || [];
  },

  async add(userId, contentId) {
    const { data, error } = await supabase
      .from("watchlist")
      .insert({ user_id: userId, content_id: contentId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(userId, contentId) {
    await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("content_id", contentId);
  },

  async check(userId, contentId) {
    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .single();
    return !!data;
  },
};

/* ── WATCH HISTORY ────────────────────────── */
export const history = {

  async get(userId) {
    const { data } = await supabase
      .from("watch_history")
      .select("*, content(*)")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(20);
    return data || [];
  },

  async save(userId, contentId, progressSeconds, totalSeconds) {
    const progressPct = Math.round((progressSeconds / totalSeconds) * 100);
    const { data } = await supabase
      .from("watch_history")
      .upsert({
        user_id: userId,
        content_id: contentId,
        progress_seconds: progressSeconds,
        total_seconds: totalSeconds,
        progress_pct: progressPct,
        watched_at: new Date().toISOString(),
        completed_at: progressPct >= 95 ? new Date().toISOString() : null,
      }, { onConflict: "user_id,content_id" })
      .select()
      .single();
    return data;
  },

  async clear(userId) {
    await supabase
      .from("watch_history")
      .delete()
      .eq("user_id", userId);
  },
};

/* ── SUBSCRIPTIONS ────────────────────────── */
export const subscriptions = {

  async getCurrent(userId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data;
  },

  async create(userId, planId, amount, paymentId) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (planId === "plan_annual" ? 12 : 1));

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        amount,
        payment_id: paymentId,
        end_date: endDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update user plan
    await supabase
      .from("users")
      .update({ plan: planId })
      .eq("id", userId);

    return data;
  },

  async cancel(userId) {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");

    await supabase
      .from("users")
      .update({ plan: "free" })
      .eq("id", userId);
  },
};

/* ── NOTIFICATIONS ────────────────────────── */
export const notifications = {

  async get(userId) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data || [];
  },

  async markRead(id) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  },

  async markAllRead(userId) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  },

  async create(userId, type, title, message) {
    await supabase
      .from("notifications")
      .insert({ user_id: userId, type, title, message });
  },
};

/* ── PROFILES ─────────────────────────────── */
export const profiles = {

  async getAll(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    return data || [];
  },

  async create(userId, profileData) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ user_id: userId, ...profileData })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    await supabase.from("profiles").delete().eq("id", id);
  },
};

/* ── ADMIN ────────────────────────────────── */
export const adminDB = {

  async getStats() {
    const [users, content, subs, txns] = await Promise.all([
      supabase.from("users").select("id, plan, created_at", { count: "exact" }),
      supabase.from("content").select("id, views, is_active", { count: "exact" }),
      supabase.from("subscriptions").select("id, status, amount").eq("status", "active"),
      supabase.from("transactions").select("amount, status"),
    ]);

    const totalRevenue = (txns.data || [])
      .filter(t => t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalViews = (content.data || [])
      .reduce((sum, c) => sum + (c.views || 0), 0);

    return {
      totalUsers:    users.count || 0,
      totalContent:  content.count || 0,
      activeSubs:    subs.data?.length || 0,
      totalRevenue,
      totalViews,
    };
  },

  async getAllUsers() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  },

  async getAllContent() {
    const { data } = await supabase
      .from("content")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  },

  async addContent(contentData) {
    const { data, error } = await supabase
      .from("content")
      .insert(contentData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateContent(id, updates) {
    const { data, error } = await supabase
      .from("content")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteContent(id) {
    await supabase
      .from("content")
      .update({ is_active: false })
      .eq("id", id);
  },

  async suspendUser(id) {
    await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", id);
  },

  async getTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*, users(name, email)")
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  },
};