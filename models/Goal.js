const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["Daily", "Monthly", "Yearly"],
    required: true
  },
  targetProfit: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ""
  },
  active: {
    type: Boolean,
    default: true
  },
  currentProgress: {
    type: Number,
    default: 0
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick queries
goalSchema.index({ user: 1, type: 1, active: 1 });

module.exports = mongoose.model("Goal", goalSchema);
