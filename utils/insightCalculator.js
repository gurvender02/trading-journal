// Comprehensive Trading Insights Calculator

class InsightCalculator {
  /**
   * DISCIPLINE & PLAN EXECUTION
   */

  // Q1: How many trades had both entry AND exit exactly as planned?
  static getDisciplineStats(trades) {
    if (trades.length === 0) return null;

    const plannedTrades = trades.filter(t => t.followedPlan === true);
    const plannedExecution = trades.filter(t => t.entryQuality === "Planned" && t.exitQuality === "Planned");

    const perfectTrades = plannedTrades.length;
    const perfectExecutionRate = ((perfectTrades / trades.length) * 100).toFixed(2);

    return {
      totalTrades: trades.length,
      perfectTrades,
      perfectExecutionRate: `${perfectExecutionRate}%`,
      imperfectTrades: trades.length - perfectTrades
    };
  }

  // Q2: Average P/L when followed plan vs didn't
  static getPlanVsNoplanComparison(trades) {
    if (trades.length === 0) return null;

    const plannedTrades = trades.filter(t => t.followedPlan === true);
    const unplannedTrades = trades.filter(t => t.followedPlan === false);
    const unknownTrades = trades.filter(t => t.followedPlan === null);

    const calcAvgPL = (tradeArray) => {
      if (tradeArray.length === 0) return 0;
      const totalPL = tradeArray.reduce((sum, t) => {
        let pl = (t.exitPrice - t.entryPrice) * t.quantity;
        if (t.tradeType === "Sell") pl = -pl;
        return sum + pl;
      }, 0);
      return (totalPL / tradeArray.length).toFixed(2);
    };

    return {
      plannedAvgPL: parseFloat(calcAvgPL(plannedTrades)),
      unplannedAvgPL: parseFloat(calcAvgPL(unplannedTrades)),
      unknownAvgPL: parseFloat(calcAvgPL(unknownTrades)),
      plannedCount: plannedTrades.length,
      unplannedCount: unplannedTrades.length,
      difference: (parseFloat(calcAvgPL(plannedTrades)) - parseFloat(calcAvgPL(unplannedTrades))).toFixed(2)
    };
  }

  // Q3: How often do unplanned exits reduce profit?
  static getUnplannedExitImpact(trades) {
    if (trades.length === 0) return null;

    const unplannedExits = trades.filter(t => t.exitQuality && t.exitQuality !== "Planned");
    
    if (unplannedExits.length === 0) return null;

    let reducedProfits = 0;
    let maintainedProfits = 0;

    unplannedExits.forEach(t => {
      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      if (pl > 0) maintainedProfits++;
      else reducedProfits++;
    });

    return {
      totalUnplannedExits: unplannedExits.length,
      reducedProfit: reducedProfits,
      stillProfitable: maintainedProfits,
      reduceProfitRate: `${((reducedProfits / unplannedExits.length) * 100).toFixed(2)}%`
    };
  }

  // Q4: Most frequent mistake
  static getMostFrequentMistake(trades) {
    if (trades.length === 0) return null;

    const mistakeCount = {};
    trades.forEach(t => {
      if (t.mistakes && Array.isArray(t.mistakes)) {
        t.mistakes.forEach(mistake => {
          mistakeCount[mistake] = (mistakeCount[mistake] || 0) + 1;
        });
      }
    });

    if (Object.keys(mistakeCount).length === 0) return null;

    const sorted = Object.entries(mistakeCount).sort((a, b) => b[1] - a[1]);
    
    return {
      mistakes: sorted.map(([mistake, count]) => ({
        mistake,
        count,
        percentage: `${((count / trades.length) * 100).toFixed(2)}%`
      }))
    };
  }

  // Q5: % of losing trades that still followed plan
  static getLosesWithPlanFollowing(trades) {
    if (trades.length === 0) return null;

    const losingTrades = trades.filter(t => {
      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      return pl < 0;
    });

    if (losingTrades.length === 0) return null;

    const losesWithPlan = losingTrades.filter(t => t.followedPlan === true);

    return {
      totalLoses: losingTrades.length,
      losesWithPlan: losesWithPlan.length,
      percentageWithPlan: `${((losesWithPlan.length / losingTrades.length) * 100).toFixed(2)}%`,
      note: "Loss ≠ Bad Trade - Plan was followed correctly"
    };
  }

  /**
   * STRATEGY EFFECTIVENESS
   */

