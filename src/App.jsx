import React, { useState, useEffect } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import GoalTracker from './components/GoalTracker';
import WeddingPlanner from './components/WeddingPlanner';
import LoanManager from './components/LoanManager';
import CreditCardManager from './components/CreditCardManager';
import Insights from './components/Insights';
import Login from './components/Login';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <TransactionList />;
      case 'wedding': return <WeddingPlanner />;
      case 'loans': return <LoanManager />;
      case 'credit-cards': return <CreditCardManager />;
      case 'goals': return <GoalTracker />;
      case 'insights': return <Insights />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}

export default App;
