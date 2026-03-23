import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database setup
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      category TEXT PRIMARY KEY,
      amount REAL NOT NULL
    );
  `);

  // Seed initial data if empty
  const expenseCount = await db.get("SELECT COUNT(*) as count FROM expenses");
  if (expenseCount.count === 0) {
    const categories = ["Food", "Transport", "Entertainment", "Utilities", "Shopping"];
    const methods = ["Cash", "Credit Card", "Debit Card", "UPI"];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - Math.floor(Math.random() * 30));
      await db.run(
        "INSERT INTO expenses (title, amount, category, date, payment_method) VALUES (?, ?, ?, ?, ?)",
        [`Expense ${i + 1}`, Math.random() * 100 + 10, categories[Math.floor(Math.random() * categories.length)], date.toISOString(), methods[Math.floor(Math.random() * methods.length)]]
      );
    }

    for (const cat of categories) {
      await db.run("INSERT INTO budgets (category, amount) VALUES (?, ?)", [cat, 500]);
    }
  }

  // API Routes
  app.get("/api/expenses", async (req, res) => {
    const { category, startDate, endDate } = req.query;
    let query = "SELECT * FROM expenses WHERE 1=1";
    const params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY date DESC";
    const expenses = await db.all(query, params);
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    let { title, amount, category, date, payment_method } = req.body;
    
    // Auto-categorization logic (Bonus feature)
    if (!category || category === "Other") {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes("starbucks") || lowerTitle.includes("coffee") || lowerTitle.includes("food") || lowerTitle.includes("restaurant")) {
        category = "Food";
      } else if (lowerTitle.includes("uber") || lowerTitle.includes("lyft") || lowerTitle.includes("gas") || lowerTitle.includes("fuel") || lowerTitle.includes("taxi")) {
        category = "Transport";
      } else if (lowerTitle.includes("netflix") || lowerTitle.includes("spotify") || lowerTitle.includes("movie") || lowerTitle.includes("game") || lowerTitle.includes("cinema")) {
        category = "Entertainment";
      } else if (lowerTitle.includes("amazon") || lowerTitle.includes("walmart") || lowerTitle.includes("mall") || lowerTitle.includes("shop") || lowerTitle.includes("target")) {
        category = "Shopping";
      } else if (lowerTitle.includes("electric") || lowerTitle.includes("water") || lowerTitle.includes("rent") || lowerTitle.includes("internet") || lowerTitle.includes("bill")) {
        category = "Utilities";
      }
    }

    const result = await db.run(
      "INSERT INTO expenses (title, amount, category, date, payment_method) VALUES (?, ?, ?, ?, ?)",
      [title, amount, category, date, payment_method]
    );
    res.json({ id: result.lastID, title, amount, category, date, payment_method });
  });

  app.put("/api/expenses/:id", async (req, res) => {
    const { title, amount, category, date, payment_method } = req.body;
    await db.run(
      "UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?, payment_method = ? WHERE id = ?",
      [title, amount, category, date, payment_method, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    await db.run("DELETE FROM expenses WHERE id = ?", [req.params.id]);
    res.sendStatus(204);
  });

  // Budget Routes
  app.get("/api/budgets", async (req, res) => {
    const budgets = await db.all("SELECT * FROM budgets");
    res.json(budgets);
  });

  app.post("/api/budgets", async (req, res) => {
    const { category, amount } = req.body;
    await db.run(
      "INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)",
      [category, amount]
    );
    res.json({ category, amount });
  });

  // Analytics Routes
  app.get("/api/analytics/summary", async (req, res) => {
    const total = await db.get("SELECT SUM(amount) as total FROM expenses");
    const categoryBreakdown = await db.all(
      "SELECT category, SUM(amount) as total FROM expenses GROUP BY category"
    );
    const dailyTrends = await db.all(
      "SELECT strftime('%Y-%m-%d', date) as day, SUM(amount) as total FROM expenses GROUP BY day ORDER BY day ASC LIMIT 30"
    );

    // AI Insights (Simulated logic based on data)
    const insights = [];
    const foodTotal = categoryBreakdown.find(c => c.category === 'Food')?.total || 0;
    if (foodTotal > 200) {
      insights.push("Your food spending is 25% higher than last month. Consider cooking at home more.");
    }
    
    const shoppingTotal = categoryBreakdown.find(c => c.category === 'Shopping')?.total || 0;
    if (shoppingTotal > 150) {
      insights.push("Category spike detected: Shopping. You've spent $150+ this week.");
    }

    // Spending Score (0-100)
    // Simple logic: lower total spending relative to budgets = higher score
    const budgets = await db.all("SELECT * FROM budgets");
    const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
    const currentTotal = total.total || 0;
    let score = 100;
    if (totalBudget > 0) {
      const ratio = currentTotal / totalBudget;
      score = Math.max(0, Math.min(100, Math.round(100 - (ratio * 50))));
    }

    res.json({
      total: total.total || 0,
      categoryBreakdown,
      dailyTrends,
      insights,
      spendingScore: score
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
