import React, { useState } from 'react';
import { useFinance, formatCurrency } from '../context/FinanceContext';
import { Trash2, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import TransactionForm from './TransactionForm';

const TransactionList = () => {
  const { transactions, deleteTransaction } = useFinance();
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const openModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient">Transactions</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your income and expenses.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => openModal('income')} style={{ color: 'var(--success)' }}>
            <Plus size={18} /> Add Income
          </button>
          <button className="btn-secondary" onClick={() => openModal('expense')} style={{ color: 'var(--danger)' }}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      <div className="panel glass-panel">
        <div className="panel-header" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              className={`btn-secondary ${filter === 'all' ? 'active' : ''}`}
              style={filter === 'all' ? { background: 'var(--accent-primary)', color: 'white', borderColor: 'var(--accent-primary)' } : {}}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`btn-secondary`}
              style={filter === 'income' ? { background: 'var(--success)', color: 'white', borderColor: 'var(--success)' } : {}}
              onClick={() => setFilter('income')}
            >
              Income
            </button>
            <button 
              className={`btn-secondary`}
              style={filter === 'expense' ? { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' } : {}}
              onClick={() => setFilter('expense')}
            >
              Expense
            </button>
          </div>
        </div>

        <div className="transaction-list">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(t => (
              <div key={t.id} className="transaction-item" style={{ padding: '20px 0' }}>
                <div className="transaction-info">
                  <div className={`transaction-icon ${t.type}`}>
                    {t.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div className="transaction-details">
                    <h4 style={{ fontSize: '1.1rem' }}>{t.description || t.category}</h4>
                    <p>{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div className={`transaction-amount ${t.type}`} style={{ fontSize: '1.2rem' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                  <button 
                    onClick={() => deleteTransaction(t.id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title="Delete transaction"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              No transactions found.
            </div>
          )}
        </div>
      </div>
      
      <TransactionForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultType={modalType} />
    </div>
  );
};

export default TransactionList;
