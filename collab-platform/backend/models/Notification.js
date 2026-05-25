const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["invite", "mention", "commit", "pr_opened", "pr_merged", "pr_comment", "task_assigned", "project_star"],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  link: { type: String, default: "" },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