  // Q1: Which strategy gives highest average P/L?
  static getStrategyPerformance(trades) {
    if (trades.length === 0) return null;

    const strategyStats = {};

    trades.forEach(t => {
      if (!strategyStats[t.strategy]) {
        strategyStats[t.strategy] = {
          trades: [],
          wins: 0,
          losses: 0,
          totalPL: 0
        };
      }

      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      strategyStats[t.strategy].trades.push(t);
      strategyStats[t.strategy].totalPL += pl;

      if (pl > 0) strategyStats[t.strategy].wins++;
      else if (pl < 0) strategyStats[t.strategy].losses++;
    });

    const results = Object.entries(strategyStats).map(([strategy, stats]) => ({
      strategy,
      totalTrades: stats.trades.length,
      avgPL: (stats.totalPL / stats.trades.length).toFixed(2),
      totalPL: stats.totalPL.toFixed(2),
      winRate: `${((stats.wins / stats.trades.length) * 100).toFixed(2)}%`,
      wins: stats.wins,
      losses: stats.losses
    }));

    return results.sort((a, b) => parseFloat(b.avgPL) - parseFloat(a.avgPL));
  }

  // Q2: Strategy performance by volatility
  static getStrategyByVolatility(trades) {
    if (trades.length === 0) return null;

    const strategyVolatility = {};

    trades.forEach(t => {
      if (t.volatility) {
        const key = `${t.strategy}_${t.volatility}`;
        if (!strategyVolatility[key]) {
          strategyVolatility[key] = {
            strategy: t.strategy,
            volatility: t.volatility,
            trades: [],
            wins: 0,
            losses: 0,
            totalPL: 0
          };
        }

        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        strategyVolatility[key].trades.push(t);
        strategyVolatility[key].totalPL += pl;

        if (pl > 0) strategyVolatility[key].wins++;
        else if (pl < 0) strategyVolatility[key].losses++;
      }
    });

    const results = Object.values(strategyVolatility).map(stats => ({
      strategy: stats.strategy,
      volatility: stats.volatility,
      totalTrades: stats.trades.length,
      winRate: `${((stats.wins / stats.trades.length) * 100).toFixed(2)}%`,
      avgPL: (stats.totalPL / stats.trades.length).toFixed(2),
      wins: stats.wins,
      losses: stats.losses
    }));

    return results.length > 0 ? results : null;
  }

  // Q3: Performance in different market trends
  static getStrategyByMarketTrend(trades) {
    if (trades.length === 0) return null;

    const trendPerformance = {};

    trades.forEach(t => {
      if (t.marketTrend) {
        const key = `${t.strategy}_${t.marketTrend}`;
        if (!trendPerformance[key]) {
          trendPerformance[key] = {
            strategy: t.strategy,
            trend: t.marketTrend,
            trades: [],
            wins: 0,
            losses: 0,
            totalPL: 0
          };
        }

        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        trendPerformance[key].trades.push(t);
        trendPerformance[key].totalPL += pl;

        if (pl > 0) trendPerformance[key].wins++;
        else if (pl < 0) trendPerformance[key].losses++;
      }
    });

    const results = Object.values(trendPerformance).map(stats => ({
      strategy: stats.strategy,
      trend: stats.trend,
      totalTrades: stats.trades.length,
      winRate: `${((stats.wins / stats.trades.length) * 100).toFixed(2)}%`,
      avgPL: (stats.totalPL / stats.trades.length).toFixed(2),
      wins: stats.wins,
      losses: stats.losses
    }));

    return results.length > 0 ? results : null;
  }

  // Q4: Max drawdown per strategy
  static getMaxDrawdownPerStrategy(trades) {
    if (trades.length === 0) return null;

    const strategyDrawdown = {};

    trades.forEach(t => {
      if (!strategyDrawdown[t.strategy]) {
        strategyDrawdown[t.strategy] = [];
      }
      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      strategyDrawdown[t.strategy].push(pl);
    });

    const results = Object.entries(strategyDrawdown).map(([strategy, pls]) => {
      let runningBalance = 0;
      let maxBalance = 0;
      let maxDrawdown = 0;

      pls.forEach(pl => {
        runningBalance += pl;
        if (runningBalance > maxBalance) maxBalance = runningBalance;
        const drawdown = maxBalance - runningBalance;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      });

      return {
        strategy,
        maxDrawdown: maxDrawdown.toFixed(2),
        tradesInSequence: pls.length
      };
    });

    return results;
  }

  /**
   * TIMING & MARKET CONTEXT
   */

