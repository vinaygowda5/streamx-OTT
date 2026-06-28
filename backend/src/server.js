const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
dotenv.config();

const app = express();

app.use(cors({ origin: ["https://streamx-ott.vercel.app","http://localhost:5173"], credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth",          require("./src/routes/auth"));
app.use("/api/users",         require("./src/routes/users"));
app.use("/api/content",       require("./src/routes/content"));
app.use("/api/subscriptions", require("./src/routes/subscriptions"));
app.use("/api/support",       require("./src/routes/support"));
app.use("/api/admin",         require("./src/routes/admin"));

app.get("/", (req,res) => res.json({ status:"StreamX Backend Running ✅" }));
app.use(require("./src/middleware/errorHandler"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StreamX backend running on port ${PORT}`));
