const express = require("express");
const File = require("../models/File");
const Project = require("../models/Project");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/search?projectId=&q=
router.get("/", async (req, res) => {
  try {
    const { projectId, q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });

    const query = q.trim();
    const files = await File.find({
      project: projectId,
      isDirectory: false
    });

    const results = [];
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

    for (const file of files) {
      const lines = (file.content || "").split("\n");
      const matches = [];
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          matches.push({
            lineNumber: idx + 1,
            lineContent: line.trim(),
            matchStart: line.toLowerCase().indexOf(query.toLowerCase())
          });
          regex.lastIndex = 0;
        }
      });
      if (matches.length > 0) {
        results.push({
          file: { _id: file._id, name: file.name, path: file.path, language: file.language },
          matches: matches.slice(0, 10), // max 10 matches per file
          totalMatches: matches.length
        });
      }
    }

    res.json({ results, totalFiles: results.length, query });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
