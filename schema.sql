-- Expense Tracker SQL Schema
-- This file represents the data model used in the application.
-- While the app uses Firebase Firestore for hosting, the underlying
-- logic follows this relational structure.

-- 1. Table Definitions (DDL)
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    uid TEXT NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    uid TEXT NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid),
    UNIQUE(category, uid)
);

-- 2. Sample Queries (DML)

-- Get all expenses for a specific user
-- SELECT * FROM expenses WHERE uid = 'user_123' ORDER BY date DESC;

-- Calculate total spending per category for a user
-- SELECT category, SUM(amount) as total 
-- FROM expenses 
-- WHERE uid = 'user_123' 
-- GROUP BY category;

-- Get monthly spending trend
-- SELECT strftime('%Y-%m-%d', date) as day, SUM(amount) as total
-- FROM expenses
-- WHERE uid = 'user_123' AND date >= date('now', '-30 days')
-- GROUP BY day
-- ORDER BY day ASC;

-- Check if any category has exceeded its budget
-- SELECT b.category, b.amount as budget_limit, SUM(e.amount) as actual_spending
-- FROM budgets b
-- JOIN expenses e ON b.category = e.category AND b.uid = e.uid
-- WHERE b.uid = 'user_123'
-- GROUP BY b.category
-- HAVING actual_spending > budget_limit;
