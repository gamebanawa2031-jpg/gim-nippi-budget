import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  doc, onSnapshot, setDoc, updateDoc, collection, 
  query, getDocs, writeBatch, getDoc, runTransaction 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

// ===== CURRENCY HELPERS =====
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyShort = (amount) => {
  if (amount >= 1000000) return `Rs. ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(0)}K`;
  return `Rs. ${amount}`;
};

// ===== WEDDING DATE =====
export const WEDDING_DATE = new Date('2026-08-01');

export const getDaysUntilWedding = () => {
  const now = new Date();
  const diff = WEDDING_DATE - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// ===== EMI CALCULATION HELPERS (Calculations remain local) =====
export const calculateEMI = (principal, annualRate, tenureMonths, method = 'flat') => {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return null;
  let emi, schedule, totalInterest;
  if (method === 'flat') {
    const years = tenureMonths / 12;
    totalInterest = Math.round(principal * (annualRate / 100) * years);
    const totalPayment = principal + totalInterest;
    emi = Math.round(totalPayment / tenureMonths);
    const monthlyInterest = Math.round(totalInterest / tenureMonths);
    const monthlyCapital = Math.round(principal / tenureMonths);
    schedule = [];
    let balance = principal;
    let interestLeft = totalInterest;
    let capitalLeft = principal;
    for (let month = 1; month <= tenureMonths; month++) {
      let interest, capital, monthEmi;
      if (month === tenureMonths) {
        interest = interestLeft;
        capital = capitalLeft;
      } else {
        interest = monthlyInterest;
        capital = monthlyCapital;
      }
      monthEmi = interest + capital;
      capitalLeft -= capital;
      interestLeft -= interest;
      balance = Math.max(balance - capital, 0);
      schedule.push({ month, emi: monthEmi, interest, capital, balance });
    }
  } else {
    const r = annualRate / 100 / 12;
    const emiRaw = principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1);
    emi = Math.round(emiRaw);
    schedule = [];
    let balance = principal;
    totalInterest = 0;
    for (let month = 1; month <= tenureMonths; month++) {
      const interest = Math.round(balance * r);
      let capital, monthEmi;
      if (month === tenureMonths) {
        capital = balance;
        monthEmi = capital + interest;
      } else {
        monthEmi = emi;
        capital = emi - interest;
      }
      balance = Math.max(balance - capital, 0);
      totalInterest += interest;
      schedule.push({ month, emi: monthEmi, interest, capital, balance });
    }
  }
  const totalPayment = principal + totalInterest;
  let monthlyIRR = 0;
  if (method === 'flat') {
    let rLow = 0.0, rHigh = 1.0;
    let rMid = (rLow + rHigh) / 2;
    for (let i = 0; i < 50; i++) {
      rMid = (rLow + rHigh) / 2;
      const pv = rMid > 0 ? (emi * (1 - Math.pow(1 + rMid, -tenureMonths))) / rMid : 0;
      if (pv > principal) rLow = rMid;
      else rHigh = rMid;
    }
    monthlyIRR = rMid;
  } else {
    monthlyIRR = annualRate / 100 / 12;
  }
  const aer = (Math.pow(1 + monthlyIRR, 12) - 1) * 100;
  return { emi, totalPayment, totalInterest, aer, schedule };
};

