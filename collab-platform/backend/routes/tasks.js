const express = require("express");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const Project = require("../models/Project");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/tasks/project/:projectId — all tasks grouped by status
router.get("/project/:projectId", async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate("assignee", "username cursorColor")
      .populate("reporter", "username cursorColor")
      .sort({ order: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tasks — create task
router.post("/", async (req, res) => {
  try {
    const { projectId, title, description, status, priority, assigneeId, labels, dueDate } = req.body;
    const task = await Task.create({
      project: projectId,
      title,
      description,
      status: status || "todo",
      priority: priority || "medium",
      assignee: assigneeId || null,
      reporter: req.user._id,
      labels: labels || [],
      dueDate: dueDate || null
    });

    // Notify assignee if different from reporter
    if (assigneeId && assigneeId !== req.user._id.toString()) {
      const project = await Project.findById(projectId);
      await Notification.create({
        recipient: assigneeId,
        sender: req.user._id,
        type: "task_assigned",
        title: "Task Assigned",
        message: `${req.user.username} assigned you: "${title}"`,
        project: projectId,
        link: `/editor/${projectId}?tab=tasks`
      });
    }

    await task.populate("assignee", "username cursorColor");
    await task.populate("reporter", "username cursorColor");
    res.status(201).json(task);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tasks/:id — update task (status, assignee, etc.)
router.put("/:id", async (req, res) => {
  try {
    const { title, description, status, priority, assigneeId, labels, dueDate, order } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigneeId !== undefined) updates.assignee = assigneeId || null;
    if (labels !== undefined) updates.labels = labels;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (order !== undefined) updates.order = order;

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("assignee", "username cursorColor")
      .populate("reporter", "username cursorColor");

    res.json(task);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tasks/:id/comment — add comment
router.post("/:id/comment", async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, text } } },
      { new: true }
    ).populate("assignee", "username cursorColor")
     .populate("reporter", "username cursorColor")
     .populate("comments.author", "username cursorColor");
    res.json(task);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
