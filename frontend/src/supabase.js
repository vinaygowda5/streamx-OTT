import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://rimmzvmebnyzxrycuubk.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbW16dm1lYm55enhyeWN1dWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjM0NzcsImV4cCI6MjA5NTM5OTQ3N30.khXzHByowmD2zWk0xW4DwdVfGrIsEq3O4SYj5twA6aU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── USERS ──────────────────────────────── */
export const db = {

  // Get user by phone
  async getUserByPhone(phone) {
    const { data } = await supabase.from("users").select("*").eq("phone", phone).single();
    return data;
  },

  // Get user by email
  async getUserByEmail(email) {
    const { data } = await supabase.from("users").select("*").eq("email", email).single();
    return data;
  },

  // Get user by ID
  async getUserById(id) {
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return data;
  },

  // Create user
  async createUser(userData) {
    const { data, error } = await supabase.from("users").insert(userData).select().single();
    if (error) throw error;
    return data;
  },

  // Update user
  async updateUser(id, updates) {
    const { data, error } = await supabase.from("users").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  /* ── CONTENT ──────────────────────────── */

  // Get all content
  async getContent(filters = {}) {
    let q = supabase.from("content").select("*").eq("is_active", true);
    if (filters.genre)       q = q.eq("genre", filters.genre);
    if (filters.type)        q = q.eq("type", filters.type);
    if (filters.is_featured) q = q.eq("is_featured", true);
    if (filters.is_premium !== undefined) q = q.eq("is_premium", filters.is_premium);
    if (filters.language)    q = q.eq("language", filters.language);
    q = q.order("views", { ascending: false });
    const { data } = await q;
    return data || [];
  },

  // Get featured content
  async getFeatured() {
    const { data } = await supabase.from("content").select("*").eq("is_featured", true).eq("is_active", true).order("views", { ascending: false }).limit(5);
    return data || [];
  },

  // Get trending
  async getTrending() {
    const { data } = await supabase.from("content").select("*").eq("is_active", true).order("views", { ascending: false }).limit(10);
    return data || [];
  },

  // Search content
  async searchContent(query) {
    const { data } = await supabase.from("content").select("*").eq("is_active", true).ilike("title", `%${query}%`).order("views", { ascending: false });
    return data || [];
  },

  // Get content by ID
  async getContentById(id) {
    const { data } = await supabase.from("content").select("*").eq("id", id).single();
    if (data) {
      await supabase.from("content").update({ views: (data.views || 0) + 1 }).eq("id", id);
    }
    return data;
  },

  /* ── WATCHLIST ────────────────────────── */

  async getWatchlist(userId) {
    const { data } = await supabase.from("watchlist").select("*, content(*)").eq("user_id", userId).order("added_at", { ascending: false });
    return data || [];
  },

  async addToWatchlist(userId, contentId) {
    const { data, error } = await supabase.from("watchlist").insert({ user_id: userId, content_id: contentId }).select().single();
    if (error) throw error;
    return data;
  },

  async removeFromWatchlist(userId, contentId) {
    await supabase.from("watchlist").delete().eq("user_id", userId).eq("content_id", contentId);
  },

  async isInWatchlist(userId, contentId) {
    const { data } = await supabase.from("watchlist").select("id").eq("user_id", userId).eq("content_id", contentId).single();
    return !!data;
  },

  /* ── WATCH HISTORY ────────────────────── */

  async getHistory(userId) {
    const { data } = await supabase.from("watch_history").select("*, content(*)").eq("user_id", userId).order("watched_at", { ascending: false }).limit(20);
    return data || [];
  },

  async saveProgress(userId, contentId, progressSeconds, totalSeconds) {
    const progressPct = Math.round((progressSeconds / totalSeconds) * 100);
    const { data } = await supabase.from("watch_history").upsert({
      user_id: userId, content_id: contentId,
      progress_seconds: progressSeconds, total_seconds: totalSeconds,
      progress_pct: progressPct, watched_at: new Date().toISOString(),
      completed_at: progressPct >= 95 ? new Date().toISOString() : null,
    }, { onConflict: "user_id,content_id" }).select().single();
    return data;
  },

  async clearHistory(userId) {
    await supabase.from("watch_history").delete().eq("user_id", userId);
  },

  /* ── PROFILES ─────────────────────────── */

  async getProfiles(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).order("created_at");
    return data || [];
  },

  async createProfile(userId, profileData) {
    const { data, error } = await supabase.from("profiles").insert({ user_id: userId, ...profileData }).select().single();
    if (error) throw error;
    return data;
  },

  async updateProfile(id, updates) {
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteProfile(id) {
    await supabase.from("profiles").delete().eq("id", id);
  },

  /* ── SUBSCRIPTIONS ────────────────────── */

  async getSubscription(userId) {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).single();
    return data;
  },

  async createSubscription(userId, planId, amount, paymentId) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (planId === "plan_annual" ? 12 : 1));
    const { data, error } = await supabase.from("subscriptions").insert({
      user_id: userId, plan_id: planId, status: "active",
      amount, payment_id: paymentId, end_date: endDate.toISOString(),
    }).select().single();
    if (error) throw error;
    await supabase.from("users").update({ plan: planId }).eq("id", userId);
    await supabase.from("transactions").insert({ user_id: userId, plan_id: planId, amount, status: "success", payment_id: paymentId });
    return data;
  },

  /* ── NOTIFICATIONS ────────────────────── */

  async getNotifications(userId) {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    return data || [];
  },

  async markNotifRead(id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  },

  async markAllNotifsRead(userId) {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
  },

  /* ── ADS ──────────────────────────────── */

  // Get ads for user based on plan and targeting
  async getAdsForUser(userId, type, contentGenre, userLanguage) {
    // Get user plan first
    const user = userId ? await db.getUserById(userId).catch(() => null) : null;
    const plan = user?.plan || "free";

    // Premium users get NO ads
    if (plan === "plan_premium" || plan === "plan_annual" || plan === "premium") {
      return [];
    }

    let q = supabase.from("ads").select("*").eq("is_active", true).eq("type", type).contains("target_plans", ["free"]);

    if (contentGenre) q = q.or(`target_genres.is.null,target_genres.cs.{${contentGenre}}`);

    q = q.order("priority").limit(1);
    const { data } = await q;
    return data || [];
  },

  // Track ad impression
  async trackAdImpression(adId, userId, event, watchedPct = 0, skipped = false, clicked = false) {
    await supabase.from("ad_impressions").insert({
      ad_id: adId, user_id: userId, impression_type: event,
      watched_pct: watchedPct, skipped, clicked,
    });
    // Update ad analytics
    await supabase.from("ad_analytics").insert({
      ad_id: adId, user_id: userId, event,
    });
  },

  /* ── ADMIN ────────────────────────────── */

  async getAdminStats() {
    const [usersRes, contentRes, subsRes, txnsRes, adsRes, impressionsRes] = await Promise.all([
      supabase.from("users").select("id, plan, created_at", { count: "exact" }),
      supabase.from("content").select("id, views, is_active", { count: "exact" }),
      supabase.from("subscriptions").select("id, status, amount").eq("status", "active"),
      supabase.from("transactions").select("amount, status"),
      supabase.from("ads").select("id, is_active", { count: "exact" }),
      supabase.from("ad_impressions").select("id, clicked, skipped, watched_pct", { count: "exact" }),
    ]);

    const totalRevenue = (txnsRes.data || []).filter(t => t.status === "success").reduce((s, t) => s + (t.amount || 0), 0);
    const totalViews   = (contentRes.data || []).reduce((s, c) => s + (c.views || 0), 0);
    const adImpressions = impressionsRes.count || 0;
    const adClicks      = (impressionsRes.data || []).filter(i => i.clicked).length;
    const adRevenue     = adClicks * 2; // ₹2 per click estimate

    return {
      totalUsers:    usersRes.count || 0,
      totalContent:  contentRes.count || 0,
      activeSubs:    subsRes.data?.length || 0,
      totalRevenue,
      totalViews,
      activeAds:     (adsRes.data || []).filter(a => a.is_active).length,
      adImpressions,
      adClicks,
      adRevenue,
    };
  },

  async getAllUsers() {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    return data || [];
  },

  async getAllContent() {
    const { data } = await supabase.from("content").select("*").order("created_at", { ascending: false });
    return data || [];
  },

  async getAllAds() {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    return data || [];
  },

  async addContent(contentData) {
    const { data, error } = await supabase.from("content").insert(contentData).select().single();
    if (error) throw error;
    return data;
  },

  async updateContent(id, updates) {
    const { data, error } = await supabase.from("content").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteContent(id) {
    await supabase.from("content").update({ is_active: false }).eq("id", id);
  },

  async suspendUser(id) {
    await supabase.from("users").update({ is_active: false }).eq("id", id);
  },

  async activateUser(id) {
    await supabase.from("users").update({ is_active: true }).eq("id", id);
  },

  async addAd(adData) {
    const { data, error } = await supabase.from("ads").insert(adData).select().single();
    if (error) throw error;
    return data;
  },

  async updateAd(id, updates) {
    const { data, error } = await supabase.from("ads").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async getTransactions() {
    const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
    return data || [];
  },

  async getAdAnalytics(adId) {
    const { data } = await supabase.from("ad_impressions").select("*").eq("ad_id", adId).order("created_at", { ascending: false });
    return data || [];
  },
};