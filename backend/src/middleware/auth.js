const { verifyToken } = require("../utils/jwt");
const { err } = require("../utils/response");

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return err(res, "No token provided", 401);
  try {
    req.user = verifyToken(token);
    next();
  } catch(e) {
    return err(res, "Invalid or expired token", 401);
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return err(res, "Admin access only", 403);
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
