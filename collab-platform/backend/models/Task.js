const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "", maxlength: 2000 },
  status: {
    type: String,
    enum: ["backlog", "todo", "in_progress", "review", "done"],
    default: "todo"
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  labels: [{ type: String }],
  dueDate: { type: Date },
  order: { type: Number, default: 0 },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

taskSchema.index({ project: 1, status: 1, order: 1 });

module.exports = mongoose.model("Task", taskSchema);
