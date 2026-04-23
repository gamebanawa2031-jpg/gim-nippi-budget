import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  doc, onSnapshot, setDoc, updateDoc, collection, 
  query, getDocs, writeBatch, getDoc 
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
export const FinanceProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [weddingTasks, setWeddingTasks] = useState([]);
  const [weddingOverallBudget, setWeddingOverallBudget] = useState(2500000);
  const [loans, setLoans] = useState([]);
  const [appName, setAppNameState] = useState('Gim & Nippi Budget');

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
          setWeddingOverallBudget(data.weddingOverallBudget || 2500000);
          setLoans(data.loans || []);
          setAppNameState(data.appName || 'Gim & Nippi Budget');
          
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
      localStorage.removeItem('finance_wedding_budget');
      localStorage.removeItem('finance_loans');
      localStorage.removeItem('finance_app_name');
    } else {
      // Initialize empty if no local data
      await setDoc(docRef, { transactions: [], goals: [], weddingTasks: [], loans: [] }, { merge: true });
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
    const updated = goals.map(g => g.id === goalId ? { ...g, current: g.current + amount } : g);
    await updateDoc(getDocRef(), { goals: updated });
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

  const addLoan = async (loan) => {
    const updated = [...loans, { ...loan, id: Date.now().toString(), payments: [] }];
    await updateDoc(getDocRef(), { loans: updated });
  };

  const deleteLoan = async (id) => {
    const updated = loans.filter(l => l.id !== id);
    await updateDoc(getDocRef(), { loans: updated });
  };

  const addLoanPayment = async (loanId, payment) => {
    const updated = loans.map(l =>
      l.id === loanId
        ? { ...l, payments: [...l.payments, { ...payment, id: Date.now().toString() }] }
        : l
    );
    await updateDoc(getDocRef(), { loans: updated });
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

  const resetAllData = async () => {
    await updateDoc(getDocRef(), {
      transactions: [],
      goals: [],
      weddingTasks: [],
      weddingOverallBudget: 2500000,
      loans: [],
      appName: 'Gim & Nippi Budget'
    });
  };

  // ===== DERIVED STATE (Remains same, based on cloud-synced state) =====
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpense = transactions
    .filter(t => t.type === 'expense' && t.date === todayStr)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const dailyExpenditure = useMemo(() => {
    const days = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    transactions.filter(t => t.type === 'expense').forEach(t => {
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
    transactions.filter(t => t.type === 'expense').forEach(t => {
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
        .filter(t => t.type === 'expense' && t.date >= weekStart.toISOString().split('T')[0] && t.date <= weekEnd.toISOString().split('T')[0])
        .reduce((acc, t) => acc + Number(t.amount), 0);
      weeks.push({ week: weekLabel, expense: total });
    }
    return weeks;
  }, [transactions]);

  const weddingTotalAllocated = weddingTasks.reduce((acc, t) => acc + (t.budgetAllocated || 0), 0);
  const weddingTotalBudget = weddingOverallBudget;
  const weddingTotalSpent = weddingTasks.reduce((acc, t) => acc + t.items.reduce((s, i) => s + Number(i.amount), 0), 0);
  const weddingTotalPaid = weddingTasks.reduce((acc, t) => acc + t.items.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0), 0);

  return (
    <FinanceContext.Provider value={{
      user, loading,
      transactions, addTransaction, deleteTransaction, clearAllTransactions,
      totalIncome, totalExpense, balance, todayExpense,
      goals, addGoal, deleteGoal, addGoalAmount, resetGoalAmount, updateGoal,
      weddingTasks, addWeddingTask, updateWeddingTask, deleteWeddingTask,
      addWeddingExpense, deleteWeddingExpense, toggleWeddingExpensePaid,
      weddingTotalBudget, weddingTotalAllocated, weddingTotalSpent, weddingTotalPaid,
      setWeddingBudget,
      loans, addLoan, deleteLoan, addLoanPayment, deleteLoanPayment,
      dailyExpenditure, spendingByCategory, weeklyTrend,
      resetAllData,
      appName, setAppName,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