  // Q1: Best time of day for trades
  static getBestTimeOfDay(trades) {
    if (trades.length === 0) return null;

    const hourStats = {};

    trades.forEach(t => {
      const hour = new Date(t.tradeDateTime).getHours();
      if (!hourStats[hour]) {
        hourStats[hour] = {
          trades: [],
          wins: 0,
          losses: 0,
          totalPL: 0
        };
      }

      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      hourStats[hour].trades.push(t);
      hourStats[hour].totalPL += pl;

      if (pl > 0) hourStats[hour].wins++;
      else if (pl < 0) hourStats[hour].losses++;
    });

    const results = Object.entries(hourStats).map(([hour, stats]) => ({
      hour: `${hour}:00`,
      totalTrades: stats.trades.length,
      avgPL: (stats.totalPL / stats.trades.length).toFixed(2),
      winRate: `${((stats.wins / stats.trades.length) * 100).toFixed(2)}%`,
      wins: stats.wins,
      losses: stats.losses
    })).sort((a, b) => parseFloat(b.avgPL) - parseFloat(a.avgPL));

    return results.length > 0 ? results : null;
  }

  // Q2: Later trades performance
  static getLaterSessionPerformance(trades) {
    if (trades.length === 0) return null;

    const earlySession = trades.filter(t => {
      const hour = new Date(t.tradeDateTime).getHours();
      return hour < 12;
    });

    const lateSession = trades.filter(t => {
      const hour = new Date(t.tradeDateTime).getHours();
      return hour >= 12;
    });

    const calcStats = (tradeArray) => {
      if (tradeArray.length === 0) return null;
      let wins = 0, totalPL = 0;
      tradeArray.forEach(t => {
        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        if (pl > 0) wins++;
        totalPL += pl;
      });
      return {
        trades: tradeArray.length,
        avgPL: (totalPL / tradeArray.length).toFixed(2),
        winRate: `${((wins / tradeArray.length) * 100).toFixed(2)}%`,
        wins
      };
    };

    return {
      earlySession: calcStats(earlySession),
      lateSession: calcStats(lateSession),
      note: "Early = Before noon, Late = Noon onwards"
    };
  }

  /**
   * PSYCHOLOGY & EMOTIONAL STATE
   */

  // Q1: P/L by emotion
  static getPerformanceByEmotion(trades) {
    if (trades.length === 0) return null;

    const emotionStats = {};

    trades.forEach(t => {
      const emotion = t.emotionDuring || t.emotion || "Unknown";
      if (!emotionStats[emotion]) {
        emotionStats[emotion] = {
          trades: [],
          wins: 0,
          losses: 0,
          totalPL: 0
        };
      }

      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      emotionStats[emotion].trades.push(t);
      emotionStats[emotion].totalPL += pl;

      if (pl > 0) emotionStats[emotion].wins++;
      else if (pl < 0) emotionStats[emotion].losses++;
    });

    const results = Object.entries(emotionStats).map(([emotion, stats]) => ({
      emotion,
      totalTrades: stats.trades.length,
      avgPL: (stats.totalPL / stats.trades.length).toFixed(2),
      winRate: `${((stats.wins / stats.trades.length) * 100).toFixed(2)}%`,
      wins: stats.wins,
      losses: stats.losses
    })).sort((a, b) => parseFloat(b.avgPL) - parseFloat(a.avgPL));

    return results.length > 0 ? results : null;
  }

  // Q2: Emotional trades performance
  static getEmotionalVsLogicalTrades(trades) {
    if (trades.length === 0) return null;

    const emotionalTrades = trades.filter(t => 
      t.entryQuality === "Emotional" || t.revengeTrade === true || t.overTrading === true
    );

    const logicalTrades = trades.filter(t => 
      t.entryQuality === "Planned" && t.revengeTrade !== true && t.overTrading !== true
    );

    const calcStats = (tradeArray) => {
      if (tradeArray.length === 0) return null;
      let wins = 0, totalPL = 0;
      tradeArray.forEach(t => {
        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        if (pl > 0) wins++;
        totalPL += pl;
      });
      return {
        trades: tradeArray.length,
        avgPL: (totalPL / tradeArray.length).toFixed(2),
        winRate: `${((wins / tradeArray.length) * 100).toFixed(2)}%`,
        wins
      };
    };

    return {
      emotional: calcStats(emotionalTrades),
      logical: calcStats(logicalTrades),
      note: "Emotional = Revenge/Overtrading/Unplanned entry"
    };
  }

  /**
   * RISK & MONEY MANAGEMENT
   */

