var express = require('express');
var router = express.Router();

const Trade = require("../models/Trade");
const InsightCalculator = require("../utils/insightCalculator");

// Middleware to check if logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Main insights page
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    if (trades.length === 0) {
      return res.render("insights", { 
        totalTrades: 0,
        summaryStats: null,
        error: "No trades found. Start adding trades to see insights."
      });
    }

    // Calculate summary stats
    let totalPL = 0, wins = 0, losses = 0;
    trades.forEach(t => {
      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      totalPL += pl;
      if (pl > 0) wins++;
      else if (pl < 0) losses++;
    });

    const summaryStats = {
      totalTrades: trades.length,
      totalPL: totalPL.toFixed(2),
      wins,
      losses,
      winRate: `${((wins / trades.length) * 100).toFixed(2)}%`,
      avgPL: (totalPL / trades.length).toFixed(2)
    };

    res.render("insights", { summaryStats, error: null });
  } catch (error) {
    res.render("insights", { 
      summaryStats: null,
      error: "Error loading insights"
    });
  }
});

// Detailed insights page with dropdown
router.get("/detailed", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });

    const questions = [
      // Discipline & Plan Execution
      { id: "discipline_stats", category: "Discipline & Plan Execution", question: "How many trades had both entry AND exit exactly as planned?" },
      { id: "plan_comparison", category: "Discipline & Plan Execution", question: "What is my average P/L when I followed the plan vs when I didn't?" },
      { id: "unplanned_exits", category: "Discipline & Plan Execution", question: "How often do unplanned exits reduce my potential profit?" },
      { id: "frequent_mistakes", category: "Discipline & Plan Execution", question: "Which mistake occurs most frequently?" },
      { id: "losing_with_plan", category: "Discipline & Plan Execution", question: "What % of my losing trades still followed the plan correctly?" },
      
      // Strategy Effectiveness
      { id: "strategy_performance", category: "Strategy Effectiveness", question: "Which strategy gives the highest average P/L?" },
      { id: "strategy_volatility", category: "Strategy Effectiveness", question: "Which strategy has the best win rate when volatility is LOW / HIGH?" },
      { id: "strategy_trend", category: "Strategy Effectiveness", question: "Does my strategy perform better in Uptrend or Sideways markets?" },
      { id: "max_drawdown", category: "Strategy Effectiveness", question: "What is the max drawdown per strategy?" },
      
      // Timing & Market Context
      { id: "best_time", category: "Timing & Market Context", question: "At what time of day do my best trades occur?" },
      { id: "session_performance", category: "Timing & Market Context", question: "Do trades taken later in the session have worse outcomes?" },
      
      // Psychology & Emotional State
      { id: "emotion_performance", category: "Psychology & Emotional State", question: "What is my average P/L when I feel Calm vs Stressed?" },
      { id: "emotional_vs_logical", category: "Psychology & Emotional State", question: "Do trades taken when I feel great actually perform better?" },
      
      // Risk & Money Management
      { id: "risk_adjusted", category: "Risk & Money Management", question: "What risk % gives me the best risk-adjusted returns?" },
      { id: "stop_loss_impact", category: "Risk & Money Management", question: "How many profitable trades would have turned into losses if SL was not respected?" },
      
      // Bonus Advanced
      { id: "expectancy", category: "Bonus (Advanced)", question: "What is my expectancy per setup?" },
      { id: "costly_violation", category: "Bonus (Advanced)", question: "Which single rule violation costs me the most money overall?" }
    ];

    res.render("detailed-insights", { questions, selectedQuestion: null, result: null, error: null });
  } catch (error) {
    res.render("detailed-insights", { 
      questions: [],
      selectedQuestion: null,
      result: null,
      error: "Error loading insights"
    });
  }
});

// API endpoint for specific insight
router.get("/api/:questionId", isLoggedIn, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    
    if (trades.length === 0) {
      return res.json({ error: "No trades found for this analysis" });
    }

    const { questionId } = req.params;
    let result = null;
    let chartData = null;

    switch(questionId) {
      // Discipline
      case "discipline_stats":
        result = InsightCalculator.getDisciplineStats(trades);
        break;
      case "plan_comparison":
        result = InsightCalculator.getPlanVsNoplanComparison(trades);
        chartData = {
          type: "bar",
          labels: ["Planned", "Unplanned"],
          data: result ? [result.plannedAvgPL, result.unplannedAvgPL] : []
        };
        break;
      case "unplanned_exits":
        result = InsightCalculator.getUnplannedExitImpact(trades);
        break;
      case "frequent_mistakes":
        result = InsightCalculator.getMostFrequentMistake(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.mistakes.map(m => m.mistake),
            data: result.mistakes.map(m => m.count)
          };
        }
        break;
      case "losing_with_plan":
        result = InsightCalculator.getLosesWithPlanFollowing(trades);
        break;

      // Strategy
      case "strategy_performance":
        result = InsightCalculator.getStrategyPerformance(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(s => s.strategy),
            data: result.map(s => parseFloat(s.avgPL))
          };
        }
        break;
      case "strategy_volatility":
        result = InsightCalculator.getStrategyByVolatility(trades);
        if (result && result.length > 0) {
          chartData = {
            type: "table",
            data: result
          };
        }
        break;
      case "strategy_trend":
        result = InsightCalculator.getStrategyByMarketTrend(trades);
        if (result && result.length > 0) {
          chartData = {
            type: "table",
            data: result
          };
        }
        break;
      case "max_drawdown":
        result = InsightCalculator.getMaxDrawdownPerStrategy(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(s => s.strategy),
            data: result.map(s => parseFloat(s.maxDrawdown))
          };
        }
        break;

      // Timing
      case "best_time":
        result = InsightCalculator.getBestTimeOfDay(trades);
        if (result) {
          chartData = {
            type: "line",
            labels: result.map(t => t.hour),
            data: result.map(t => parseFloat(t.avgPL))
          };
        }
        break;
      case "session_performance":
        result = InsightCalculator.getLaterSessionPerformance(trades);
        break;

      // Emotion
      case "emotion_performance":
        result = InsightCalculator.getPerformanceByEmotion(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(e => e.emotion),
            data: result.map(e => parseFloat(e.avgPL))
          };
        }
        break;
      case "emotional_vs_logical":
        result = InsightCalculator.getEmotionalVsLogicalTrades(trades);
        break;

      // Risk
      case "risk_adjusted":
        result = InsightCalculator.getRiskAdjustedReturns(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(r => r.riskPercent),
            data: result.map(r => parseFloat(r.riskAdjustedReturn))
          };
        }
        break;
      case "stop_loss_impact":
        result = InsightCalculator.getStopLossRespectImpact(trades);
        break;

      // Advanced
      case "expectancy":
        result = InsightCalculator.getExpectancy(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(e => e.setup),
            data: result.map(e => parseFloat(e.expectancy))
          };
        }
        break;
      case "costly_violation":
        result = InsightCalculator.getMostCostlyViolation(trades);
        if (result) {
          chartData = {
            type: "bar",
            labels: result.map(v => v.violation),
            data: result.map(v => Math.abs(parseFloat(v.totalCost)))
          };
        }
        break;

      default:
        return res.json({ error: "Invalid question ID" });
    }

    res.json({ 
      result: result || { error: "No data available for this analysis" },
      chartData
    });
  } catch (error) {
    res.json({ error: "Error calculating insight: " + error.message });
  }
});

module.exports = router;
