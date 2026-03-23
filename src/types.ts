export interface Expense {
  id: string | number;
  title: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  uid?: string;
}

export interface Budget {
  category: string;
  amount: number;
  uid?: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface DailyTrend {
  date: string;
  total: number;
}

export interface DashboardStats {
  totalBalance: number;
  monthlySpending: number;
  dailyAverage: number;
  spendingScore: number;
  categoryDistribution: CategoryTotal[];
  trends: DailyTrend[];
  budgets: Budget[];
  alerts: string[];
  insights: string[];
}
