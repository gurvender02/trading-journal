var express = require('express');
var router = express.Router();

const passport = require("passport");
const User = require("../models/User");
const Trade = require("../models/Trade");

// Helper function to calculate P/L safely and consistently
function calculatePL(trade) {
  const entryPrice = Number(trade.entryPrice);
  const exitPrice = Number(trade.exitPrice);
  const quantity = Number(trade.quantity);
  
  if (isNaN(entryPrice) || isNaN(exitPrice) || isNaN(quantity)) {
    return 0;
  }
  
  if (trade.tradeType === "Buy") {
    return (exitPrice - entryPrice) * quantity;
  } else if (trade.tradeType === "Sell") {
    return (entryPrice - exitPrice) * quantity;
  }
  
  return 0;
}

// Helper function to validate numeric input
function validateTrade(trade) {
  const errors = [];
  
  if (!trade.stockName || trade.stockName.trim() === '') {
    errors.push('Stock name is required');
  }
  
  const entryPrice = Number(trade.entryPrice);
  if (isNaN(entryPrice) || entryPrice <= 0) {
    errors.push('Entry price must be a positive number');
  }
  
  const exitPrice = Number(trade.exitPrice);
  if (isNaN(exitPrice) || exitPrice <= 0) {
    errors.push('Exit price must be a positive number');
  }
  
  const quantity = Number(trade.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }
  
  return errors;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Trading Journal' });
});

// Register
router.get("/register", (req, res) => {
  res.render("register", { error: null });
});

router.post("/register", async (req, res) => {
  try {
    // Validation
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.render("register", { error: "All fields are required" });
    }

    if (req.body.password.length < 6) {
      return res.render("register", { error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.render("register", { error: "Username already exists" });
    }

    // Register the user
    const user = await User.register(
      new User({ username: req.body.username, email: req.body.email }),
      req.body.password
    );

    // Login the user
    req.login(user, (err) => {
      if (err) {
        return res.render("register", { error: "Login failed after registration" });
      }
      res.redirect("/dashboard");
    });
  } catch (err) {
    res.render("register", { error: err.message || "Registration failed" });
  }
});

// Login
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
  })
);

// Logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Logout failed");
    res.redirect("/");
  });
});

// Authentication middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Dashboard
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    let totalPL = 0;
    let wins = 0;
    let losses = 0;
    let winRate = 0;
    
    trades.forEach(trade => {
      const pl = calculatePL(trade);
      totalPL += pl;
      if (pl > 0) wins++;
      else if (pl < 0) losses++;
    });

    if (trades.length > 0) {
      winRate = ((wins / trades.length) * 100).toFixed(2);
    }
    
    res.render("dashboard", { 
      totalPL: totalPL.toFixed(2), 
      wins, 
      losses,
      winRate,
      totalTrades: trades.length,
      error: null 
    });
  } catch (error) {
    res.render("dashboard", { 
      totalPL: 0, 
      wins: 0, 
      losses: 0,
      winRate: 0,
      totalTrades: 0,
      error: "Error loading dashboard"
    });
  }
});

// Add Trade Form
router.get("/add-trade", isLoggedIn, (req, res) => {
  res.render("add-trade", { error: null, success: null });
});

// Add Trade POST
router.post("/add-trade", isLoggedIn, async (req, res) => {
  try {
    // Validation
    const validationErrors = validateTrade(req.body);
    if (validationErrors.length > 0) {
      return res.render("add-trade", { 
        error: validationErrors.join(', '),
        success: null
      });
    }

    // Helper function to convert form checkbox to boolean
    const toBoolean = (value) => {
      return value === 'on' || value === 'true' || value === true;
    };

    // Helper function to safely convert to number, return null if NaN
    const toNumber = (value) => {
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    // Helper function to convert string to array
    const toArray = (value) => {
      if (Array.isArray(value)) return value.filter(v => v);
      if (!value) return [];
      return value.split(',').map(v => v.trim()).filter(v => v);
    };

    const trade = new Trade({
      user: req.user._id,
      stockName: req.body.stockName.trim().toLowerCase(),
      tradeType: req.body.tradeType,
      entryPrice: Number(req.body.entryPrice),
      exitPrice: Number(req.body.exitPrice),
      quantity: Number(req.body.quantity),
      strategy: req.body.strategy,
      emotion: req.body.emotion,
      notes: req.body.notes || '',
      tradeDateTime: new Date(req.body.tradeDateTime),

      // Strategy & Market Context
      setupType: req.body.setupType || null,
      marketTrend: req.body.marketTrend || null,
      volatility: req.body.volatility || null,

      // Risk & Execution
      stopLoss: toNumber(req.body.stopLoss),
      riskPercent: toNumber(req.body.riskPercent),
      entryQuality: req.body.entryQuality || null,
      exitQuality: req.body.exitQuality || null,

      // Emotion Tracking
      emotionBefore: req.body.emotionBefore || null,
      emotionDuring: req.body.emotionDuring || null,
      emotionAfter: req.body.emotionAfter || null,

      // Discipline & Behavior
      followedPlan: req.body.followedPlan !== undefined ? toBoolean(req.body.followedPlan) : null,
      overTrading: req.body.overTrading !== undefined ? toBoolean(req.body.overTrading) : null,
      revengeTrade: req.body.revengeTrade !== undefined ? toBoolean(req.body.revengeTrade) : null,

      // Mistakes & Positives
      mistakes: toArray(req.body.mistakes),
      goodActions: toArray(req.body.goodActions),

      // Learning
      learningNote: req.body.learningNote || null,
      nextRule: req.body.nextRule || null
    });

    await trade.save();
    res.render("add-trade", { 
      error: null,
      success: "Trade added successfully!"
    });
  } catch (error) {
    res.render("add-trade", { 
      error: "Error adding trade: " + error.message,
      success: null
    });
  }
});

// View Trades
router.get("/trades", isLoggedIn, async (req, res) => {
  try {
    const { strategy, startDate, endDate } = req.query;
    
    let query = { user: req.user._id };
    
    if (strategy && strategy !== "all") {
      query.strategy = strategy;
    }
    
    if (startDate || endDate) {
      query.tradeDateTime = {};
      if (startDate) query.tradeDateTime.$gte = new Date(startDate);
      if (endDate) query.tradeDateTime.$lte = new Date(endDate);
    }
    
    const trades = await Trade.find(query).sort({ tradeDateTime: -1 });
    const strategies = await Trade.distinct("strategy", { user: req.user._id });
    
    res.render("trades", { trades, strategies, error: null, selectedStrategy: strategy || "all", startDate: startDate || "", endDate: endDate || "" });
  } catch (error) {
    res.render("trades", { 
      trades: [],
      strategies: [],
      error: "Error loading trades",
      selectedStrategy: "all",
      startDate: "",
      endDate: ""
    });
  }
});

// Delete Trade
router.post("/trade/:id/delete", isLoggedIn, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    
    if (trade.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    await Trade.findByIdAndDelete(req.params.id);
    res.redirect("/trades");
  } catch (error) {
    res.status(500).json({ error: "Error deleting trade" });
  }
});

