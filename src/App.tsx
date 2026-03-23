import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  List, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertCircle, 
  Wallet, 
  Calendar,
  Filter,
  Trash2,
  Edit2,
  Download,
  ChevronRight,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';
import { cn, formatCurrency, autoCategorize } from './lib/utils';
import { Expense, DashboardStats, Budget } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  onAuthStateChanged, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  setDoc,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Bills', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Other',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'Credit Card'
  });

  // Filters
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Expenses Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Sort by date desc
      expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(expensesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time Budgets Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'budgets'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetsData = snapshot.docs.map(doc => doc.data()) as Budget[];
      setBudgets(budgetsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate Stats Client-side
  const stats = useMemo(() => {
    if (!user || expenses.length === 0) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalBalance = expenses.reduce((acc, e) => acc + e.amount, 0);
    
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });

    const monthlySpending = currentMonthExpenses.reduce((acc, e) => acc + e.amount, 0);

    const categoryMap = new Map<string, number>();
    currentMonthExpenses.forEach(e => {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    });

    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, total]) => ({
      category,
      total
    }));

    const thirtyDaysAgo = subDays(now, 30);
    const trendMap = new Map<string, number>();
    expenses.filter(e => new Date(e.date) >= thirtyDaysAgo).forEach(e => {
      trendMap.set(e.date, (trendMap.get(e.date) || 0) + e.amount);
    });

    const trends = Array.from(trendMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const alerts: string[] = [];
    const insights: string[] = [];

    budgets.forEach(budget => {
      const spent = categoryMap.get(budget.category) || 0;
      if (spent > budget.amount) {
        alerts.push(`Budget exceeded for ${budget.category}! Spent ${formatCurrency(spent)} / ${formatCurrency(budget.amount)}`);
      } else if (spent > budget.amount * 0.8) {
        alerts.push(`Nearing budget limit for ${budget.category} (80% reached).`);
      }
    });

    // Simple AI-like insights
    const topCategory = [...categoryDistribution].sort((a, b) => b.total - a.total)[0];
    if (topCategory) {
      insights.push(`${topCategory.category} is your highest spending category this month.`);
    }

    const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
    let spendingScore = 100;
    if (totalBudget > 0) {
      spendingScore = Math.max(0, Math.min(100, 100 - (monthlySpending / totalBudget) * 50));
    }

    return {
      totalBalance,
      monthlySpending,
      dailyAverage: monthlySpending / now.getDate(),
      spendingScore: Math.round(spendingScore),
      categoryDistribution,
      trends,
      budgets,
      alerts,
      insights
    };
  }, [user, expenses, budgets]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesCategory = !filters.category || e.category === filters.category;
      const matchesSearch = !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase());
      const matchesDate = !filters.startDate || e.date >= filters.startDate;
      return matchesCategory && matchesSearch && matchesDate;
    });
  }, [expenses, filters]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        uid: user.uid
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id as string), expenseData);
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
      }

      setIsAdding(false);
      setEditingExpense(null);
      setFormData({
        title: '',
        amount: '',
        category: 'Other',
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'Credit Card'
      });
    } catch (error) {
      handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, 'expenses');
    }
  };

  const handleDeleteExpense = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'expenses');
    }
  };

  const handleUpdateBudget = async (category: string, amount: number) => {
    if (!user) return;
    try {
      const budgetId = `${user.uid}_${category}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        category,
        amount,
        uid: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
        <GlassCard className="max-w-md w-full p-10 text-center space-y-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/20">
            <Wallet size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Expense Tracker</h1>
            <p className="text-slate-500 mt-2">Sign in to manage your finances securely in the cloud.</p>
          </div>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
          >
            <LogIn size={20} />
            Continue with Google
          </button>
        </GlassCard>
      </div>
    );
  }

  const exportToCSV = () => {
    const headers = ['Title', 'Amount', 'Category', 'Date', 'Payment Method'];
    const rows = expenses.map(e => [e.title, e.amount, e.category, e.date, e.payment_method]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const pieData = {
    labels: stats?.categoryDistribution.map(c => c.category) || [],
    datasets: [{
      data: stats?.categoryDistribution.map(c => c.total) || [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(201, 203, 207, 0.7)',
      ],
      borderColor: '#1f2937',
      borderWidth: 2,
    }]
  };

  const lineData = {
    labels: stats?.trends.map(t => format(new Date(t.date), 'MMM dd')) || [],
    datasets: [{
      label: 'Daily Spending',
      data: stats?.trends.map(t => t.total) || [],
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 1)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
    }]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:left-0 md:w-20 md:h-full bg-black/40 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 flex md:flex-col items-center justify-around md:justify-center gap-8 p-4">
        <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Dashboard" />
        <NavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<List size={24} />} label="History" />
        <NavItem active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<PieChartIcon size={24} />} label="Budgets" />
        <button 
          onClick={() => setIsAdding(true)}
          className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all hover:scale-110 active:scale-95"
        >
          <PlusCircle size={28} />
        </button>
        <div className="md:mt-auto">
          <NavItem active={false} onClick={logout} icon={<LogOut size={24} />} label="Logout" />
        </div>
      </nav>

      <main className="md:pl-20 min-h-screen">
        <div className="max-w-[1600px] mx-auto p-6 md:p-10 pb-24 md:pb-10">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {activeTab === 'dashboard' ? 'Financial Overview' : activeTab === 'expenses' ? 'Transaction History' : 'Budget Planning'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">Welcome back, {user.displayName?.split(' ')[0]}. Your finances are looking healthy.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setEditingExpense(null);
                  setFormData({
                    title: '',
                    amount: '',
                    category: 'Other',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    payment_method: 'Credit Card'
                  });
                  setIsAdding(true);
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 font-medium"
              >
                <PlusCircle size={18} />
                Add Expense
              </button>
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm">
                <Download size={16} />
                Export CSV
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" />
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Balance" value={formatCurrency(stats?.totalBalance || 0)} icon={<Wallet className="text-blue-400" />} trend="+2.4%" />
                <StatCard title="Monthly Spent" value={formatCurrency(stats?.monthlySpending || 0)} icon={<TrendingUp className="text-purple-400" />} trend="+12%" isNegative />
                <StatCard title="Daily Average" value={formatCurrency(stats?.dailyAverage || 0)} icon={<Calendar className="text-emerald-400" />} />
                <StatCard title="Spending Score" value={stats?.spendingScore || 0} icon={<Zap className="text-yellow-400" />} subtitle="Based on habits" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts */}
                <GlassCard className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">Spending Trends</h3>
                    <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs outline-none">
                      <option>Last 30 Days</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-[300px]">
                    <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} />
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="font-semibold text-lg mb-6">Category Distribution</h3>
                  <div className="h-[250px] flex items-center justify-center">
                    <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 15 } } } }} />
                  </div>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts & Insights */}
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-yellow-500">
                    <AlertCircle size={20} />
                    <h3 className="font-semibold">Smart Alerts</h3>
                  </div>
                  <div className="space-y-3">
                    {stats?.alerts.length ? stats.alerts.map((alert, i) => (
                      <div key={i} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                        {alert}
                      </div>
                    )) : (
                      <p className="text-slate-500 text-sm italic">No active alerts. You're doing great!</p>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-blue-500">
                    <Zap size={20} />
                    <h3 className="font-semibold">AI Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {stats?.insights.map((insight, i) => (
                      <div key={i} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {insight}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <GlassCard className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Filter size={16} />
                  Filters:
                </div>
                <div className="flex-1 min-w-[200px] relative">
                  <input 
                    type="text"
                    placeholder="Search by title..."
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <select 
                  value={filters.category}
                  onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-colors text-white"
                >
                  <option value="" className="bg-[#121216] text-white">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#121216] text-white">{c}</option>)}
                </select>
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-colors"
                />
                <button 
                  onClick={() => setFilters({ category: '', startDate: '', endDate: '', search: '' })}
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              </GlassCard>

              {/* Expense List */}
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Title</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Method</th>
                        <th className="p-4 font-semibold text-right">Amount</th>
                        <th className="p-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredExpenses.map((expense) => (
                        <tr 
                          key={expense.id} 
                          onClick={() => setSelectedExpense(expense)}
                          className="hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          <td className="p-4">
                            <div className="font-medium">{expense.title}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                              {expense.category}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            {format(new Date(expense.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            {expense.payment_method}
                          </td>
                          <td className="p-4 text-right font-semibold text-blue-400">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setFormData({
                                    title: expense.title,
                                    amount: expense.amount.toString(),
                                    category: expense.category,
                                    date: expense.date,
                                    payment_method: expense.payment_method
                                  });
                                  setIsAdding(true);
                                }}
                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === 'budgets' && (
            <motion.div 
              key="budgets"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map((category) => {
                  const budget = budgets.find(b => b.category === category) || { category, amount: 0, uid: user.uid };
                  const spent = stats?.categoryDistribution.find(c => c.category === category)?.total || 0;
                  const percent = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
                  const isExceeded = budget.amount > 0 && spent > budget.amount;

                  return (
                    <GlassCard key={category} className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{category}</h3>
                        <PieChartIcon size={20} className={isExceeded ? 'text-red-400' : 'text-blue-400'} />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Spent: {formatCurrency(spent)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">Limit:</span>
                            <input 
                              type="number"
                              value={budget.amount || ''}
                              onChange={(e) => handleUpdateBudget(category, parseFloat(e.target.value) || 0)}
                              placeholder="Set limit"
                              className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-right outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={cn(
                              "h-full rounded-full",
                              isExceeded ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                            )}
                          />
                        </div>
                        <p className={cn(
                          "text-[10px] uppercase tracking-wider font-bold",
                          isExceeded ? 'text-red-400' : 'text-slate-500'
                        )}>
                          {budget.amount === 0 ? 'No budget set' : isExceeded ? 'Budget Exceeded' : `${percent.toFixed(0)}% Utilized`}
                        </p>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>

    {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={e => {
                      const title = e.target.value;
                      const category = autoCategorize(title);
                      setFormData(prev => ({ ...prev, title, category: category !== 'Other' ? category : prev.category }));
                    }}
                    placeholder="e.g. Starbucks Coffee"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-white"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#121216] text-white">{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.date}
                      onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Method</label>
                    <select 
                      value={formData.payment_method}
                      onChange={e => setFormData(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-white"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-[#121216] text-white">{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium shadow-lg shadow-blue-600/20"
                  >
                    {editingExpense ? 'Update' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpense(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#121216] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Transaction Details</h2>
                <button 
                  onClick={() => setSelectedExpense(null)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <PlusCircle size={24} className="rotate-45 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Title</label>
                    <p className="text-lg font-medium text-white mt-1">{selectedExpense.title}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Category</label>
                    <div className="mt-2">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                        {selectedExpense.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Payment Method</label>
                    <p className="text-slate-300 mt-1">{selectedExpense.payment_method}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Amount</label>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Date</label>
                    <div className="flex items-center gap-2 text-slate-300 mt-1">
                      <Calendar size={16} className="text-slate-500" />
                      {format(new Date(selectedExpense.date), 'MMMM dd, yyyy')}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Status</label>
                    <div className="flex items-center gap-2 text-emerald-400 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => {
                    setEditingExpense(selectedExpense);
                    setFormData({
                      title: selectedExpense.title,
                      amount: selectedExpense.amount.toString(),
                      category: selectedExpense.category,
                      date: selectedExpense.date,
                      payment_method: selectedExpense.payment_method
                    });
                    setSelectedExpense(null);
                    setIsAdding(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium"
                >
                  <Edit2 size={18} />
                  Edit Transaction
                </button>
                <button 
                  onClick={() => {
                    handleDeleteExpense(selectedExpense.id);
                    setSelectedExpense(null);
                  }}
                  className="px-6 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        active ? "bg-blue-500/10" : "group-hover:bg-white/5"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-tighter md:hidden">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-full hidden md:block"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, trend, subtitle, isNegative }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, subtitle?: string, isNegative?: boolean }) {
  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
            isNegative ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"
          )}>
            {isNegative ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <h4 className="text-2xl font-bold mt-1">{value}</h4>
        {subtitle && <p className="text-slate-600 text-[10px] mt-1">{subtitle}</p>}
      </div>
    </GlassCard>
  );
}

function GlassCard({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) {
  return (
    <div 
      {...props}
      className={cn(
        "bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-3xl shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
