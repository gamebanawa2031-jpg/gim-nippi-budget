import React, { useState } from 'react';
import { useFinance, formatCurrency, getDaysUntilWedding, WEDDING_DATE } from '../context/FinanceContext';
import { Heart, Plus, Trash2, ChevronDown, ChevronUp, Check, X, Edit3, Settings, Users, PhoneCall, Gift } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const WEDDING_CATEGORIES = ['Venue', 'Catering', 'Photography', 'Attire', 'Decorations', 'Entertainment', 'Invitations', 'Transport', 'Accommodation', 'Miscellaneous'];
const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#D946EF', '#06B6D4', 
  '#8B5CF6', '#F43F5E', '#84CC16', '#F97316', '#64748B',
  '#14B8A6', '#EAB308', '#EC4899', '#6366F1', '#22C55E',
  '#F87171', '#A855F7', '#0EA5E9', '#D97706', '#BE123C'
];

const WeddingPlanner = () => {
  const {
    weddingTasks, addWeddingTask, deleteWeddingTask,
    addWeddingExpense, deleteWeddingExpense, toggleWeddingExpensePaid,
    weddingTotalBudget, weddingTotalAllocated, weddingTotalSpent, weddingTotalPaid,
    setWeddingBudget,
    weddingInvitees, addWeddingInvitee, updateWeddingInvitee, deleteWeddingInvitee
  } = useFinance();

  const [expandedTask, setExpandedTask] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  
  const [activeTab, setActiveTab] = useState('tasks');
  const [newInvitee, setNewInvitee] = useState({ name: '', count: 1, expectedFunds: 5000 });

  // Add task form
  const [newTask, setNewTask] = useState({ taskName: '', category: 'Venue', budgetAllocated: '' });
  // Add expense form  
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });

  const daysLeft = getDaysUntilWedding();
  const remaining = weddingTotalBudget - weddingTotalSpent;
  const budgetProgress = weddingTotalBudget > 0 ? (weddingTotalSpent / weddingTotalBudget) * 100 : 0;
  const allocatedProgress = weddingTotalBudget > 0 ? (weddingTotalAllocated / weddingTotalBudget) * 100 : 0;
  const unallocated = weddingTotalBudget - weddingTotalAllocated;

  // Budget allocation chart data
  const budgetChartData = weddingTasks.map((task) => ({
    name: task.taskName,
    value: task.budgetAllocated,
  }));
  // Add unallocated slice if any
  if (unallocated > 0) {
    budgetChartData.push({ name: 'Unallocated', value: unallocated });
  }

  // Invitee Calculations
  const totalInvitees = weddingInvitees?.reduce((sum, inv) => sum + Number(inv.count || 1), 0) || 0;
  const totalCalled = weddingInvitees?.filter(inv => inv.status === 'called' || inv.status === 'confirmed').reduce((sum, inv) => sum + Number(inv.count || 1), 0) || 0;
  const totalConfirmed = weddingInvitees?.filter(inv => inv.status === 'confirmed').reduce((sum, inv) => sum + Number(inv.count || 1), 0) || 0;
  const totalExpectedFunds = weddingInvitees?.reduce((sum, inv) => sum + Number(inv.expectedFunds || 0), 0) || 0;

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.taskName || !newTask.budgetAllocated) return;
    addWeddingTask({ ...newTask, budgetAllocated: Number(newTask.budgetAllocated) });
    setNewTask({ taskName: '', category: 'Venue', budgetAllocated: '' });
    setShowAddTask(false);
  };

  const handleAddExpense = (e, taskId) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    addWeddingExpense(taskId, { ...newExpense, amount: Number(newExpense.amount), paid: false });
    setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    setShowAddExpense(null);
  };

  const handleSaveBudget = () => {
    const val = Number(budgetInput);
    if (val > 0) {
      setWeddingBudget(val);
    }
    setEditingBudget(false);
  };

  const startEditBudget = () => {
    setBudgetInput(weddingTotalBudget.toString());
    setEditingBudget(true);
  };

  const handleAddInvitee = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newInvitee.name) return;
    
    const finalCount = Number(newInvitee.count) || 1;
    const finalFunds = newInvitee.expectedFunds !== '' ? Number(newInvitee.expectedFunds) : finalCount * 5000;
    
    addWeddingInvitee({ 
      name: newInvitee.name, 
      count: finalCount, 
      expectedFunds: finalFunds
    });
    setNewInvitee({ name: '', count: 1, expectedFunds: 5000 });
  };

  const handleCountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setNewInvitee({ ...newInvitee, count: '', expectedFunds: '' });
    } else {
      const count = parseInt(val, 10);
      setNewInvitee({ ...newInvitee, count, expectedFunds: count * 5000 });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div>
          <h1 className="text-gradient-wedding">Wedding Planner</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {daysLeft} days until your big day — {WEDDING_DATE.toLocaleDateString('en-LK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'tasks' && (
            <>
              <button className="btn-secondary" onClick={startEditBudget} style={{ color: 'var(--wedding-primary)', borderColor: 'var(--wedding-glow)' }}>
                <Settings size={18} /> Set Budget
              </button>
              <button className="btn-wedding" onClick={() => setShowAddTask(true)}>
                <Plus size={20} /> Add Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <button 
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'tasks' ? '3px solid var(--wedding-primary)' : '3px solid transparent', color: activeTab === 'tasks' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'tasks' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('tasks')}
        >
          Budget & Tasks
        </button>
        <button 
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'invitees' ? '3px solid var(--wedding-primary)' : '3px solid transparent', color: activeTab === 'invitees' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'invitees' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('invitees')}
        >
          Guest List
        </button>
      </div>

      {activeTab === 'tasks' && (
        <>
      {/* Budget Editor Inline */}
      {editingBudget && (
        <div className="panel glass-panel" style={{ marginBottom: '24px', padding: '20px', borderTop: '4px solid var(--wedding-primary)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', color: 'var(--wedding-primary)' }}>Set Total Wedding Budget</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Rs.</span>
              <input
                type="number" className="input-field"
                style={{ paddingLeft: '48px' }}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                min="1" step="1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()}
              />
            </div>
            <button className="btn-wedding" style={{ padding: '12px 20px' }} onClick={handleSaveBudget}>
              <Check size={18} /> Save
            </button>
            <button className="btn-secondary" style={{ padding: '12px' }} onClick={() => setEditingBudget(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Currently: {formatCurrency(weddingTotalBudget)} • Allocated to tasks: {formatCurrency(weddingTotalAllocated)}
            {unallocated > 0 && <span style={{ color: 'var(--success)' }}> • {formatCurrency(unallocated)} unallocated</span>}
            {unallocated < 0 && <span style={{ color: 'var(--danger)' }}> • Over-allocated by {formatCurrency(Math.abs(unallocated))}</span>}
          </div>
        </div>
      )}

      {/* Overall Budget Progress */}
      <div className="panel glass-panel" style={{ marginBottom: '24px', borderTop: '4px solid var(--wedding-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Overall Wedding Budget</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            {formatCurrency(weddingTotalSpent)} <span style={{ color: 'var(--text-muted)' }}>/ {formatCurrency(weddingTotalBudget)}</span>
          </span>
        </div>
        <div className="goal-progress-bar" style={{ height: '12px' }}>
          <div className="goal-progress-fill" style={{ 
            width: `${Math.min(budgetProgress, 100)}%`,
            background: budgetProgress > 100 
              ? 'linear-gradient(90deg, var(--danger), #ff6b6b)' 
              : 'linear-gradient(90deg, var(--wedding-primary), var(--wedding-secondary))'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>{budgetProgress.toFixed(1)}% spent</span>
          <span>{budgetProgress > 100 ? '⚠️ Over budget!' : `${formatCurrency(remaining)} remaining`}</span>
        </div>
        {/* Allocation bar */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>Task Allocation</span>
            <span>{formatCurrency(weddingTotalAllocated)} / {formatCurrency(weddingTotalBudget)} ({allocatedProgress.toFixed(0)}%)</span>
          </div>
          <div className="goal-progress-bar" style={{ height: '6px' }}>
            <div className="goal-progress-fill" style={{ 
              width: `${Math.min(allocatedProgress, 100)}%`,
              background: allocatedProgress > 100 
                ? 'linear-gradient(90deg, var(--warning), var(--danger))' 
                : 'linear-gradient(90deg, var(--info), var(--accent-secondary))'
            }} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--wedding-primary)' }}>
          <div className="summary-card-header">
            <span>Total Budget</span>
            <Heart size={18} color="var(--wedding-primary)" />
          </div>
          <div className="summary-card-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(weddingTotalBudget)}</div>
        </div>
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--warning)' }}>
          <div className="summary-card-header">
            <span>Total Committed</span>
          </div>
          <div className="summary-card-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(weddingTotalSpent)}</div>
        </div>
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--success)' }}>
          <div className="summary-card-header">
            <span>Already Paid</span>
          </div>
          <div className="summary-card-value" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{formatCurrency(weddingTotalPaid)}</div>
        </div>
        <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--info)' }}>
          <div className="summary-card-header">
            <span>Still To Pay</span>
          </div>
          <div className="summary-card-value" style={{ fontSize: '1.5rem', color: 'var(--info)' }}>{formatCurrency(weddingTotalSpent - weddingTotalPaid)}</div>
        </div>
      </div>

      {/* Content: Chart + Tasks */}
      <div className="content-grid-wide">
        {/* Tasks Column */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Wedding Tasks</h2>
          <div className="wedding-task-grid" style={{ gridTemplateColumns: '1fr' }}>
            {weddingTasks.map(task => {
              const taskSpent = task.items.reduce((s, i) => s + Number(i.amount), 0);
              const taskPaid = task.items.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
              const taskProgress = task.budgetAllocated > 0 ? (taskSpent / task.budgetAllocated) * 100 : 0;
              const isExpanded = expandedTask === task.id;
              const catIndex = WEDDING_CATEGORIES.indexOf(task.category);

              return (
                <div key={task.id} className="wedding-task-card glass-panel">
                  {/* Task Header */}
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '1.1rem' }}>{task.taskName}</h3>
                        <span className="wedding-category-badge">{task.category}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(taskSpent)} paid • {task.budgetAllocated - taskSpent > 0 
                          ? <span style={{ color: 'var(--wedding-primary)' }}>{formatCurrency(task.budgetAllocated - taskSpent)} still to pay</span> 
                          : task.budgetAllocated - taskSpent < 0 
                            ? <span style={{ color: 'var(--danger)' }}>Over budget by {formatCurrency(Math.abs(task.budgetAllocated - taskSpent))}</span>
                            : <span style={{ color: 'var(--success)' }}>Fully paid</span>
                        } • {task.items.length} items
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="goal-progress-bar" style={{ height: '6px', marginTop: '12px' }}>
                    <div className="goal-progress-fill" style={{ 
                      width: `${Math.min(taskProgress, 100)}%`,
                      background: taskProgress > 100 
                        ? 'linear-gradient(90deg, var(--danger), #ff6b6b)'
                        : `linear-gradient(90deg, ${CATEGORY_COLORS[catIndex >= 0 ? catIndex : 0]}, ${CATEGORY_COLORS[(catIndex + 1) % CATEGORY_COLORS.length]})`
                    }} />
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px' }}>
                      {/* Expense Items */}
                      {task.items.length > 0 ? (
                        <div>
                          {task.items.map(item => (
                            <div key={item.id} className={`wedding-expense-item ${item.paid ? 'paid' : ''}`}>
                              <button 
                                className={`wedding-checkbox ${item.paid ? 'checked' : ''}`}
                                onClick={() => toggleWeddingExpensePaid(task.id, item.id)}
                              >
                                {item.paid && <Check size={14} color="white" />}
                              </button>
                              <span className="expense-desc">{item.description}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(item.date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="expense-amount">{formatCurrency(item.amount)}</span>
                              <button 
                                onClick={() => deleteWeddingExpense(task.id, item.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>No expenses added yet.</p>
                      )}

                      {/* Add Expense Form */}
                      {showAddExpense === task.id ? (
                        <form onSubmit={(e) => handleAddExpense(e, task.id)} style={{ marginTop: '12px', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input 
                              type="text" className="input-field" placeholder="Description"
                              value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                              required style={{ flex: 2 }}
                            />
                            <input 
                              type="number" className="input-field" placeholder="Amount (Rs.)"
                              value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                              required min="1" step="1" style={{ flex: 1 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                              type="date" className="input-field" 
                              value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                              style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn-wedding" style={{ padding: '10px 16px' }}>Add</button>
                            <button type="button" onClick={() => setShowAddExpense(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                              <X size={18} />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button 
                            className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}
                            onClick={() => { setShowAddExpense(task.id); setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0] }); }}
                          >
                            <Plus size={16} /> Add Expense
                          </button>
                          <button 
                            className="btn-danger" style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                            onClick={() => deleteWeddingTask(task.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {weddingTasks.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', fontSize: '0.9rem' }}>
                No wedding tasks yet. Click "Add Task" to get started!
              </div>
            )}
          </div>
        </div>

        {/* Budget Chart */}
        <div className="panel glass-panel">
          <div className="panel-header">
            <h2 className="panel-title">Budget Allocation</h2>
          </div>
          <div style={{ height: '350px' }}>
            {budgetChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={budgetChartData} cx="50%" cy="40%" innerRadius={45} outerRadius={70} paddingAngle={0} dataKey="value" stroke="#ffffff" strokeWidth={2}>
                    {budgetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Unallocated' ? '#334155' : CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No tasks added yet.
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'invitees' && (
        <>
          {/* Invitee Summary Cards */}
          <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
            <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--info)' }}>
              <div className="summary-card-header">
                <span>Total Invitees</span>
                <Users size={18} color="var(--info)" />
              </div>
              <div className="summary-card-value" style={{ fontSize: '1.5rem' }}>{totalInvitees}</div>
            </div>
            <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--warning)' }}>
              <div className="summary-card-header">
                <span>Already Called</span>
                <PhoneCall size={18} color="var(--warning)" />
              </div>
              <div className="summary-card-value" style={{ fontSize: '1.5rem' }}>{totalCalled} <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>/ {totalInvitees}</span></div>
            </div>
            <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--success)' }}>
              <div className="summary-card-header">
                <span>Confirmed</span>
                <Check size={18} color="var(--success)" />
              </div>
              <div className="summary-card-value" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{totalConfirmed} <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>/ {totalInvitees}</span></div>
            </div>
            <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--wedding-primary)' }}>
              <div className="summary-card-header">
                <span>Expected Funds</span>
                <Gift size={18} color="var(--wedding-primary)" />
              </div>
              <div className="summary-card-value" style={{ fontSize: '1.5rem', color: 'var(--wedding-primary)' }}>{formatCurrency(totalExpectedFunds)}</div>
            </div>
          </div>

          {/* Invitee List */}
          <div className="panel glass-panel">
            <h2 className="panel-title" style={{ marginBottom: '16px' }}>Guest List</h2>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500, textAlign: 'center', width: '100px' }}>Count</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500, textAlign: 'right', width: '150px' }}>Expected Funds</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500, textAlign: 'center', width: '150px' }}>Status</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500, textAlign: 'right', width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Add New Row */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                    <td style={{ padding: '8px' }}>
                      <input type="text" className="input-field" placeholder="Guest name..." 
                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                        value={newInvitee.name} onChange={(e) => setNewInvitee({...newInvitee, name: e.target.value})} 
                        onKeyDown={(e) => e.key === 'Enter' && handleAddInvitee()}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" className="input-field" min="1" step="1"
                        style={{ padding: '8px 12px', fontSize: '0.9rem', textAlign: 'center' }}
                        value={newInvitee.count} onChange={handleCountChange} 
                        onKeyDown={(e) => e.key === 'Enter' && handleAddInvitee()}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" className="input-field" min="0" step="1"
                        style={{ padding: '8px 12px', fontSize: '0.9rem', textAlign: 'right' }}
                        value={newInvitee.expectedFunds} onChange={(e) => setNewInvitee({...newInvitee, expectedFunds: e.target.value})} 
                        onKeyDown={(e) => e.key === 'Enter' && handleAddInvitee()}
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Pending</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button 
                        onClick={handleAddInvitee}
                        className="btn-wedding"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        disabled={!newInvitee.name}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </td>
                  </tr>

                  {/* Existing Rows */}
                  {weddingInvitees.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        No guests added yet. Add someone using the row above!
                      </td>
                    </tr>
                  )}
                  {weddingInvitees.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{inv.name}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>{inv.count}</span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--wedding-primary)' }}>{formatCurrency(inv.expectedFunds)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <select 
                          className="input-field" 
                          style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', display: 'inline-block', backgroundColor: inv.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' : inv.status === 'called' ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-surface)' }}
                          value={inv.status}
                          onChange={(e) => updateWeddingInvitee(inv.id, { status: e.target.value })}
                        >
                          <option value="pending">Pending</option>
                          <option value="called">Already Called</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => deleteWeddingInvitee(inv.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Remove Invitee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="header" style={{ marginBottom: '24px' }}>
              <h2 className="panel-title">Add Wedding Task</h2>
              <button onClick={() => setShowAddTask(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddTask}>
              <div className="form-group">
                <label>Task Name</label>
                <input type="text" className="input-field" placeholder="e.g., Wedding Venue" 
                  value={newTask.taskName} onChange={(e) => setNewTask({...newTask, taskName: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field" value={newTask.category} onChange={(e) => setNewTask({...newTask, category: e.target.value})}>
                    {WEDDING_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget (Rs.)</label>
                  <input type="number" className="input-field" placeholder="500000" min="1" step="1"
                    value={newTask.budgetAllocated} onChange={(e) => setNewTask({...newTask, budgetAllocated: e.target.value})} required />
                </div>
              </div>
              {newTask.budgetAllocated && unallocated > 0 && Number(newTask.budgetAllocated) > unallocated && (
                <div style={{ fontSize: '0.78rem', color: 'var(--warning)', marginBottom: '8px' }}>
                  ⚠️ This exceeds your unallocated budget of {formatCurrency(unallocated)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button>
                <button type="submit" className="btn-wedding">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default WeddingPlanner;
