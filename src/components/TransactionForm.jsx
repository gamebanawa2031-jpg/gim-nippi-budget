/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { X } from 'lucide-react';

const TransactionForm = ({ isOpen, onClose, defaultType = 'expense' }) => {
  const { addTransaction, incomeCategories, expenseCategories, addCategory } = useFinance();
  
  const [formData, setFormData] = useState({
    type: defaultType,
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Reset form when modal opens or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: defaultType,
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setIsCustomCategory(false);
      setCustomCategory('');
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    if (e.target.name === 'category' && e.target.value === 'ADD_CUSTOM') {
      setIsCustomCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let finalCategory = formData.category;
    if (isCustomCategory && customCategory) {
      finalCategory = customCategory;
      await addCategory(formData.type, customCategory);
    }

    addTransaction({
      ...formData,
      category: finalCategory,
      amount: Number(formData.amount)
    });
    
    setFormData({ type: defaultType, amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
    onClose();
  };

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="header" style={{ marginBottom: '24px' }}>
          <h2 className="panel-title">Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="type" 
                  value="expense" 
                  checked={formData.type === 'expense'} 
                  onChange={handleChange} 
                />
                Expense
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="type" 
                  value="income" 
                  checked={formData.type === 'income'} 
                  onChange={handleChange} 
                />
                Income
              </label>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Amount (Rs.)</label>
              <input 
                type="number" 
                name="amount" 
                value={formData.amount} 
                onChange={handleChange} 
                className="input-field" 
                required 
                min="1" 
                step="1" 
              />
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                className="input-field" 
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Category</label>
            {!isCustomCategory ? (
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                className="input-field" 
                required
              >
                <option value="" disabled>Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="ADD_CUSTOM" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>+ Add Custom Category</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="input-field"
                  placeholder="Enter new category name"
                  required
                  autoFocus
                />
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsCustomCategory(false)}
                  style={{ padding: '8px 12px' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <input 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              className="input-field" 
              placeholder="e.g. Weekly groceries" 
              required 
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Transaction</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;