// === ANALYTICS API ROUTES ===

// Strategy Performance Analytics
router.get("/api/analytics/strategy-performance", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    const strategyStats = {};
    
    trades.forEach(trade => {
      const strategy = trade.strategy || "Other";
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { wins: 0, losses: 0, totalPL: 0, count: 0 };
      }
      
      const pl = calculatePL(trade);
      strategyStats[strategy].count++;
      strategyStats[strategy].totalPL += pl;
      if (pl > 0) strategyStats[strategy].wins++;
      else if (pl < 0) strategyStats[strategy].losses++;
    });
    
    res.json(strategyStats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching strategy analytics" });
  }
});

// Emotion vs P/L Analytics
router.get("/api/analytics/emotion-performance", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    const emotionStats = {};
    
    trades.forEach(trade => {
      const emotion = trade.emotion || "Unknown";
      if (!emotionStats[emotion]) {
        emotionStats[emotion] = { count: 0, totalPL: 0, avgPL: 0 };
      }
      
      const pl = calculatePL(trade);
      emotionStats[emotion].count++;
      emotionStats[emotion].totalPL += pl;
    });
    
    // Calculate averages
    Object.keys(emotionStats).forEach(emotion => {
      emotionStats[emotion].avgPL = 
        emotionStats[emotion].totalPL / emotionStats[emotion].count;
    });
    
    res.json(emotionStats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching emotion analytics" });
  }
});

// Mistakes Analytics
router.get("/api/analytics/mistakes", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    const mistakeCounts = {};
    
    trades.forEach(trade => {
      if (trade.mistakes && Array.isArray(trade.mistakes)) {
        trade.mistakes.forEach(mistake => {
          mistakeCounts[mistake] = (mistakeCounts[mistake] || 0) + 1;
        });
      }
    });
    
    res.json(mistakeCounts);
  } catch (error) {
    res.status(500).json({ error: "Error fetching mistakes analytics" });
  }
});

// Plan Adherence Analytics
router.get("/api/analytics/plan-adherence", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    let followedPlan = 0;
    let didNotFollowPlan = 0;
    
    trades.forEach(trade => {
      if (trade.followedPlan === true) followedPlan++;
      else if (trade.followedPlan === false) didNotFollowPlan++;
    });
    
    res.json({
      followedPlan,
      didNotFollowPlan,
      total: followedPlan + didNotFollowPlan
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching plan adherence analytics" });
  }
});

// Monthly P/L Trend
router.get("/api/analytics/monthly-trend", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    const monthlyStats = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.tradeDateTime);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = 0;
      }
      
      monthlyStats[monthKey] += calculatePL(trade);
    });
    
    res.json(monthlyStats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching monthly trend analytics" });
  }
});

// Discipline Metrics
router.get("/api/analytics/discipline", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    const metrics = {
      followedPlan: 0,
      overTrading: 0,
      revengeTrade: 0,
      total: 0
    };
    
    trades.forEach(trade => {
      metrics.total++;
      if (trade.followedPlan === true) metrics.followedPlan++;
      if (trade.overTrading === true) metrics.overTrading++;
      if (trade.revengeTrade === true) metrics.revengeTrade++;
    });
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Error fetching discipline analytics" });
  }
});

// Insights Dashboard View
router.get("/insights", isLoggedIn, (req, res) => {
  res.render("insights", { error: null });
});

module.exports = router;
