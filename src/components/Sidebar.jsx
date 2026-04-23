import React from 'react';
import { LayoutDashboard, Receipt, Target, Heart, Landmark, BarChart3, Wallet, LogOut, User } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useFinance, getDaysUntilWedding, WEDDING_DATE } from '../context/FinanceContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { appName, user } = useFinance();
  const daysLeft = getDaysUntilWedding();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt size={20} /> },
    { id: 'wedding', label: 'Wedding Planner', icon: <Heart size={20} />, tabClass: 'wedding-tab' },
    { id: 'loans', label: 'Loan Manager', icon: <Landmark size={20} />, tabClass: 'loan-tab' },
    { id: 'goals', label: 'Goals & Savings', icon: <Target size={20} /> },
    { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} />, tabClass: 'insight-tab' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Wallet color="var(--accent-primary)" size={28} />
        <span>{appName}</span>
      </div>
      
      <nav>
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`nav-link ${activeTab === tab.id ? 'active' : ''} ${activeTab === tab.id && tab.tabClass ? tab.tabClass : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </div>
        ))}
      </nav>

      {/* Wedding Countdown */}
      <div className="wedding-countdown">
        <div className="countdown-label">💍 Wedding Day</div>
        <div className="countdown-days">{daysLeft}</div>
        <div className="countdown-sub">
          days until {WEDDING_DATE.toLocaleDateString('en-LK', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* User Profile & Logout */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-details">
            <span className="user-email">{user?.email?.split('@')[0]}</span>
            <span className="user-status">Online</span>
          </div>
        </div>
        <button className="logout-btn" onClick={() => signOut(auth)} title="Logout">
          <LogOut size={20} />
        </button>
      </div>

      <style>{`
        .sidebar-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--accent-primary-glow);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .user-email {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: capitalize;
        }
        .user-status {
          font-size: 0.7rem;
          color: var(--success);
          font-weight: 500;
        }
        .logout-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logout-btn:hover {
          background: var(--danger-bg);
          color: var(--danger);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
