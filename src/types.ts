export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
}

export interface Budget {
  category: string;
  amount: number;
}

export interface AnalyticsSummary {
  total: number;
  categoryBreakdown: { category: string; total: number }[];
  dailyTrends: { day: string; total: number }[];
  insights: string[];
  spendingScore: number;
}
