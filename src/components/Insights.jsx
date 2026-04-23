import React, { useMemo } from 'react';
import { useFinance, formatCurrency } from '../context/FinanceContext';
import { TrendingUp, TrendingDown, Calendar, Target, Zap, AlertTriangle, PiggyBank, BarChart3, Settings, Trash2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const Insights = () => {
  const { 
    transactions, dailyExpenditure, spendingByCategory, weeklyTrend, 
    totalIncome, totalExpense, appName, setAppName, resetAllData 
  } = useFinance();

  // ===== COMPUTED INSIGHTS =====
  const avgDailySpend = useMemo(() => {
    const expenseDays = dailyExpenditure.filter(d => d.amount > 0);
    if (expenseDays.length === 0) return 0;
    return expenseDays.reduce((s, d) => s + d.amount, 0) / expenseDays.length;
  }, [dailyExpenditure]);

  const savingsRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return ((totalIncome - totalExpense) / totalIncome) * 100;
  }, [totalIncome, totalExpense]);

  const projectedMonthlyExpense = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    if (dayOfMonth === 0) return 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (totalExpense / dayOfMonth) * daysInMonth;
  }, [totalExpense]);

  const highestSpendingDay = useMemo(() => {
    const dayTotals = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const day = dayNames[new Date(t.date).getDay()];
      dayTotals[day] = (dayTotals[day] || 0) + Number(t.amount);
    });
    let maxDay = 'N/A', maxAmount = 0;
    Object.entries(dayTotals).forEach(([day, amount]) => {
      if (amount > maxAmount) { maxDay = day; maxAmount = amount; }
    });
    return maxDay;
  }, [transactions]);

  const topCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null;
  const isOverspending = projectedMonthlyExpense > totalIncome && totalIncome > 0;

  // Monthly income vs expense (last 6 months)
  const monthlyComparison = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const income = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(yearMonth))
        .reduce((s, t) => s + Number(t.amount), 0);
      const expense = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(yearMonth))
        .reduce((s, t) => s + Number(t.amount), 0);
      months.push({ month: monthStr, income, expense });
    }
    return months;
  }, [transactions]);

  // Category bar chart data
  const categoryBarData = spendingByCategory.slice(0, 6);
  const CATEGORY_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];

  // Daily cumulative for current month
  const currentMonthDaily = useMemo(() => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = [];
    let cumulative = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
      const dayExpense = transactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      cumulative += dayExpense;
      const isFuture = d > now.getDate();
      days.push({ day: d, amount: dayExpense, cumulative, label: `${d}`, isFuture });
    }
    return days.filter(d => !d.isFuture);
  }, [transactions]);

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient-insight">Insights & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Understand your spending patterns and financial health.</p>
        </div>
      </div>

      {/* ===== SMART INSIGHT CARDS ===== */}
      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'var(--insight-bg)' }}>
            <Calendar size={18} color="var(--insight-primary)" />
          </div>
          <div className="insight-value">{formatCurrency(avgDailySpend)}</div>
          <div className="insight-label">Average Daily Spending</div>
        </div>

        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'var(--success-bg)' }}>
            <PiggyBank size={18} color="var(--success)" />
          </div>
          <div className="insight-value" style={{ color: savingsRate >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {savingsRate.toFixed(1)}%
          </div>
          <div className="insight-label">Savings Rate</div>
          <div className={`insight-change ${savingsRate >= 20 ? 'positive' : 'negative'}`}>
            {savingsRate >= 20 ? '✓ Healthy' : '⚠ Below target'}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'var(--warning-bg)' }}>
            <Target size={18} color="var(--warning)" />
          </div>
          <div className="insight-value">{formatCurrency(projectedMonthlyExpense)}</div>
          <div className="insight-label">Projected Monthly Expense</div>
          {isOverspending && (
            <div className="insight-change negative">
              <AlertTriangle size={12} /> Exceeds income
            </div>
          )}
        </div>

        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <Zap size={18} color="#8B5CF6" />
          </div>
          <div className="insight-value" style={{ fontSize: '1.2rem' }}>{highestSpendingDay}</div>
          <div className="insight-label">Biggest Spending Day</div>
        </div>

        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'var(--danger-bg)' }}>
            <TrendingDown size={18} color="var(--danger)" />
          </div>
          <div className="insight-value">{formatCurrency(totalExpense)}</div>
          <div className="insight-label">Total Expenses</div>
        </div>

        <div className="insight-card">
          <div className="insight-icon" style={{ background: 'var(--success-bg)' }}>
            <TrendingUp size={18} color="var(--success)" />
          </div>
          <div className="insight-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</div>
          <div className="insight-label">Total Income</div>
        </div>
      </div>

      {/* ===== DAILY CUMULATIVE SPENDING ===== */}
      <div className="panel glass-panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <h2 className="panel-title">Daily Cumulative Spending (This Month)</h2>
        </div>
        <div style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentMonthDaily}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(value), name === 'cumulative' ? 'Running Total' : 'Daily']}
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: '#F8FAFC' }}
                labelFormatter={(v) => `Day ${v}`}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#22D3EE" strokeWidth={2} fill="url(#cumulativeGradient)" name="cumulative" />
              <Area type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="daily" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="content-grid" style={{ marginBottom: '24px' }}>
        {/* Weekly Comparison */}
        <div className="panel glass-panel">
          <div className="panel-header">
            <h2 className="panel-title">Weekly Spending</h2>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Expense']}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: '#F8FAFC' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Bar dataKey="expense" radius={[6, 6, 0, 0]} fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs Expense Trend */}
        <div className="panel glass-panel">
          <div className="panel-header">
            <h2 className="panel-title">Income vs Expense</h2>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: '#F8FAFC' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} dot={{ fill: '#EF4444', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== TOP SPENDING CATEGORIES ===== */}
      <div className="panel glass-panel">
        <div className="panel-header">
          <h2 className="panel-title">Top Spending Categories</h2>
        </div>
        <div>
          {categoryBarData.map((cat, index) => {
            const maxValue = categoryBarData[0]?.value || 1;
            const barWidth = (cat.value / maxValue) * 100;
            return (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: index < categoryBarData.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: '120px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{cat.name}</span>
                <div style={{ flex: 1, height: '24px', background: 'var(--bg-surface)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${CATEGORY_COLORS[index]}, ${CATEGORY_COLORS[index]}aa)`,
                    borderRadius: '6px',
                    transition: 'width 1s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                  }}>
                    {barWidth > 25 && (
                      <span style={{ fontSize: '0.72rem', color: 'white', fontWeight: 600 }}>{formatCurrency(cat.value)}</span>
                    )}
                  </div>
                </div>
                {barWidth <= 25 && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-display)', minWidth: '100px', textAlign: 'right' }}>{formatCurrency(cat.value)}</span>
                )}
              </div>
            );
          })}
          {categoryBarData.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No expense data to analyze.</div>
          )}
        </div>
      </div>
      
      {/* ===== BUDGET SETTINGS ===== */}
      <div className="panel glass-panel" style={{ marginTop: '24px', borderTop: '4px solid var(--danger)' }}>
        <div className="panel-header">
          <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="var(--text-secondary)" />
            Budget Settings
          </h2>
        </div>
        <div className="content-grid">
          <div className="form-group">
            <label>App Display Name</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                className="input-field" 
                value={appName} 
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g., Our Family Budget"
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              This name appears in your sidebar and browser tab.
            </p>
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--danger)' }}>Danger Zone</label>
            <button 
              className="btn-danger" 
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                if (window.confirm('CRITICAL: This will delete ALL transactions, loans, and goals permanently. Are you sure?')) {
                  resetAllData();
                }
              }}
            >
              <Trash2 size={18} /> Master Reset All Data
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Permanently wipe all data and start from scratch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
