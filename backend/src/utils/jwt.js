const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "streamx_dev_secret";
const signToken  = p  => jwt.sign(p, SECRET, { expiresIn:"30d" });
const verifyToken = t => jwt.verify(t, SECRET);
module.exports = { signToken, verifyToken };
