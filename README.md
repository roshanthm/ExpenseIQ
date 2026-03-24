# ExpenseIQ – Intelligent Expense Tracking System

ExpenseIQ is a full-stack financial tracking application designed to transform everyday expense data into actionable insights.
It combines structured SQL-driven analytics with a modern, responsive interface to deliver a data-centric personal finance experience.

---

## Overview

This system is built to go beyond basic expense logging by introducing intelligent analysis, real-time feedback, and visual interpretation of financial behavior.
It is designed with scalability, clarity, and usability in mind.

---

## Core Features

### Smart Insights

* Identifies spending trends and anomalies
* Generates real-time alerts based on budget thresholds
* Provides contextual suggestions based on user activity

### Visual Analytics

* Category-wise distribution using pie charts
* Time-based trend analysis using line charts
* Dynamic updates powered by Chart.js

### Expense Management (CRUD)

* Create, update, delete, and retrieve expense records
* Filter by category, date range, and keywords

### Budget Control

* Define category-specific monthly budgets
* Track utilization with progress indicators
* Alerts for threshold breaches

### User Interface

* Modern dark theme with glassmorphism design
* Responsive layout for desktop and mobile
* Structured dashboard with key financial metrics

---

## Technology Stack

**Frontend**

* HTML, CSS (Tailwind)
* JavaScript (React)
* Chart.js

**Backend**

* Node.js
* Express.js

**Database**

* MySQL / SQLite (SQL-based structured storage)

---

## Database Design

The system uses a relational database structure with optimized queries for:

* Expense aggregation by category
* Monthly and daily summaries
* Trend analysis and reporting

---

## Installation and Setup

```
git clone https://github.com/your-username/ExpenseIQ.git
cd ExpenseIQ
npm install
npm run dev
```

Configure environment variables in `.env` before running.

---

## API Overview

* `GET /api/expenses` – Retrieve expenses with filters
* `POST /api/expenses` – Add new expense
* `PUT /api/expenses/:id` – Update expense
* `DELETE /api/expenses/:id` – Remove expense
* `GET /api/stats` – Retrieve analytics data

---

## Future Enhancements

* Predictive analytics for spending behavior
* Automated expense categorization
* Export functionality (CSV / PDF)
* Authentication and multi-user support

---

## Author

Roshan Thomas

---

## License

MIT License
