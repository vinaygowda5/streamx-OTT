module.exports = (error, req, res, next) => {
  console.error("Error:", error.message);
  res.status(500).json({ success: false, msg: "Internal server error" });
};