  // Q1: Best risk % for returns
  static getRiskAdjustedReturns(trades) {
    if (trades.length === 0) return null;

    const riskStats = {};

    trades.forEach(t => {
      if (t.riskPercent) {
        const riskBucket = `${t.riskPercent}%`;
        if (!riskStats[riskBucket]) {
          riskStats[riskBucket] = {
            trades: [],
            totalPL: 0,
            totalRisk: 0
          };
        }

        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        riskStats[riskBucket].trades.push(t);
        riskStats[riskBucket].totalPL += pl;
        riskStats[riskBucket].totalRisk += Math.abs((t.exitPrice - t.entryPrice) * t.quantity * (t.riskPercent / 100));
      }
    });

    const results = Object.entries(riskStats).map(([risk, stats]) => ({
      riskPercent: risk,
      totalTrades: stats.trades.length,
      totalPL: stats.totalPL.toFixed(2),
      riskAdjustedReturn: (stats.totalPL / Math.max(stats.totalRisk, 1)).toFixed(2)
    })).sort((a, b) => parseFloat(b.riskAdjustedReturn) - parseFloat(a.riskAdjustedReturn));

    return results.length > 0 ? results : null;
  }

  // Q2: SL respect impact
  static getStopLossRespectImpact(trades) {
    if (trades.length === 0) return null;

    const tradesWithSL = trades.filter(t => t.stopLoss);
    if (tradesWithSL.length === 0) return null;

    let savedByStop = 0;
    let totalSavings = 0;

    tradesWithSL.forEach(t => {
      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      if (pl < 0) {
        // Would this have been worse without SL?
        const potentialLoss = Math.abs((t.stopLoss - t.entryPrice) * t.quantity);
        const actualLoss = Math.abs(pl);
        if (actualLoss < potentialLoss) {
          savedByStop++;
          totalSavings += (potentialLoss - actualLoss);
        }
      }
    });

    return {
      tradesWithSL: tradesWithSL.length,
      tradesWhereStopHelped: savedByStop,
      totalSavings: totalSavings.toFixed(2),
      percentageHelped: `${((savedByStop / tradesWithSL.length) * 100).toFixed(2)}%`
    };
  }

  /**
   * EXPECTANCY & ADVANCED
   */

  // Q1: Expectancy per setup
  static getExpectancy(trades) {
    if (trades.length === 0) return null;

    const setupStats = {};

    trades.forEach(t => {
      const setup = t.setupType || "General";
      if (!setupStats[setup]) {
        setupStats[setup] = {
          wins: 0,
          losses: 0,
          totalWin: 0,
          totalLoss: 0,
          trades: 0
        };
      }

      const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
      setupStats[setup].trades++;

      if (pl > 0) {
        setupStats[setup].wins++;
        setupStats[setup].totalWin += pl;
      } else if (pl < 0) {
        setupStats[setup].losses++;
        setupStats[setup].totalLoss += Math.abs(pl);
      }
    });

    const results = Object.entries(setupStats).map(([setup, stats]) => {
      const winRate = stats.trades > 0 ? stats.wins / stats.trades : 0;
      const lossRate = stats.trades > 0 ? stats.losses / stats.trades : 0;
      const avgWin = stats.wins > 0 ? stats.totalWin / stats.wins : 0;
      const avgLoss = stats.losses > 0 ? stats.totalLoss / stats.losses : 0;
      const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

      return {
        setup,
        expectancy: expectancy.toFixed(2),
        winRate: `${(winRate * 100).toFixed(2)}%`,
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        totalTrades: stats.trades
      };
    });

    return results.length > 0 ? results : null;
  }

  // Q2: Most costly rule violation
  static getMostCostlyViolation(trades) {
    if (trades.length === 0) return null;

    const violationCost = {};

    trades.forEach(t => {
      if (t.mistakes && Array.isArray(t.mistakes)) {
        const pl = (t.exitPrice - t.entryPrice) * t.quantity * (t.tradeType === "Sell" ? -1 : 1);
        
        t.mistakes.forEach(mistake => {
          if (!violationCost[mistake]) {
            violationCost[mistake] = {
              count: 0,
              totalCost: 0,
              avgCost: 0
            };
          }
          violationCost[mistake].count++;
          violationCost[mistake].totalCost += pl;
        });
      }
    });

    const results = Object.entries(violationCost).map(([violation, stats]) => ({
      violation,
      occurrences: stats.count,
      totalCost: stats.totalCost.toFixed(2),
      avgCost: (stats.totalCost / stats.count).toFixed(2)
    })).sort((a, b) => Math.abs(parseFloat(b.totalCost)) - Math.abs(parseFloat(a.totalCost)));

    return results.length > 0 ? results : null;
  }
}

module.exports = InsightCalculator;