export const calculateLoanPaymentHistory = (principal, annualRate, tenureMonths, method, payments) => {
  const original = calculateEMI(principal, annualRate, tenureMonths, method);
  if (!original) return null;
  const r = annualRate / 100 / 12;
  let balance = principal;
  const history = [];
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalExtraPaid = 0;
  payments.forEach((payment, index) => {
    const monthInterest = Math.round(balance * r);
    const actualPrincipal = Math.min(payment.amount - monthInterest, balance);
    balance = Math.max(balance - actualPrincipal, 0);
    totalInterestPaid += monthInterest;
    totalPrincipalPaid += actualPrincipal;
    const extra = Math.max(payment.amount - original.emi, 0);
    totalExtraPaid += extra;
    history.push({
      month: index + 1,
      date: payment.date,
      payment: payment.amount,
      interest: monthInterest,
      principal: actualPrincipal,
      balance,
      originalEmi: original.emi,
      extraPaid: extra,
      interestRatio: payment.amount > 0 ? (monthInterest / payment.amount) * 100 : 0,
    });
  });
  let projectedRemainingMonths = 0;
  let projectedRemainingInterest = 0;
  let tempBalance = balance;
  if (tempBalance > 0 && r > 0) {
    while (tempBalance > 0 && projectedRemainingMonths < tenureMonths * 3) {
      projectedRemainingMonths++;
      const monthInt = Math.round(tempBalance * r);
      const pmt = Math.min(original.emi, tempBalance + monthInt);
      const cap = pmt - monthInt;
      tempBalance = Math.max(tempBalance - cap, 0);
      projectedRemainingInterest += monthInt;
    }
  }
  const projectedTotalInterest = totalInterestPaid + projectedRemainingInterest;
  const interestSaved = Math.max(original.totalInterest - projectedTotalInterest, 0);
  const projectedTotalMonths = payments.length + projectedRemainingMonths;
  const monthsSaved = Math.max(tenureMonths - projectedTotalMonths, 0);
  const nextMonthInterest = balance > 0 ? Math.round(balance * r) : 0;
  return {
    history,
    currentBalance: balance,
    totalInterestPaid,
    totalPrincipalPaid,
    totalExtraPaid,
    totalPaid: payments.reduce((s, p) => s + p.amount, 0),
    originalEmi: original.emi,
    originalTotalInterest: original.totalInterest,
    originalTotalPayment: original.totalPayment,
    originalTenure: tenureMonths,
    projectedRemainingMonths,
    projectedTotalMonths,
    monthsSaved,
    interestSaved,
    nextMonthInterest,
    nextMinPayment: nextMonthInterest + (balance > 0 ? Math.round((balance) / Math.max(projectedRemainingMonths, 1)) : 0),
    isCompleted: balance <= 0,
    principalPayoffPercent: principal > 0 ? (totalPrincipalPaid / principal) * 100 : 0,
  };
};

export const calculateOverpaymentImpact = (principal, annualRate, tenureMonths, method, extraAmount) => {
  const original = calculateEMI(principal, annualRate, tenureMonths, method);
  if (!original || extraAmount <= 0) return null;
  const newEmi = original.emi + extraAmount;
  if (method === 'reducing') {
    const r = annualRate / 100 / 12;
    let balance = principal;
    let totalInterest = 0;
    let months = 0;
    const schedule = [];
    while (balance > 0 && months < tenureMonths * 2) {
      months++;
      const interest = Math.round(balance * r);
      let payment = Math.min(newEmi, balance + interest);
      let capital = payment - interest;
      if (capital > balance) {
        capital = balance;
        payment = capital + interest;
      }
      balance = Math.max(balance - capital, 0);
      totalInterest += interest;
      schedule.push({ month: months, emi: payment, interest, capital, balance });
    }
    return {
      newEmi,
      newTenure: months,
      newTotalInterest: totalInterest,
      newTotalPayment: principal + totalInterest,
      monthsSaved: tenureMonths - months,
      interestSaved: original.totalInterest - totalInterest,
      totalSaved: original.totalPayment - (principal + totalInterest),
      schedule,
    };
  } else {
    const totalPayment = principal + original.totalInterest;
    const newMonths = Math.ceil(totalPayment / newEmi);
    const lastPayment = totalPayment - (newEmi * (newMonths - 1));
    return {
      newEmi,
      newTenure: newMonths,
      newTotalInterest: original.totalInterest,
      newTotalPayment: original.totalPayment,
      monthsSaved: tenureMonths - newMonths,
      interestSaved: 0,
      totalSaved: 0,
      schedule: [],
    };
  }
};

