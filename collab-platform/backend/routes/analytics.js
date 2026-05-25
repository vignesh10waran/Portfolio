const express = require("express");
const Version = require("../models/Version");
const File = require("../models/File");
const Project = require("../models/Project");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/project/:projectId
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Commit activity — last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const commits = await Version.find({
      project: projectId,
      createdAt: { $gte: thirtyDaysAgo }
    }).populate("author", "username cursorColor").sort({ createdAt: 1 });

    // Build heatmap: date -> count
    const heatmap = {};
    const linesByUser = {};
    commits.forEach(v => {
      const day = v.createdAt.toISOString().split("T")[0];
      heatmap[day] = (heatmap[day] || 0) + 1;
      const uname = v.author?.username || "unknown";
      if (!linesByUser[uname]) linesByUser[uname] = { added: 0, removed: 0, commits: 0, color: v.author?.cursorColor };
      linesByUser[uname].added += v.linesAdded || 0;
      linesByUser[uname].removed += v.linesRemoved || 0;
      linesByUser[uname].commits += 1;
    });

    // Language breakdown by file size
    const files = await File.find({ project: projectId });
    const langBreakdown = {};
    let totalSize = 0;
    files.forEach(f => {
      const lang = f.language || "unknown";
      const size = f.size || Buffer.byteLength(f.content || "", "utf8");
      langBreakdown[lang] = (langBreakdown[lang] || 0) + size;
      totalSize += size;
    });

    // Convert to percentages
    const languages = Object.entries(langBreakdown).map(([lang, size]) => ({
      language: lang,
      bytes: size,
      percentage: totalSize > 0 ? Math.round((size / totalSize) * 100) : 0
    })).sort((a, b) => b.bytes - a.bytes);

    // Recent activity feed (last 20 events)
    const recentCommits = await Version.find({ project: projectId })
      .populate("author", "username cursorColor")
      .populate("file", "name path")
      .sort({ createdAt: -1 })
      .limit(20);

    const totalCommits = await Version.countDocuments({ project: projectId });
    const totalLines = files.reduce((sum, f) => sum + (f.content || "").split("\n").length, 0);

    res.json({
      heatmap,
      linesByUser: Object.entries(linesByUser).map(([username, data]) => ({ username, ...data })),
      languages,
      recentActivity: recentCommits,
      summary: {
        totalCommits,
        totalFiles: files.length,
        totalLines,
        totalSize,
        contributors: Object.keys(linesByUser).length
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/user — personal analytics
router.get("/user", async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [commits, projects, totalCommits] = await Promise.all([
      Version.find({ author: userId, createdAt: { $gte: thirtyDaysAgo } })
        .populate("project", "name language")
        .sort({ createdAt: -1 }),
      Project.find({ $or: [{ owner: userId }, { "collaborators.user": userId }] }),
      Version.countDocuments({ author: userId })
    ]);

    // Daily commit heatmap
    const heatmap = {};
    commits.forEach(v => {
      const day = v.createdAt.toISOString().split("T")[0];
      heatmap[day] = (heatmap[day] || 0) + 1;
    });

    // Lines contributed
    const linesAdded = commits.reduce((s, v) => s + (v.linesAdded || 0), 0);
    const linesRemoved = commits.reduce((s, v) => s + (v.linesRemoved || 0), 0);

    res.json({
      heatmap,
      totalCommits,
      last30DaysCommits: commits.length,
      linesAdded,
      linesRemoved,
      projectCount: projects.length,
      recentCommits: commits.slice(0, 10)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
