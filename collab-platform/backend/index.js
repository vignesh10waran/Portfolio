require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { initSocket } = require("./socket/socketManager");

const authRoutes        = require("./routes/auth");
const projectRoutes     = require("./routes/projects");
const fileRoutes        = require("./routes/files");
const versionRoutes     = require("./routes/versions");
const executionRoutes   = require("./routes/execution");
const dashboardRoutes   = require("./routes/dashboard");
const notificationRoutes= require("./routes/notifications");
const taskRoutes        = require("./routes/tasks");
const prRoutes          = require("./routes/pullrequests");
const analyticsRoutes   = require("./routes/analytics");
const searchRoutes      = require("./routes/search");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: ["http://localhost:5173","http://localhost:3000","http://localhost:4173"], credentials: true }));
app.use(express.json({ limit: "10mb" }));

const io = new Server(server, {
  cors: { origin: ["http://localhost:5173","http://localhost:3000","http://localhost:4173"], methods: ["GET","POST"], credentials: true },
  pingTimeout: 60000
});

app.use("/api/auth",          authRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/files",         fileRoutes);
app.use("/api/versions",      versionRoutes);
app.use("/api/execute",       executionRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tasks",         taskRoutes);
app.use("/api/pr",            prRoutes);
app.use("/api/analytics",     analyticsRoutes);
app.use("/api/search",        searchRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

initSocket(io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(process.env.PORT || 5000, () => console.log(`🚀 Server on port ${process.env.PORT || 5000}`));
  })
  .catch(err => { console.error("❌ MongoDB failed:", err.message); process.exit(1); });

module.exports = { io };
