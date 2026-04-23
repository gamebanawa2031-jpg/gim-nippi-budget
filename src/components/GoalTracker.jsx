import React, { useState } from 'react';
import { useFinance, formatCurrency } from '../context/FinanceContext';
import { Target, CreditCard, Plus, Trash2, RotateCcw, X } from 'lucide-react';

const GoalTracker = () => {
  const { goals, addGoal, deleteGoal, addGoalAmount, resetGoalAmount } = useFinance();
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [amount, setAmount] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', type: 'savings' });

  const handleContribute = (e) => {
    e.preventDefault();
    if (!selectedGoal || !amount) return;
    addGoalAmount(selectedGoal.id, Number(amount));
    setAmount('');
    setSelectedGoal(null);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.target) return;
    addGoal({ title: newGoal.title, target: Number(newGoal.target), type: newGoal.type });
    setNewGoal({ title: '', target: '', type: 'savings' });
    setShowAddGoal(false);
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient">Goals & Savings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your savings goals and milestones.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddGoal(true)}>
          <Plus size={20} /> Add Goal
        </button>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: goals.length === 1 ? '1fr' : '1fr 1fr' }}>
        {goals.map(goal => {
          const percentage = Math.min((goal.current / goal.target) * 100, 100);
          const isTargetMet = goal.current >= goal.target;
          const isDebt = goal.type === 'debt';
          
          return (
            <div key={goal.id} className="panel glass-panel" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '24px', right: '24px', opacity: 0.2 }}>
                {isDebt ? <CreditCard size={64} /> : <Target size={64} />}
              </div>
              
              <div className="panel-header">
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{goal.title}</h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    background: isDebt ? 'var(--danger-bg)' : 'var(--success-bg)',
                    color: isDebt ? 'var(--danger)' : 'var(--success)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {isDebt ? 'Debt repayment' : 'Savings goal'}
                  </span>
                </div>
              </div>
              
              <div style={{ margin: '32px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {isDebt ? 'Paid so far' : 'Saved'}
                  </span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {formatCurrency(goal.current)} <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>/ {formatCurrency(goal.target)}</span>
                  </span>
                </div>
                
                <div className="goal-progress-bar" style={{ height: '12px' }}>
                  <div 
                    className="goal-progress-fill" 
                    style={{ 
                      width: `${percentage}%`,
                      background: isDebt 
                        ? 'linear-gradient(90deg, var(--warning), var(--danger))' 
                        : 'linear-gradient(90deg, var(--success), var(--info))'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{percentage.toFixed(1)}% complete</span>
                  {isTargetMet && <span style={{ color: 'var(--success)', fontWeight: 600 }}>Completed! 🎉</span>}
                </div>
              </div>
              
              {/* Action buttons */}
              {!isTargetMet && selectedGoal?.id !== goal.id && (
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', marginTop: 'auto' }}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <Plus size={18} /> {isDebt ? 'Make Payment' : 'Add Funds'}
                </button>
              )}
              
              {selectedGoal?.id === goal.id && (
                <form onSubmit={handleContribute} style={{ marginTop: '24px', background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="Amount (Rs.)" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="1"
                      step="1"
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0 16px' }}>
                      Add
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedGoal(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginTop: '12px', fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Goal management buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {goal.current > 0 && (
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px', color: 'var(--warning)' }}
                    onClick={() => { if (window.confirm(`Reset "${goal.title}" progress to Rs. 0?`)) resetGoalAmount(goal.id); }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
                <button 
                  className="btn-danger" 
                  style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  onClick={() => { if (window.confirm(`Delete "${goal.title}"?`)) deleteGoal(goal.id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="panel glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Target size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.4 }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '16px' }}>No goals yet. Start tracking your financial milestones!</div>
          <button className="btn-primary" onClick={() => setShowAddGoal(true)}>
            <Plus size={18} /> Create Your First Goal
          </button>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="header" style={{ marginBottom: '24px' }}>
              <h2 className="panel-title">Add New Goal</h2>
              <button onClick={() => setShowAddGoal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddGoal}>
              <div className="form-group">
                <label>Goal Name</label>
                <input type="text" className="input-field" placeholder="e.g., Emergency Fund"
                  value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (Rs.)</label>
                  <input type="number" className="input-field" placeholder="500000" min="1" step="1"
                    value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="input-field" value={newGoal.type} onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}>
                    <option value="savings">Savings Goal</option>
                    <option value="debt">Debt Repayment</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddGoal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
