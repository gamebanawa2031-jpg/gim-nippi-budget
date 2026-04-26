import React, { useState } from 'react';
import { useFinance, formatCurrency } from '../context/FinanceContext';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, Trash2, Calendar, ShieldCheck } from 'lucide-react';

const CreditCardManager = () => {
  const { creditCards, addCreditCard, deleteCreditCard, addCardTransaction, deleteCardTransaction } = useFinance();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(creditCards[0]?.id || null);
  
  const [newCard, setNewCard] = useState({ name: '', limit: '' });
  const [newTx, setNewTx] = useState({ type: 'payment', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  const handleAddCard = async (e) => {
    e.preventDefault();
    await addCreditCard({ name: newCard.name, limit: Number(newCard.limit) });
    setNewCard({ name: '', limit: '' });
    setIsAddCardOpen(false);
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    await addCardTransaction(selectedCardId, {
      ...newTx,
      amount: Number(newTx.amount)
    });
    setNewTx({ type: 'payment', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setIsAddTxOpen(false);
  };

  return (
    <div className="cc-manager">
      <div className="header">
        <div>
          <h1 className="text-gradient">Credit Card Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your card spending and repayments.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddCardOpen(true)}>
          <Plus size={20} />
          Add New Card
        </button>
      </div>

      <div className="cc-grid">
        {/* Card List */}
        <div className="cc-list-panel glass-panel">
          <h2 className="panel-title" style={{ marginBottom: '16px' }}>Your Cards</h2>
          <div className="cards-stack">
            {creditCards.map(card => (
              <div 
                key={card.id} 
                className={`cc-item ${selectedCardId === card.id ? 'active' : ''}`}
                onClick={() => setSelectedCardId(card.id)}
              >
                <div className="cc-item-info">
                  <CreditCard size={20} color={selectedCardId === card.id ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  <div>
                    <div className="cc-name">{card.name}</div>
                    <div className="cc-balance">{formatCurrency(card.balance)} used</div>
                  </div>
                </div>
                <button 
                  className="delete-btn-icon" 
                  onClick={(e) => { e.stopPropagation(); deleteCreditCard(card.id); }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {creditCards.length === 0 && (
              <div className="empty-state">No cards added yet.</div>
            )}
          </div>
        </div>

        {/* Selected Card Details */}
        <div className="cc-details-panel">
          {selectedCard ? (
            <>
              <div className="cc-status-row">
                <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                  <div className="summary-card-header">
                    <span>Outstanding Balance</span>
                    <CreditCard size={20} color="var(--accent-primary)" />
                  </div>
                  <div className="summary-card-value">{formatCurrency(selectedCard.balance)}</div>
                  <div className="utilization-bar">
                    <div 
                      className="utilization-progress" 
                      style={{ 
                        width: `${Math.min((selectedCard.balance / selectedCard.limit) * 100, 100)}%`,
                        backgroundColor: (selectedCard.balance / selectedCard.limit) > 0.8 ? 'var(--danger)' : 'var(--accent-primary)'
                      }} 
                    />
                  </div>
                  <div className="utilization-text">
                    {((selectedCard.balance / selectedCard.limit) * 100).toFixed(1)}% of {formatCurrency(selectedCard.limit)} limit
                  </div>
                </div>

                <div className="summary-card glass-panel" style={{ borderTop: '4px solid var(--success)' }}>
                  <div className="summary-card-header">
                    <span>Available Credit</span>
                    <ShieldCheck size={20} color="var(--success)" />
                  </div>
                  <div className="summary-card-value">{formatCurrency(selectedCard.limit - selectedCard.balance)}</div>
                </div>
              </div>

              <div className="panel glass-panel" style={{ marginTop: '24px' }}>
                <div className="panel-header">
                  <h2 className="panel-title">Transaction History</h2>
                  <button className="btn-secondary" onClick={() => setIsAddTxOpen(true)}>
                    <Plus size={18} />
                    Add Transaction
                  </button>
                </div>
                <div className="transaction-list">
                  {selectedCard.transactions.length > 0 ? (
                    selectedCard.transactions.map(tx => (
                      <div key={tx.id} className="transaction-item">
                        <div className="transaction-info">
                          <div className={`transaction-icon ${tx.type === 'payment' ? 'expense' : 'income'}`}>
                            {tx.type === 'payment' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                          </div>
                          <div className="transaction-details">
                            <h4>{tx.description}</h4>
                            <p>{tx.type === 'payment' ? 'Spending' : 'Repayment'} • {new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="transaction-right">
                          <div className={`transaction-amount ${tx.type === 'payment' ? 'expense' : 'income'}`}>
                            {tx.type === 'payment' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </div>
                          <button 
                            className="delete-btn-icon" 
                            onClick={() => deleteCardTransaction(selectedCard.id, tx.id)}
                            style={{ marginLeft: '12px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No transactions yet.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel empty-selection">
              <CreditCard size={48} color="var(--text-muted)" />
              <p>Select a card to view details or add a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 className="panel-title" style={{ marginBottom: '24px' }}>Add New Credit Card</h2>
            <form onSubmit={handleAddCard}>
              <div className="form-group">
                <label>Card Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCard.name} 
                  onChange={(e) => setNewCard({...newCard, name: e.target.value})}
                  placeholder="e.g. HNB Visa Signature"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Credit Limit (Rs.)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newCard.limit} 
                  onChange={(e) => setNewCard({...newCard, limit: e.target.value})}
                  placeholder="e.g. 500000"
                  required 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddCardOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddTxOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 className="panel-title" style={{ marginBottom: '24px' }}>Add Card Transaction</h2>
            <form onSubmit={handleAddTx}>
              <div className="form-group">
                <label>Transaction Type</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="txType" 
                      value="payment" 
                      checked={newTx.type === 'payment'} 
                      onChange={() => setNewTx({...newTx, type: 'payment'})} 
                    />
                    Payment (Spending)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="txType" 
                      value="repayment" 
                      checked={newTx.type === 'repayment'} 
                      onChange={() => setNewTx({...newTx, type: 'repayment'})} 
                    />
                    Repayment (Paying off)
                  </label>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (Rs.)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={newTx.amount} 
                    onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newTx.date} 
                    onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newTx.description} 
                  onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                  placeholder="e.g. Supermarket"
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddTxOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cc-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          margin-top: 24px;
        }
        .cc-list-panel {
          height: fit-content;
        }
        .cards-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cc-item {
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cc-item:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(4px);
        }
        .cc-item.active {
          background: var(--accent-primary-glow);
          border-color: var(--accent-primary);
        }
        .cc-item-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .cc-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .cc-balance {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .cc-status-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .utilization-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin: 16px 0 8px;
          overflow: hidden;
        }
        .utilization-progress {
          height: 100%;
          transition: width 0.5s ease;
        }
        .utilization-text {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .transaction-right {
          display: flex;
          align-items: center;
        }
        .empty-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px;
          color: var(--text-muted);
          text-align: center;
          gap: 16px;
        }
        .delete-btn-icon {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .delete-btn-icon:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }
        .empty-state {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .cc-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditCardManager;
