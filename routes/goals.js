var express = require('express');
var router = express.Router();
const Goal = require("../models/Goal");
const Trade = require("../models/Trade");

// Middleware to check if logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Calculate profit for a given date range
async function calculateProfitForRange(userId, type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate;
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  if (type === 'Daily') {
    startDate = new Date(today);
  } else if (type === 'Monthly') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (type === 'Yearly') {
    startDate = new Date(today.getFullYear(), 0, 1);
  }

  const trades = await Trade.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  });

  const totalProfit = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
  return Math.round(totalProfit * 100) / 100; // Round to 2 decimals
}

// GET all goals for user
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Calculate current progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const currentProgress = await calculateProfitForRange(req.user._id, goal.type);
        const progressPercentage = Math.min(100, Math.round((currentProgress / goal.targetProfit) * 100));
        
        return {
          ...goal.toObject(),
          currentProgress,
          progressPercentage: isFinite(progressPercentage) ? progressPercentage : 0
        };
      })
    );

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new goal
router.post("/create", isLoggedIn, async (req, res) => {
  try {
    const { type, targetProfit, note } = req.body;

    if (!['Daily', 'Monthly', 'Yearly'].includes(type)) {
      return res.status(400).json({ error: "Invalid goal type" });
    }

    if (!targetProfit || targetProfit <= 0) {
      return res.status(400).json({ error: "Target profit must be greater than 0" });
    }

    // Check if user already has an active goal of this type
    const existingGoal = await Goal.findOne({
      user: req.user._id,
      type: type,
      active: true
    });

    if (existingGoal) {
      return res.status(400).json({ error: `You already have an active ${type} goal` });
    }

    const currentProgress = await calculateProfitForRange(req.user._id, type);
    
    const newGoal = new Goal({
      user: req.user._id,
      type: type,
      targetProfit: parseFloat(targetProfit),
      note: note || "",
      active: true,
      currentProgress: currentProgress,
      progressPercentage: Math.min(100, Math.round((currentProgress / parseFloat(targetProfit)) * 100))
    });

    await newGoal.save();
    res.json({ success: "Goal created successfully", goal: newGoal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a goal
router.post("/update/:goalId", isLoggedIn, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { type, targetProfit, note, active } = req.body;

    if (type && !['Daily', 'Monthly', 'Yearly'].includes(type)) {
      return res.status(400).json({ error: "Invalid goal type" });
    }

    if (targetProfit && targetProfit <= 0) {
      return res.status(400).json({ error: "Target profit must be greater than 0" });
    }

    const updateData = {};
    if (targetProfit) updateData.targetProfit = parseFloat(targetProfit);
    if (note !== undefined) updateData.note = note;
    if (active !== undefined) updateData.active = active === 'true' || active === true;

    const updatedGoal = await Goal.findByIdAndUpdate(goalId, updateData, { new: true });

    if (!updatedGoal || updatedGoal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({ success: "Goal updated successfully", goal: updatedGoal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a goal
router.post("/delete/:goalId", isLoggedIn, async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await Goal.findById(goalId);
    if (!goal || goal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Goal.findByIdAndDelete(goalId);
    res.json({ success: "Goal deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET progress for dashboard (active goals with current progress)
router.get("/progress", isLoggedIn, async (req, res) => {
  try {
    const activeGoals = await Goal.find({ user: req.user._id, active: true });
    
    const goalsWithProgress = await Promise.all(
      activeGoals.map(async (goal) => {
        const currentProgress = await calculateProfitForRange(req.user._id, goal.type);
        const progressPercentage = Math.min(100, Math.round((currentProgress / goal.targetProfit) * 100));
        const remaining = Math.max(0, goal.targetProfit - currentProgress);

        return {
          _id: goal._id,
          type: goal.type,
          targetProfit: goal.targetProfit,
          currentProgress,
          progressPercentage: isFinite(progressPercentage) ? progressPercentage : 0,
          remaining,
          note: goal.note
        };
      })
    );

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
