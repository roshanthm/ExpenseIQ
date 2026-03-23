import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Initialize schema
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

    -- Insert sample budgets if empty
    INSERT OR IGNORE INTO budgets (category, amount) VALUES 
    ('Food', 500),
    ('Transport', 200),
    ('Entertainment', 150),
    ('Shopping', 300),
    ('Health', 100),
    ('Bills', 1000),
    ('Other', 200);
  `);

  // Check if expenses is empty, add sample data
  const count = await db.get('SELECT COUNT(*) as count FROM expenses');
  if (count.count === 0) {
    const now = new Date();
    const sampleData = [
      ['Grocery Shopping', 85.50, 'Food', now.toISOString().split('T')[0], 'Credit Card'],
      ['Uber Ride', 15.20, 'Transport', now.toISOString().split('T')[0], 'Cash'],
      ['Netflix Subscription', 15.99, 'Entertainment', now.toISOString().split('T')[0], 'Debit Card'],
      ['Electricity Bill', 120.00, 'Bills', now.toISOString().split('T')[0], 'Bank Transfer'],
      ['Dinner at Italian Place', 65.00, 'Food', new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0], 'Credit Card'],
      ['Gas Station', 45.00, 'Transport', new Date(now.setDate(now.getDate() - 2)).toISOString().split('T')[0], 'Debit Card'],
      ['Amazon Purchase', 120.00, 'Shopping', new Date(now.setDate(now.getDate() - 3)).toISOString().split('T')[0], 'Credit Card'],
    ];

    for (const row of sampleData) {
      await db.run(
        'INSERT INTO expenses (title, amount, category, date, payment_method) VALUES (?, ?, ?, ?, ?)',
        row
      );
    }
  }

  return db;
}
