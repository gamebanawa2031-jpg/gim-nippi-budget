import React, { useState } from 'react';
import { useFinance, formatCurrency } from '../context/FinanceContext';
import { TrendingUp, TrendingDown, Wallet, Plus, Calendar, CreditCard, Target, FileText } from 'lucide-react';
import { generatePDFReport } from '../utils/PDFReportService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import TransactionForm from './TransactionForm';

const Dashboard = () => {
  const { 
    totalIncome, totalExpense, balance, todayExpense, transactions, 
    dailyExpenditure, totalCardDebt, totalSavings, goals,
    creditCards, weddingTotalBudget, weddingTotalSpent, appName, user
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Prepare data for category pie chart
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense' && t.category !== 'Saving')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
    
  const chartData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#22D3EE', '#F472B6'];

  const recentTransactions = transactions.slice(0, 5);

  // Last 14 days for the daily chart
  const last14Days = dailyExpenditure.slice(-14);

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient">Financial Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's your summary for this month.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => generatePDFReport({
            transactions, totalIncome, totalExpense, balance, 
            totalCardDebt, totalSavings, creditCards, goals,
            weddingTotalBudget, weddingTotalSpent, appName, user
          })}>
            <FileText size={20} />
            Download Report
          </button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--accent-primary)' }}>
          <div className="summary-card-header">
            <span>Total Balance</span>
            <Wallet size={20} color="var(--accent-primary)" />
          </div>
          <div className="summary-card-value">{formatCurrency(balance)}</div>
        </div>
        
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--success)' }}>
          <div className="summary-card-header">
            <span>Total Income</span>
            <TrendingUp size={20} color="var(--success)" />
          </div>
          <div className="summary-card-value">{formatCurrency(totalIncome)}</div>
        </div>
        
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--danger)' }}>
          <div className="summary-card-header">
            <span>Total Expense</span>
            <TrendingDown size={20} color="var(--danger)" />
          </div>
          <div className="summary-card-value">{formatCurrency(totalExpense)}</div>
        </div>

        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--warning)' }}>
          <div className="summary-card-header">
            <span>Today's Spending</span>
            <Calendar size={20} color="var(--warning)" />
          </div>
          <div className="summary-card-value">{formatCurrency(todayExpense)}</div>
        </div>

        <div className="summary-card glass-panel" style={{ borderTop: '4px solid #F43F5E' }}>
          <div className="summary-card-header">
            <span>CC Debt</span>
            <CreditCard size={20} color="#F43F5E" />
          </div>
          <div className="summary-card-value">{formatCurrency(totalCardDebt)}</div>
        </div>

        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--accent-primary)' }}>
          <div className="summary-card-header">
            <span>Total Savings</span>
            <Target size={20} color="var(--accent-primary)" />
          </div>
          <div className="summary-card-value">{formatCurrency(totalSavings)}</div>
        </div>
      </div>

      {/* Daily Expenditure Chart */}
      <div className="panel glass-panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <h2 className="panel-title">Daily Spending (Last 14 days)</h2>
        </div>
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last14Days}>
              <defs>
                <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Amount']}
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: '#F8FAFC' }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={2} fill="url(#dailyGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel glass-panel">
          <div className="panel-header">
            <h2 className="panel-title">Expenses by Category</h2>
          </div>
          <div style={{ height: '300px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No expense data available.
              </div>
            )}
          </div>
        </div>

        <div className="panel glass-panel">
          <h2 className="panel-title" style={{ marginBottom: '20px' }}>Savings Progress</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {goals.slice(0, 3).map(goal => (
              <div key={goal.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{goal.title}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                      borderRadius: '4px'
                    }} 
                  />
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No active savings goals.
              </div>
            )}
          </div>
        </div>

        <div className="panel glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <h2 className="panel-title">Recent Transactions</h2>
          </div>
          <div className="transaction-list">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(t => (
                <div key={t.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className={`transaction-icon ${t.type}`}>
                      {t.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div className="transaction-details">
                      <h4>{t.description || t.category}</h4>
                      <p>{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className={`transaction-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No recent transactions.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <TransactionForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Dashboard;