// ===== PROVIDER =====
// Helper to count total data items
const countDataItems = (data) => {
  return (data.transactions?.length || 0) +
    (data.goals?.length || 0) +
    (data.weddingTasks?.length || 0) +
    (data.weddingInvitees?.length || 0) +
    (data.loans?.length || 0) +
    (data.creditCards?.length || 0);
};

const BACKUP_KEY = 'gim_nippi_auto_backup';
const BACKUP_TIME_KEY = 'gim_nippi_backup_time';

export const FinanceProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [weddingTasks, setWeddingTasks] = useState([]);
  const [weddingInvitees, setWeddingInvitees] = useState([]);
  const [weddingOverallBudget, setWeddingOverallBudget] = useState(2500000);
  const [loans, setLoans] = useState([]);
  const [appName, setAppNameState] = useState('Gim & Nippi Budget');
  const [incomeCategories, setIncomeCategories] = useState(['Salary', 'Fiverr', 'Investment', 'Other Income']);
  const [expenseCategories, setExpenseCategories] = useState(['Housing', 'Food', 'Groceries', 'Transportation', 'Utilities', 'Insurance', 'Medical', 'Saving', 'Personal', 'Debt', 'Wedding', 'Other Expense']);
  const [creditCards, setCreditCards] = useState([]);

  // Auto-backup states
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [localBackupInfo, setLocalBackupInfo] = useState(null);

  // Handle Auth & Cloud Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Shared Household ID (everyone uses 'main_budget' document for now)
      // You can expand this later to have separate households
      const householdId = 'household_1'; 
      const budgetDocRef = doc(db, 'budgets', householdId);

      // Listen for changes
      const unsubscribeSnap = onSnapshot(budgetDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTransactions(data.transactions || []);
          setGoals(data.goals || []);
          setWeddingTasks(data.weddingTasks || []);
          setWeddingInvitees(data.weddingInvitees || []);
          setWeddingOverallBudget(data.weddingOverallBudget || 2500000);
          setLoans(data.loans || []);
          setAppNameState(data.appName || 'Gim & Nippi Budget');
          if (data.incomeCategories) setIncomeCategories(data.incomeCategories);
          if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
          setCreditCards(data.creditCards || []);
          
          // ===== AUTO-BACKUP LOGIC =====
          const cloudItemCount = countDataItems(data);
          
          if (cloudItemCount > 0) {
            // Cloud has data — save backup to localStorage
            try {
              const backupPayload = {
                transactions: data.transactions || [],
                goals: data.goals || [],
                weddingTasks: data.weddingTasks || [],
                weddingInvitees: data.weddingInvitees || [],
                weddingOverallBudget: data.weddingOverallBudget || 2500000,
                loans: data.loans || [],
                appName: data.appName || 'Gim & Nippi Budget',
                incomeCategories: data.incomeCategories || [],
                expenseCategories: data.expenseCategories || [],
                creditCards: data.creditCards || [],
              };
              localStorage.setItem(BACKUP_KEY, JSON.stringify(backupPayload));
              localStorage.setItem(BACKUP_TIME_KEY, new Date().toISOString());
              setBackupAvailable(false); // cloud is fine, dismiss any banner
              console.log(`[Auto-Backup] Saved ${cloudItemCount} items to local backup`);
            } catch (e) {
              console.warn('[Auto-Backup] Save failed:', e);
            }
          } else {
            // Cloud is empty — check if local backup has data
            try {
              const localBackupRaw = localStorage.getItem(BACKUP_KEY);
              const localBackupTime = localStorage.getItem(BACKUP_TIME_KEY);
              if (localBackupRaw) {
                const backupData = JSON.parse(localBackupRaw);
                const backupItemCount = countDataItems(backupData);
                if (backupItemCount > 0) {
                  setBackupAvailable(true);
                  setLocalBackupInfo({
                    timestamp: localBackupTime,
                    transactions: backupData.transactions?.length || 0,
                    goals: backupData.goals?.length || 0,
                    weddingTasks: backupData.weddingTasks?.length || 0,
                    weddingInvitees: backupData.weddingInvitees?.length || 0,
                    loans: backupData.loans?.length || 0,
                    creditCards: backupData.creditCards?.length || 0,
                    totalItems: backupItemCount,
                  });
                  console.warn(`[Auto-Backup] Cloud data empty! Local backup has ${backupItemCount} items. Recovery available.`);
                }
              }
            } catch (e) {
              console.warn('[Auto-Backup] Check failed:', e);
            }
          }
          
          // One-time check for migration
          if (localStorage.getItem('finance_transactions') && (data.transactions || []).length === 0) {
            migrateLocalToCloud(budgetDocRef);
          }
        } else {
          // Document doesn't exist, try to migrate from local if it exists
          migrateLocalToCloud(budgetDocRef);
        }
        setLoading(false);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, []);

  const migrateLocalToCloud = async (docRef) => {
    const localData = {
      transactions: JSON.parse(localStorage.getItem('finance_transactions') || '[]'),
      goals: JSON.parse(localStorage.getItem('finance_goals') || '[]'),
      weddingTasks: JSON.parse(localStorage.getItem('finance_wedding_tasks') || '[]'),
      weddingInvitees: JSON.parse(localStorage.getItem('finance_wedding_invitees') || '[]'),
      weddingOverallBudget: Number(localStorage.getItem('finance_wedding_budget') || '2500000'),
      loans: JSON.parse(localStorage.getItem('finance_loans') || '[]'),
      appName: localStorage.getItem('finance_app_name') || 'Gim & Nippi Budget'
    };

    if (localData.transactions.length > 0 || localData.loans.length > 0) {
      console.log('Migrating local data to cloud...');
      await setDoc(docRef, localData, { merge: true });
      // Clear local storage after migration to avoid repeated attempts
      localStorage.removeItem('finance_transactions');
      localStorage.removeItem('finance_goals');
      localStorage.removeItem('finance_wedding_tasks');
      localStorage.removeItem('finance_wedding_invitees');
      localStorage.removeItem('finance_wedding_budget');
      localStorage.removeItem('finance_loans');
      localStorage.removeItem('finance_app_name');
    } else {
      // Initialize empty if no local data
      await setDoc(docRef, { transactions: [], goals: [], weddingTasks: [], weddingInvitees: [], loans: [] }, { merge: true });
    }
  };

  const getDocRef = () => doc(db, 'budgets', 'household_1');

  // ===== ACTIONS (Update Firestore instead of local state) =====
  
  const addTransaction = async (transaction) => {
    const newTx = { ...transaction, id: Date.now().toString() };
    const updated = [newTx, ...transactions];
    await updateDoc(getDocRef(), { transactions: updated });
  };

  const deleteTransaction = async (id) => {
    const updated = transactions.filter(t => t.id !== id);
    await updateDoc(getDocRef(), { transactions: updated });
  };

  const clearAllTransactions = async () => {
    await updateDoc(getDocRef(), { transactions: [] });
  };

  const addGoal = async (goal) => {
    const updated = [...goals, { ...goal, id: Date.now().toString(), current: 0 }];
    await updateDoc(getDocRef(), { goals: updated });
  };

  const deleteGoal = async (goalId) => {
    const updated = goals.filter(g => g.id !== goalId);
    await updateDoc(getDocRef(), { goals: updated });
  };

  const addGoalAmount = async (goalId, amount) => {
    try {
      await runTransaction(db, async (transaction) => {
        const budgetDoc = await transaction.get(getDocRef());
        if (!budgetDoc.exists()) return;

        const data = budgetDoc.data();
        const goals = data.goals || [];
        const transactions = data.transactions || [];
        
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        const updatedGoals = goals.map(g => g.id === goalId ? { ...g, current: g.current + amount } : g);
        const mainTx = {
          id: `saving-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'transfer',
          category: 'Saving',
          amount: Number(amount),
          description: `Saving for ${goal.title}`,
          date: new Date().toLocaleDateString('en-CA')
        };

        transaction.update(getDocRef(), {
          goals: updatedGoals,
          transactions: [mainTx, ...transactions]
        });
      });
    } catch (error) {
      console.error("Error adding goal amount:", error);
    }
  };

  const resetGoalAmount = async (goalId) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, current: 0 } : g);
    await updateDoc(getDocRef(), { goals: updated });
  };

  const updateGoal = async (goalId, updates) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, ...updates } : g);
    await updateDoc(getDocRef(), { goals: updated });
  };

  const addWeddingTask = async (task) => {
    const updated = [...weddingTasks, { ...task, id: Date.now().toString(), items: [] }];
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const updateWeddingTask = async (taskId, updates) => {
    const updated = weddingTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const updateWeddingTaskBudget = async (taskId, newBudget) => {
    try {
      await runTransaction(db, async (transaction) => {
        const docRef = getDocRef();
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const tasks = data.weddingTasks || [];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const diff = Number(newBudget) - Number(task.budgetAllocated);
        const newOverallBudget = Number(data.weddingOverallBudget || 0) + diff;

        const updatedTasks = tasks.map(t => 
          t.id === taskId ? { ...t, budgetAllocated: Number(newBudget) } : t
        );

        transaction.update(docRef, {
          weddingTasks: updatedTasks,
          weddingOverallBudget: newOverallBudget
        });
      });
    } catch (error) {
      console.error("Error updating wedding task budget:", error);
    }
  };

  const deleteWeddingTask = async (taskId) => {
    const updated = weddingTasks.filter(t => t.id !== taskId);
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const addWeddingExpense = async (taskId, item) => {
    const updated = weddingTasks.map(t =>
      t.id === taskId
        ? { ...t, items: [...t.items, { ...item, id: Date.now().toString() }] }
        : t
    );
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const deleteWeddingExpense = async (taskId, itemId) => {
    const updated = weddingTasks.map(t =>
      t.id === taskId
        ? { ...t, items: t.items.filter(i => i.id !== itemId) }
        : t
    );
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const toggleWeddingExpensePaid = async (taskId, itemId) => {
    const updated = weddingTasks.map(t =>
      t.id === taskId
        ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, paid: !i.paid } : i) }
        : t
    );
    await updateDoc(getDocRef(), { weddingTasks: updated });
  };

  const setWeddingBudget = async (amount) => {
    await updateDoc(getDocRef(), { weddingOverallBudget: amount });
  };

  const addWeddingInvitee = async (invitee) => {
    const newInvitee = { 
      ...invitee, 
      id: Date.now().toString(),
      count: Number(invitee.count) || 1,
      expectedFunds: Number(invitee.expectedFunds) || (Number(invitee.count) || 1) * 5000,
      status: invitee.status || 'pending'
    };
    const updated = [...weddingInvitees, newInvitee];
    await updateDoc(getDocRef(), { weddingInvitees: updated });
  };

  const updateWeddingInvitee = async (id, updates) => {
    const updated = weddingInvitees.map(inv => inv.id === id ? { ...inv, ...updates } : inv);
    await updateDoc(getDocRef(), { weddingInvitees: updated });
  };

  const deleteWeddingInvitee = async (id) => {
    const updated = weddingInvitees.filter(inv => inv.id !== id);
    await updateDoc(getDocRef(), { weddingInvitees: updated });
  };

  const addLoan = async (loan) => {
    const updated = [...loans, { ...loan, id: Date.now().toString(), payments: [] }];
    await updateDoc(getDocRef(), { loans: updated });
  };

  const deleteLoan = async (id) => {
    const updated = loans.filter(l => l.id !== id);
    await updateDoc(getDocRef(), { loans: updated });
  };

  const addLoanPayment = async (loanId, payment) => {
    try {
      await runTransaction(db, async (transaction) => {
        const budgetDoc = await transaction.get(getDocRef());
        if (!budgetDoc.exists()) return;

        const data = budgetDoc.data();
        const loans = data.loans || [];
        const transactions = data.transactions || [];
        
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        const newPaymentId = Date.now().toString();
        const updatedLoans = loans.map(l =>
          l.id === loanId
            ? { ...l, payments: [...l.payments, { ...payment, id: newPaymentId }] }
            : l
        );

        const mainTx = {
          id: `loan-pmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'expense',
          category: 'Debt',
          amount: Number(payment.amount),
          description: `Loan Payment: ${loan.name}`,
          date: payment.date || new Date().toLocaleDateString('en-CA')
        };

        transaction.update(getDocRef(), { 
          loans: updatedLoans,
          transactions: [mainTx, ...transactions]
        });
      });
    } catch (error) {
      console.error("Error adding loan payment:", error);
    }
  };

  const deleteLoanPayment = async (loanId, paymentId) => {
    const updated = loans.map(l =>
      l.id === loanId
        ? { ...l, payments: l.payments.filter(p => p.id !== paymentId) }
        : l
    );
    await updateDoc(getDocRef(), { loans: updated });
  };

  const setAppName = async (name) => {
    await updateDoc(getDocRef(), { appName: name });
  };

  // ===== NEW ACTIONS FOR CATEGORIES & CREDIT CARDS =====
  
  const addCategory = async (type, name) => {
    if (type === 'income') {
      const updated = [...incomeCategories, name];
      await updateDoc(getDocRef(), { incomeCategories: updated });
    } else {
      const updated = [...expenseCategories, name];
      await updateDoc(getDocRef(), { expenseCategories: updated });
    }
  };

  const deleteCategory = async (type, name) => {
    if (type === 'income') {
      const updated = incomeCategories.filter(c => c !== name);
      await updateDoc(getDocRef(), { incomeCategories: updated });
    } else {
      const updated = expenseCategories.filter(c => c !== name);
      await updateDoc(getDocRef(), { expenseCategories: updated });
    }
  };

  const addCreditCard = async (card) => {
    const newCard = { 
      ...card, 
      id: Date.now().toString(), 
      balance: 0, 
      transactions: [] 
    };
    const updated = [...creditCards, newCard];
    await updateDoc(getDocRef(), { creditCards: updated });
  };

  const deleteCreditCard = async (id) => {
    const updated = creditCards.filter(c => c.id !== id);
    await updateDoc(getDocRef(), { creditCards: updated });
  };

  const addCardTransaction = async (cardId, cardTx) => {
    try {
      await runTransaction(db, async (transaction) => {
        const budgetDoc = await transaction.get(getDocRef());
        if (!budgetDoc.exists()) return;

        const data = budgetDoc.data();
        const creditCards = data.creditCards || [];
        const transactions = data.transactions || [];
        
        const card = creditCards.find(c => c.id === cardId);
        if (!card) return;

        const newTxId = Date.now().toString();
        const updatedCards = creditCards.map(c => {
          if (c.id === cardId) {
            const newCardTx = { ...cardTx, id: newTxId };
            const newBalance = cardTx.type === 'payment' 
              ? c.balance + Number(cardTx.amount)
              : c.balance - Number(cardTx.amount);
            return { 
              ...c, 
              balance: newBalance,
              transactions: [newCardTx, ...c.transactions] 
            };
          }
          return c;
        });

        const updates = { creditCards: updatedCards };

        if (cardTx.type === 'repayment') {
          const mainTx = {
            id: `cc-repay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: 'expense',
            category: 'Debt',
            amount: Number(cardTx.amount),
            description: `Credit Card Repayment: ${card.name}`,
            date: cardTx.date || new Date().toLocaleDateString('en-CA')
          };
          updates.transactions = [mainTx, ...transactions];
        }

        transaction.update(getDocRef(), updates);
      });
    } catch (error) {
      console.error("Error adding card transaction:", error);
    }
  };

  const deleteCardTransaction = async (cardId, transactionId) => {
    const updated = creditCards.map(card => {
      if (card.id === cardId) {
        const tx = card.transactions.find(t => t.id === transactionId);
        const newBalance = tx.type === 'payment'
          ? card.balance - Number(tx.amount)
          : card.balance + Number(tx.amount);
        return {
          ...card,
          balance: newBalance,
          transactions: card.transactions.filter(t => t.id !== transactionId)
        };
      }
      return card;
    });
    await updateDoc(getDocRef(), { creditCards: updated });
  };

  const resetAllData = async () => {
    await updateDoc(getDocRef(), {
      transactions: [],
      goals: [],
      weddingTasks: [],
      weddingInvitees: [],
      weddingOverallBudget: 2500000,
      loans: [],
      appName: 'Gim & Nippi Budget'
    });
  };

  // ===== BACKUP / RESTORE =====
  const exportAllData = () => {
    const data = {
      transactions,
      goals,
      weddingTasks,
      weddingInvitees,
      weddingOverallBudget,
      loans,
      appName: appName,
      incomeCategories,
      expenseCategories,
      creditCards,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importAllData = async (jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const keys = [
        'transactions', 'goals', 'weddingTasks', 'weddingInvitees',
        'weddingOverallBudget', 'loans', 'appName', 'incomeCategories',
        'expenseCategories', 'creditCards'
      ];
      const hasValidKey = data && typeof data === 'object' && keys.some(key => key in data);
      if (!hasValidKey) {
        throw new Error("Invalid backup file: does not contain any valid budget data fields.");
      }

      const updatePayload = {};
      if (data.transactions) updatePayload.transactions = data.transactions;
      if (data.goals) updatePayload.goals = data.goals;
      if (data.weddingTasks) updatePayload.weddingTasks = data.weddingTasks;
      if (data.weddingInvitees) updatePayload.weddingInvitees = data.weddingInvitees;
      if (data.weddingOverallBudget) updatePayload.weddingOverallBudget = data.weddingOverallBudget;
      if (data.loans) updatePayload.loans = data.loans;
      if (data.appName) updatePayload.appName = data.appName;
      if (data.incomeCategories) updatePayload.incomeCategories = data.incomeCategories;
      if (data.expenseCategories) updatePayload.expenseCategories = data.expenseCategories;
      if (data.creditCards) updatePayload.creditCards = data.creditCards;
      
      await setDoc(getDocRef(), updatePayload, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: error.message };
    }
  };

  // ===== DERIVED STATE (Remains same, based on cloud-synced state) =====
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.category !== 'Saving').reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalTransfers = transactions.filter(t => t.type === 'transfer' || (t.type === 'expense' && t.category === 'Saving')).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const balance = totalIncome - totalExpense - totalTransfers;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayExpense = transactions
    .filter(t => t.type === 'expense' && t.date === todayStr && t.category !== 'Saving')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const dailyExpenditure = useMemo(() => {
    const days = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    transactions.filter(t => t.type === 'expense' && t.category !== 'Saving').forEach(t => {
      if (days[t.date] !== undefined) days[t.date] += Number(t.amount);
    });
    let cumulative = 0;
    return Object.entries(days).map(([date, amount]) => {
      cumulative += amount;
      return { date, amount, cumulative, label: new Date(date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' }) };
    });
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const cats = {};
    transactions.filter(t => t.type === 'expense' && t.category !== 'Saving').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const weeklyTrend = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + now.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekLabel = `Week ${4 - w}`;
      const total = transactions
        .filter(t => t.type === 'expense' && t.category !== 'Saving' && t.date >= weekStart.toISOString().split('T')[0] && t.date <= weekEnd.toISOString().split('T')[0])
        .reduce((acc, t) => acc + Number(t.amount), 0);
      weeks.push({ week: weekLabel, expense: total });
    }
    return weeks;
  }, [transactions]);

  const weddingTotalAllocated = weddingTasks.reduce((acc, t) => acc + (t.budgetAllocated || 0), 0);
  const weddingTotalBudget = weddingOverallBudget;
  const weddingTotalSpent = weddingTasks.reduce((acc, t) => acc + t.items.reduce((s, i) => s + Number(i.amount), 0), 0);
  const weddingTotalPaid = weddingTasks.reduce((acc, t) => acc + t.items.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0), 0);

  const restoreFromLocalBackup = async () => {
    try {
      const localBackupRaw = localStorage.getItem(BACKUP_KEY);
      if (!localBackupRaw) return { success: false, error: "No local backup found" };
      const backupData = JSON.parse(localBackupRaw);
      const updatePayload = {};
      if (backupData.transactions) updatePayload.transactions = backupData.transactions;
      if (backupData.goals) updatePayload.goals = backupData.goals;
      if (backupData.weddingTasks) updatePayload.weddingTasks = backupData.weddingTasks;
      if (backupData.weddingInvitees) updatePayload.weddingInvitees = backupData.weddingInvitees;
      if (backupData.weddingOverallBudget) updatePayload.weddingOverallBudget = backupData.weddingOverallBudget;
      if (backupData.loans) updatePayload.loans = backupData.loans;
      if (backupData.appName) updatePayload.appName = backupData.appName;
      if (backupData.incomeCategories) updatePayload.incomeCategories = backupData.incomeCategories;
      if (backupData.expenseCategories) updatePayload.expenseCategories = backupData.expenseCategories;
      if (backupData.creditCards) updatePayload.creditCards = backupData.creditCards;
      await setDoc(getDocRef(), updatePayload, { merge: true });
      setBackupAvailable(false);
      setLocalBackupInfo(null);
      return { success: true };
    } catch (error) {
      console.error('[Auto-Backup] Restore failed:', error);
      return { success: false, error: error.message };
    }
  };

  const dismissBackupRestore = () => {
    setBackupAvailable(false);
    setLocalBackupInfo(null);
  };

  return (
    <FinanceContext.Provider value={{
      user, loading,
      transactions, addTransaction, deleteTransaction, clearAllTransactions,
      totalIncome, totalExpense, balance, todayExpense,
      goals, addGoal, deleteGoal, addGoalAmount, resetGoalAmount, updateGoal,
      weddingTasks, addWeddingTask, updateWeddingTask, updateWeddingTaskBudget, deleteWeddingTask,
      addWeddingExpense, deleteWeddingExpense, toggleWeddingExpensePaid,
      weddingTotalBudget, weddingTotalAllocated, weddingTotalSpent, weddingTotalPaid,
      setWeddingBudget,
      weddingInvitees, addWeddingInvitee, updateWeddingInvitee, deleteWeddingInvitee,
      loans, addLoan, deleteLoan, addLoanPayment, deleteLoanPayment,
      dailyExpenditure, spendingByCategory, weeklyTrend,
      resetAllData, exportAllData, importAllData,
      appName, setAppName,
      incomeCategories, expenseCategories, addCategory, deleteCategory,
      creditCards, addCreditCard, deleteCreditCard, addCardTransaction, deleteCardTransaction,
      totalCardDebt: creditCards.reduce((acc, card) => acc + card.balance, 0),
      totalSavings: goals.reduce((acc, goal) => acc + goal.current, 0),
      // Auto-backup
      backupAvailable, localBackupInfo, restoreFromLocalBackup, dismissBackupRestore,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
