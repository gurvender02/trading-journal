// Seeding script to add demo trades
const mongoose = require("mongoose");
const User = require("./models/User");
const Trade = require("./models/Trade");

mongoose.connect("mongodb://127.0.0.1:27017/trading-journal-db")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

const strategies = [
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
  "Options Strategy"
];

const emotions = ["Calm", "Fear", "Greed", "FOMO", "Confident"];
const marketTrends = ["Up", "Down", "Sideways"];
const volatilities = ["Low", "Medium", "High"];
const stocks = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NFLX", "NVDA", "AMD", "INTC"];

async function seedDatabase() {
  try {
    console.log("🔄 Starting seed process...");

    // Create or find admin user
    let user = await User.findOne({ username: "admin" });
    
    if (!user) {
      console.log("👤 Creating admin user...");
      user = new User({ username: "admin", email: "admin@demo.com" });
      await User.register(user, "admin123");
      console.log("✅ Admin user created successfully");
    } else {
      console.log("✅ Admin user already exists");
    }

    // Delete existing trades for this user
    await Trade.deleteMany({ user: user._id });
    console.log("🗑️  Cleared existing trades");

    // Generate 40 demo trades
    const trades = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const tradeDate = new Date(now);
      tradeDate.setDate(tradeDate.getDate() - daysAgo);
      tradeDate.setHours(Math.floor(Math.random() * 16) + 6, Math.floor(Math.random() * 60), 0);

      const entryPrice = Math.floor(Math.random() * 300) + 50;
      const exitPrice = entryPrice + (Math.random() * 50 - 25);
      const quantity = Math.floor(Math.random() * 100) + 10;
      const tradeType = Math.random() > 0.5 ? "Buy" : "Sell";
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      const marketTrend = marketTrends[Math.floor(Math.random() * marketTrends.length)];
      const volatility = volatilities[Math.floor(Math.random() * volatilities.length)];
      const followedPlan = Math.random() > 0.3;
      const entryQuality = followedPlan ? "Planned" : ["Early", "Late", "Emotional"][Math.floor(Math.random() * 3)];
      const exitQuality = followedPlan ? "Planned" : ["Early", "Late", "Emotional"][Math.floor(Math.random() * 3)];
      const riskPercent = Math.random() > 0.5 ? Math.random() * 3 : null;
      const stopLoss = entryPrice - (Math.random() * 10 + 5);

      const mistakes = [];
      if (!followedPlan) {
        const possibleMistakes = [
          "Poor entry timing",
          "Ignored stop loss",
          "Emotional decision",
          "Over-leveraged",
          "FOMO trade"
        ];
        if (Math.random() > 0.6) {
          mistakes.push(possibleMistakes[Math.floor(Math.random() * possibleMistakes.length)]);
        }
      }

      const trade = new Trade({
        user: user._id,
        stockName: stocks[Math.floor(Math.random() * stocks.length)],
        tradeType,
        entryPrice,
        exitPrice,
        quantity,
        strategy,
        emotion,
        notes: `Demo trade #${i + 1} - Testing insights feature`,
        tradeDateTime: tradeDate,
        setupType: strategy,
        marketTrend,
        volatility,
        stopLoss,
        riskPercent,
        entryQuality,
        exitQuality,
        emotionBefore: emotion,
        emotionDuring: emotion,
        emotionAfter: emotion,
        followedPlan,
        overTrading: Math.random() > 0.8,
        revengeTrade: Math.random() > 0.85,
        mistakes,
        goodActions: followedPlan ? ["Followed plan", "Took profit at target"] : [],
        learningNote: `Learning from trade #${i + 1}`
      });

      trades.push(trade);
    }

    // Save all trades
    await Trade.insertMany(trades);
    console.log(`✅ Successfully added ${trades.length} demo trades`);

    // Print summary
    let totalPL = 0;
    let wins = 0;
    let losses = 0;

    for (const trade of trades) {
      let pl = (trade.exitPrice - trade.entryPrice) * trade.quantity;
      if (trade.tradeType === "Sell") pl = -pl;
      totalPL += pl;
      if (pl > 0) wins++;
      else if (pl < 0) losses++;
    }

    console.log("\n📊 Demo Data Summary:");
    console.log(`   Total Trades: ${trades.length}`);
    console.log(`   Total P/L: $${totalPL.toFixed(2)}`);
    console.log(`   Wins: ${wins}`);
    console.log(`   Losses: ${losses}`);
    console.log(`   Win Rate: ${((wins / trades.length) * 100).toFixed(2)}%`);

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📝 Login credentials for demo:");
    console.log("   Username: admin");
    console.log("   Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
