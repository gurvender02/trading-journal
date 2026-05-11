const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  stockName: String,
  tradeType: String, // Buy / Sell
  entryPrice: Number,
  exitPrice: Number,
  quantity: Number,
  strategy: {
    type: String,
    enum: [
      "Momentum",
      "Mean Reversion",
      "Breakout",
      "Trend Following",
      "Support/Resistance",
      "Moving Averages",
      "RSI Oversold/Overbought",
      "MACD Crossover",
      "Bollinger Bands",
      "Swing Trading",
      "Day Trading",
      "Scalping",
      "Options Strategy",
      "Other"
    ],
    default: "Other"
  },
  emotion: String,
  notes: String,
  tradeDateTime: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Strategy & Market Context
  setupType: {
    type: String,
    default: null
  },
  marketTrend: {
    type: String,
    enum: [null, "Up", "Down", "Sideways"],
    default: null
  },
  volatility: {
    type: String,
    enum: [null, "Low", "Medium", "High"],
    default: null
  },

  // Risk & Execution
  stopLoss: {
    type: Number,
    default: null
  },
  riskPercent: {
    type: Number,
    default: null
  },
  entryQuality: {
    type: String,
    enum: [null, "Planned", "Early", "Late", "Emotional"],
    default: null
  },
  exitQuality: {
    type: String,
    enum: [null, "Planned", "Early", "Late", "Emotional"],
    default: null
  },

  // Emotion Tracking
  emotionBefore: {
    type: String,
    default: null
  },
  emotionDuring: {
    type: String,
    default: null
  },
  emotionAfter: {
    type: String,
    default: null
  },

  // Discipline & Behavior
  followedPlan: {
    type: Boolean,
    default: null
  },
  overTrading: {
    type: Boolean,
    default: null
  },
  revengeTrade: {
    type: Boolean,
    default: null
  },

  // Mistakes & Positives
  mistakes: {
    type: [String],
    default: []
  },
  goodActions: {
    type: [String],
    default: []
  },

  // Learning
  learningNote: {
    type: String,
    default: null
  },
  nextRule: {
    type: String,
    default: null
  }
});

tradeSchema.index({ user: 1, tradeDateTime: -1 });
tradeSchema.index({ user: 1, strategy: 1 });

module.exports = mongoose.model("Trade", tradeSchema);
