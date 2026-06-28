const sb = require("../models/db");
const { ok, err } = require("../utils/response");

async function getAll(req, res) {
  const { data } = await sb.from("content").select("*").eq("is_active", true).order("created_at", { ascending: false });
  return ok(res, data || []);
}

async function getById(req, res) {
  const { data, error } = await sb.from("content").select("*").eq("id", req.params.id).single();
  if (error) return err(res, "Content not found", 404);
  // Increment views
  await sb.from("content").update({ views: (data.views || 0) + 1 }).eq("id", req.params.id);
  return ok(res, data);
}

async function search(req, res) {
  const q = req.query.q || "";
  const { data } = await sb.from("content").select("*").eq("is_active", true)
    .or(`title.ilike.%${q}%,genre.ilike.%${q}%,language.ilike.%${q}%,description.ilike.%${q}%`)
    .order("views", { ascending: false }).limit(30);
  return ok(res, data || []);
}

async function getTrending(req, res) {
  const { data } = await sb.from("content").select("*").eq("is_active", true).order("views", { ascending: false }).limit(10);
  return ok(res, data || []);
}

module.exports = { getAll, getById, search, getTrending };
