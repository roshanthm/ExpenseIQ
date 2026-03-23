import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  TrendingUp, 
  Plus, 
  Filter, 
  Trash2, 
  Edit2, 
  AlertCircle,
  Download,
  ChevronRight,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { cn, CATEGORIES, PAYMENT_METHODS } from './lib/utils';
import { Expense, Budget, AnalyticsSummary } from './types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState({ category: '', startDate: '', endDate: '' });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: CATEGORIES[0],
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: PAYMENT_METHODS[0]
  });

  const fetchData = async () => {
    try {
      const [expRes, budRes, anaRes] = await Promise.all([
        fetch(`/api/expenses?category=${filters.category}&startDate=${filters.startDate}&endDate=${filters.endDate}`),
        fetch('/api/budgets'),
        fetch('/api/analytics/summary')
      ]);
      
      const expData = await expRes.json();
      const budData = await budRes.json();
      const anaData = await anaRes.json();

      setExpenses(expData);
      setBudgets(budData);
      setAnalytics(anaData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    try {
      if (editingExpense) {
        await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        title: '',
        amount: '',
        category: CATEGORIES[0],
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: PAYMENT_METHODS[0]
      });
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const exportToCSV = () => {
    const headers = ["Title", "Amount", "Category", "Date", "Payment Method"];
    const rows = expenses.map(e => [e.title, e.amount, e.category, e.date, e.payment_method]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "expenses.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lineData = {
    labels: analytics?.dailyTrends.map(t => format(parseISO(t.day), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Daily Spending',
        data: analytics?.dailyTrends.map(t => t.total) || [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const pieData = {
    labels: analytics?.categoryBreakdown.map(c => c.category) || [],
    datasets: [
      {
        data: analytics?.categoryBreakdown.map(c => c.total) || [],
        backgroundColor: [
          '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'
        ],
        borderWidth: 0,
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#0f0f12] border-r border-white/5 z-40 hidden md:block">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">SmartSpend</h1>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === 'dashboard' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === 'expenses' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <ReceiptText className="w-5 h-5" />
              <span className="font-medium">Expenses</span>
            </button>
            <button 
              onClick={() => setActiveTab('budgets')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === 'budgets' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Wallet className="w-5 h-5" />
              <span className="font-medium">Budgets</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 pb-24">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 capitalize">{activeTab}</h2>
            <p className="text-slate-400">Welcome back, Roshan. Here's your financial overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              onClick={() => {
                setEditingExpense(null);
                setFormData({
                  title: '',
                  amount: '',
                  category: CATEGORIES[0],
                  date: format(new Date(), 'yyyy-MM-dd'),
                  payment_method: PAYMENT_METHODS[0]
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet className="w-12 h-12 text-indigo-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-2">Total Spending</p>
                <h3 className="text-3xl font-bold text-white mb-4">${analytics?.total.toFixed(2)}</h3>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>12% from last month</span>
                </div>
              </div>

              <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-12 h-12 text-pink-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-2">Spending Score</p>
                <h3 className="text-3xl font-bold text-white mb-4">{analytics?.spendingScore}/100</h3>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-1000" 
                    style={{ width: `${analytics?.spendingScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-2">Active Alerts</p>
                <h3 className="text-3xl font-bold text-white mb-4">{analytics?.insights.length}</h3>
                <p className="text-slate-400 text-sm">Requires your attention</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-white">Spending Trends</h4>
                  <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-slate-400 outline-none">
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-[300px]">
                  <Line 
                    data={lineData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-6">Category Distribution</h4>
                <div className="h-[300px] flex items-center justify-center">
                  <Pie 
                    data={pieData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { 
                          position: 'right',
                          labels: { color: '#94a3b8', usePointStyle: true, padding: 20 }
                        } 
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-[#14141a] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white">Smart Insights</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics?.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <div className="mt-1">
                      <AlertCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
                  </div>
                ))}
                {analytics?.insights.length === 0 && (
                  <p className="text-slate-500 text-sm italic">No new insights. You're doing great!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-[#14141a] border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-transparent text-sm text-slate-200 outline-none"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all"
              />
              <span className="text-slate-500 text-sm">to</span>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all"
              />
              <button 
                onClick={() => setFilters({ category: '', startDate: '', endDate: '' })}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium px-2"
              >
                Reset
              </button>
            </div>

            {/* Expenses Table */}
            <div className="bg-[#14141a] border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                              <ReceiptText className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-white">{expense.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {format(parseISO(expense.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {expense.payment_method}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-white">${expense.amount.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingExpense(expense);
                                setFormData({
                                  title: expense.title,
                                  amount: expense.amount.toString(),
                                  category: expense.category,
                                  date: format(parseISO(expense.date), 'yyyy-MM-dd'),
                                  payment_method: expense.payment_method
                                });
                                setIsModalOpen(true);
                              }}
                              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map(cat => {
              const budget = budgets.find(b => b.category === cat)?.amount || 0;
              const spent = analytics?.categoryBreakdown.find(c => c.category === cat)?.total || 0;
              const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              
              return (
                <div key={cat} className="bg-[#14141a] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-white">{cat}</h4>
                    <button 
                      onClick={() => {
                        const newAmount = prompt(`Set budget for ${cat}:`, budget.toString());
                        if (newAmount !== null) {
                          fetch('/api/budgets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ category: cat, amount: parseFloat(newAmount) })
                          }).then(fetchData);
                        }
                      }}
                      className="p-2 hover:bg-white/5 rounded-lg text-indigo-400 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Spent</p>
                        <p className="text-xl font-bold text-white">${spent.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs mb-1">Budget</p>
                        <p className="text-xl font-bold text-slate-300">${budget.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(
                        "font-medium",
                        percentage > 90 ? "text-red-400" : "text-slate-400"
                      )}>
                        {percentage.toFixed(0)}% used
                      </span>
                      <span className="text-slate-500">
                        ${Math.max(0, budget - spent).toFixed(2)} left
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#14141a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">{editingExpense ? 'Edit Expense' : 'New Expense'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all"
                  placeholder="e.g. Starbucks Coffee"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment</label>
                  <select 
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20"
                >
                  {editingExpense ? 'Save Changes' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f12]/80 backdrop-blur-lg border-t border-white/5 p-4 flex justify-around md:hidden z-40">
        <button onClick={() => setActiveTab('dashboard')} className={cn("p-2", activeTab === 'dashboard' ? "text-indigo-400" : "text-slate-500")}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('expenses')} className={cn("p-2", activeTab === 'expenses' ? "text-indigo-400" : "text-slate-500")}>
          <ReceiptText className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('budgets')} className={cn("p-2", activeTab === 'budgets' ? "text-indigo-400" : "text-slate-500")}>
          <Wallet className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
