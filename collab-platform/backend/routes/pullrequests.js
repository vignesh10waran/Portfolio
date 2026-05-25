const express = require("express");
const PullRequest = require("../models/PullRequest");
const File = require("../models/File");
const Notification = require("../models/Notification");
const Project = require("../models/Project");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/pr/project/:projectId
router.get("/project/:projectId", async (req, res) => {
  try {
    const prs = await PullRequest.find({ project: req.params.projectId })
      .populate("author", "username cursorColor")
      .populate("reviewers", "username cursorColor")
      .populate("reviews.reviewer", "username cursorColor")
      .populate("mergedBy", "username")
      .sort({ createdAt: -1 });
    res.json(prs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pr — open a PR with current file snapshot
router.post("/", async (req, res) => {
  try {
    const { projectId, title, description, fileIds, reviewerIds } = req.body;

    // Build file change diffs
    const fileChanges = [];
    for (const fid of (fileIds || [])) {
      const file = await File.findById(fid);
      if (file) {
        fileChanges.push({
          file: file._id,
          fileName: file.name,
          newContent: file.content,
          oldContent: "",
          linesAdded: file.content.split("\n").length,
          linesRemoved: 0
        });
      }
    }

    const pr = await PullRequest.create({
      project: projectId,
      title,
      description,
      author: req.user._id,
      fileChanges,
      reviewers: reviewerIds || []
    });

    // Notify reviewers
    const project = await Project.findById(projectId);
    for (const rid of (reviewerIds || [])) {
      await Notification.create({
        recipient: rid,
        sender: req.user._id,
        type: "pr_opened",
        title: "Pull Request Review Requested",
        message: `${req.user.username} opened PR: "${title}"`,
        project: projectId,
        link: `/editor/${projectId}?tab=pr`
      });
    }

    await pr.populate("author", "username cursorColor");
    res.status(201).json(pr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pr/:id/review — submit review
router.post("/:id/review", async (req, res) => {
  try {
    const { status, comment } = req.body;
    const pr = await PullRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ error: "PR not found" });

    pr.reviews.push({ reviewer: req.user._id, status, comment });
    await pr.save();

    await Notification.create({
      recipient: pr.author,
      sender: req.user._id,
      type: "pr_comment",
      title: `PR ${status === "approved" ? "Approved" : "Review Requested"}`,
      message: `${req.user.username} reviewed your PR: "${pr.title}"`,
      project: pr.project,
      link: `/editor/${pr.project}?tab=pr`
    });

    await pr.populate("author", "username cursorColor");
    await pr.populate("reviews.reviewer", "username cursorColor");
    res.json(pr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pr/:id/merge — merge PR (apply file content)
router.post("/:id/merge", async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.id).populate("fileChanges.file");
    if (!pr) return res.status(404).json({ error: "PR not found" });
    if (pr.status !== "open") return res.status(400).json({ error: "PR already closed" });

    // Apply each file change
    for (const change of pr.fileChanges) {
      if (change.file) {
        await File.findByIdAndUpdate(change.file._id || change.file, {
          content: change.newContent,
          lastEditedBy: req.user._id,
          lastEditedAt: new Date()
        });
      }
    }

    pr.status = "merged";
    pr.mergedBy = req.user._id;
    pr.mergedAt = new Date();
    await pr.save();

    await Notification.create({
      recipient: pr.author,
      sender: req.user._id,
      type: "pr_merged",
      title: "Pull Request Merged",
      message: `${req.user.username} merged your PR: "${pr.title}"`,
      project: pr.project,
      link: `/editor/${pr.project}?tab=pr`
    });

    res.json(pr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pr/:id/close
router.put("/:id/close", async (req, res) => {
  try {
    const pr = await PullRequest.findByIdAndUpdate(req.params.id, { status: "closed" }, { new: true });
    res.json(pr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
