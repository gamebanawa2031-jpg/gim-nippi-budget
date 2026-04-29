import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertTriangle, RotateCcw, X, ShieldCheck } from 'lucide-react';
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

// ===== DATA RECOVERY BANNER =====
function DataRecoveryBanner() {
  const { backupAvailable, localBackupInfo, restoreFromLocalBackup, dismissBackupRestore } = useFinance();
  const [restoring, setRestoring] = useState(false);

  if (!backupAvailable || !localBackupInfo) return null;

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restoreFromLocalBackup();
    if (success) {
      // Data will auto-sync via onSnapshot, no reload needed
      setRestoring(false);
    } else {
      alert('Restore failed. Please try the manual restore in Insights → Backup & Restore.');
      setRestoring(false);
    }
  };

  const backupTime = localBackupInfo.timestamp 
    ? new Date(localBackupInfo.timestamp).toLocaleString('en-LK', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
    : 'Unknown time';

  return (
    <div className="recovery-banner">
      <div className="recovery-banner-content">
        <div className="recovery-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="recovery-info">
          <h3>⚠️ Data Loss Detected</h3>
          <p>
            Cloud data appears empty, but a local backup from <strong>{backupTime}</strong> was found with:
          </p>
          <div className="recovery-counts">
            {localBackupInfo.transactions > 0 && <span>📋 {localBackupInfo.transactions} transactions</span>}
            {localBackupInfo.weddingTasks > 0 && <span>💒 {localBackupInfo.weddingTasks} wedding tasks</span>}
            {localBackupInfo.creditCards > 0 && <span>💳 {localBackupInfo.creditCards} credit cards</span>}
            {localBackupInfo.goals > 0 && <span>🎯 {localBackupInfo.goals} goals</span>}
            {localBackupInfo.loans > 0 && <span>🏦 {localBackupInfo.loans} loans</span>}
          </div>
        </div>
        <div className="recovery-actions">
          <button 
            className="recovery-restore-btn" 
            onClick={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <><div className="spinner-small" /> Restoring...</>
            ) : (
              <><RotateCcw size={16} /> Restore Data</>
            )}
          </button>
          <button 
            className="recovery-dismiss-btn" 
            onClick={dismissBackupRestore}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <DataRecoveryBanner />
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
