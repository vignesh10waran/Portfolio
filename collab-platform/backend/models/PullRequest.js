const mongoose = require("mongoose");

const pullRequestSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "" },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["open", "merged", "closed"],
    default: "open"
  },
  sourceBranch: { type: String, default: "feature" },
  targetBranch: { type: String, default: "main" },
  fileChanges: [{
    file: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    fileName: String,
    oldContent: String,
    newContent: String,
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 }
  }],
  reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["approved", "changes_requested", "commented"], default: "commented" },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    line: Number,
    fileName: String,
    createdAt: { type: Date, default: Date.now }
  }],
  mergedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mergedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("PullRequest", pullRequestSchema);
