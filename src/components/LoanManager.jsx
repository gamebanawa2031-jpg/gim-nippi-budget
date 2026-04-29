import React, { useState, useMemo } from 'react';
import { useFinance, formatCurrency, calculateEMI, calculateOverpaymentImpact, calculateLoanPaymentHistory } from '../context/FinanceContext';
import { Landmark, Plus, Trash2, Calculator, TrendingDown, Clock, Percent, DollarSign, ArrowDownCircle, X, ChevronDown, ChevronUp, Check, Zap, CalendarDays, BadgeCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const LoanManager = () => {
  const { loans, addLoan, deleteLoan, addLoanPayment, deleteLoanPayment } = useFinance();

  // Calculator state
  const [calcForm, setCalcForm] = useState({ loanAmount: '1,000,000', interestRate: '11.5', tenure: '12' });
  const [method, setMethod] = useState('flat');
  const [calcResult, setCalcResult] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Overpayment state
  const [extraPayment, setExtraPayment] = useState('');
  const [overpaymentResult, setOverpaymentResult] = useState(null);

  // Loan portfolio
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [newLoan, setNewLoan] = useState({ name: '', amount: '', interestRate: '', tenureMonths: '', method: 'flat' });
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedLoan, setExpandedLoan] = useState(null);

  // Format number with commas
  const fmtNum = (n) => Math.round(n).toLocaleString('en-US');

  const handleCalculate = () => {
    const principal = parseFloat(calcForm.loanAmount.replace(/,/g, '')) || 0;
    const rate = parseFloat(calcForm.interestRate) || 0;
    const months = parseInt(calcForm.tenure) || 0;
    
    const result = calculateEMI(principal, rate, months, method);
    setCalcResult(result);
    setOverpaymentResult(null);
    setExtraPayment('');
  };

  const handleOverpayment = () => {
    const principal = parseFloat(calcForm.loanAmount.replace(/,/g, '')) || 0;
    const rate = parseFloat(calcForm.interestRate) || 0;
    const months = parseInt(calcForm.tenure) || 0;
    const extra = parseFloat(extraPayment) || 0;

    if (extra <= 0) return;
    const result = calculateOverpaymentImpact(principal, rate, months, method, extra);
    setOverpaymentResult(result);
  };

  const handleAddLoan = (e) => {
    e.preventDefault();
    addLoan({
      ...newLoan,
      amount: Number(newLoan.amount),
      interestRate: Number(newLoan.interestRate),
      tenureMonths: Number(newLoan.tenureMonths),
      startDate: new Date().toISOString().split('T')[0],
    });
    setNewLoan({ name: '', amount: '', interestRate: '', tenureMonths: '', method: 'flat' });
    setShowAddLoan(false);
  };

  const handleAddPayment = (loanId) => {
    if (!paymentAmount) return;
    addLoanPayment(loanId, { amount: Number(paymentAmount), date: paymentDate });
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentForm(null);
  };

  // Format loan amount input with commas
  const handleAmountInput = (value) => {
    const raw = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      setCalcForm({ ...calcForm, loanAmount: Math.floor(num).toLocaleString('en-US') });
    } else {
      setCalcForm({ ...calcForm, loanAmount: raw });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div>
          <h1 className="text-gradient-loan">Loan Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Calculate EMI, track loans, and analyze overpayments.</p>
        </div>
        <button className="btn-loan" onClick={() => setShowAddLoan(true)}>
          <Plus size={20} />
          Add Loan
        </button>
      </div>

      {/* ===== EMI CALCULATOR ===== */}
      <div className="loan-calculator glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={20} color="var(--loan-primary)" />
          EMI Calculator
        </h2>

        {/* Inputs */}
        <div className="loan-form-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Loan Amount</label>
            <div className="loan-input-wrapper">
              <span className="prefix">LKR</span>
              <input type="text" className="input-field has-prefix" value={calcForm.loanAmount}
                onChange={(e) => handleAmountInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Annual Interest Rate</label>
            <div className="loan-input-wrapper">
              <input type="text" className="input-field has-suffix" value={calcForm.interestRate}
                onChange={(e) => setCalcForm({ ...calcForm, interestRate: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()} />
              <span className="suffix">%</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Loan Tenure</label>
            <div className="loan-input-wrapper">
              <input type="text" className="input-field has-suffix" value={calcForm.tenure}
                onChange={(e) => setCalcForm({ ...calcForm, tenure: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()} />
              <span className="suffix">months</span>
            </div>
          </div>
        </div>

        {/* Method Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '8px' }}>
            Interest Calculation Method
          </label>
          <div className="method-toggle">
            <div className={`toggle-slider-bg ${method === 'reducing' ? 'right' : ''}`} />
            <button className={`toggle-btn ${method === 'flat' ? 'active' : ''}`} onClick={() => { setMethod('flat'); }}>
              Flat Rate
            </button>
            <button className={`toggle-btn ${method === 'reducing' ? 'active' : ''}`} onClick={() => { setMethod('reducing'); }}>
              Reducing Balance
            </button>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
            {method === 'flat' 
              ? 'Interest = Principal × Rate × Years. Common in Sri Lankan banks.' 
              : 'Interest calculated on remaining balance each month. Lower total interest.'}
          </p>
        </div>

        {/* Calculate Button */}
        <button className="btn-loan" style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }} onClick={handleCalculate}>
          Calculate EMI
        </button>
      </div>

      {/* ===== RESULTS ===== */}
      {calcResult && (
        <>
          {/* Summary Cards */}
          <div className="loan-summary-grid">
            <div className="loan-summary-card">
              <div className="label">Monthly EMI</div>
              <div className="value" style={{ color: 'var(--loan-primary)' }}>Rs. {fmtNum(calcResult.emi)}</div>
              <div className="sub">Fixed monthly payment</div>
            </div>
            <div className="loan-summary-card">
              <div className="label">Total Payment</div>
              <div className="value" style={{ color: 'var(--insight-primary)' }}>Rs. {fmtNum(calcResult.totalPayment)}</div>
              <div className="sub">Over {calcForm.tenure} months</div>
            </div>
            <div className="loan-summary-card">
              <div className="label">Total Interest</div>
              <div className="value" style={{ color: '#fb7185' }}>Rs. {fmtNum(calcResult.totalInterest)}</div>
              <div className="sub">{((calcResult.totalInterest / parseFloat(calcForm.loanAmount.replace(/,/g, ''))) * 100).toFixed(1)}% of principal</div>
            </div>
            <div className="loan-summary-card">
              <div className="label">Effective Rate (AER)</div>
              <div className="value" style={{ color: '#fbbf24' }}>{calcResult.aer.toFixed(2)}%</div>
              <div className="sub" style={method === 'flat' ? { color: '#fbbf24' } : {}}>
                {method === 'flat' ? 'Actual cost is much higher!' : 'True annual cost'}
              </div>
            </div>
          </div>

          {/* Donut Chart + Overpayment Side by Side */}
          <div className="content-grid" style={{ marginBottom: '24px' }}>
            {/* Donut Chart */}
            <div className="panel glass-panel">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--loan-primary)', display: 'inline-block' }} />
                Payment Breakdown
              </h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'Principal', value: parseFloat(calcForm.loanAmount.replace(/,/g, '')) },
                        { name: 'Interest', value: calcResult.totalInterest }
                      ]}
                      cx="50%" cy="40%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none"
                    >
                      <Cell fill="#34d399" />
                      <Cell fill="#fb7185" />
                    </Pie>
                    <Tooltip formatter={(value) => `Rs. ${fmtNum(value)}`} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#34d399' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Principal: Rs. {fmtNum(parseFloat(calcForm.loanAmount.replace(/,/g, '')))}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fb7185' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Interest: Rs. {fmtNum(calcResult.totalInterest)}</span>
                </div>
              </div>
            </div>

            {/* Overpayment Calculator */}
            <div className="panel glass-panel">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownCircle size={18} color="var(--success)" />
                Overpayment Analysis
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                See how paying extra each month reduces your loan tenure and total interest.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div className="loan-input-wrapper" style={{ flex: 1 }}>
                  <span className="prefix" style={{ fontSize: '0.8rem' }}>+Rs.</span>
                  <input type="number" className="input-field has-prefix" placeholder="Extra monthly amount"
                    value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} min="1" step="1"
                    onKeyDown={(e) => e.key === 'Enter' && handleOverpayment()} />
                </div>
                <button className="btn-primary" style={{ padding: '10px 16px', background: 'linear-gradient(135deg, var(--success), #06B6D4)' }} onClick={handleOverpayment}>
                  Analyze
                </button>
              </div>

              {overpaymentResult && (
                <div className="overpayment-section" style={{ marginTop: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)', marginBottom: '12px' }}>
                    💡 By paying Rs. {fmtNum(extraPayment)} extra each month:
                  </div>
                  <div className="overpayment-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="overpayment-card">
                      <div className="value" style={{ color: 'var(--loan-primary)' }}>Rs. {fmtNum(overpaymentResult.newEmi)}</div>
                      <div className="label">New Monthly Payment</div>
                    </div>
                    <div className="overpayment-card">
                      <div className="value">{overpaymentResult.newTenure} months</div>
                      <div className="label">New Tenure</div>
                    </div>
                    <div className="overpayment-card">
                      <div className="value" style={{ color: 'var(--success)' }}>{overpaymentResult.monthsSaved} months</div>
                      <div className="label">Months Saved</div>
                    </div>
                    <div className="overpayment-card">
                      <div className="value" style={{ color: 'var(--success)' }}>Rs. {fmtNum(overpaymentResult.interestSaved)}</div>
                      <div className="label">Interest Saved</div>
                    </div>
                  </div>
                  {method === 'reducing' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>New Total Payment</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--insight-primary)' }}>
                        Rs. {fmtNum(overpaymentResult.newTotalPayment)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px' }}>
                        You save Rs. {fmtNum(overpaymentResult.totalSaved)} total!
                      </div>
                    </div>
                  )}
                  {method === 'flat' && (
                    <div style={{ marginTop: '12px', padding: '10px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--warning)' }}>
                      ⚠️ With flat rate, interest is fixed upfront. Overpaying reduces tenure but not interest. Ask your bank about switching to reducing balance.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Amortization Table */}
          <div className="panel glass-panel" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--loan-primary)', display: 'inline-block' }} />
                Monthly Breakdown
              </h3>
              <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => setShowTable(!showTable)}>
                {showTable ? 'Hide Table' : 'Show Table'}
              </button>
            </div>

            {showTable && calcResult.schedule && (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <table className="amortization-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>EMI (LKR)</th>
                      <th>Interest (LKR)</th>
                      <th>Capital (LKR)</th>
                      <th>Balance (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResult.schedule.map(row => {
                      const interestPct = row.emi > 0 ? (row.interest / row.emi) * 100 : 0;
                      const capitalPct = row.emi > 0 ? (row.capital / row.emi) * 100 : 0;
                      return (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td>{fmtNum(row.emi)}</td>
                          <td className="interest-col">{fmtNum(row.interest)}</td>
                          <td className="capital-col">{fmtNum(row.capital)}</td>
                          <td className="balance-col">
                            {fmtNum(row.balance)}
                            <div className="mini-bar">
                              <div className="interest-bar" style={{ width: `${interestPct}%` }} />
                              <div className="capital-bar" style={{ width: `${capitalPct}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== LOAN PORTFOLIO ===== */}
      {loans.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={20} color="var(--loan-primary)" />
            Your Loans
          </h2>
          {loans.map(loan => {
            const loanCalc = calculateEMI(loan.amount, loan.interestRate, loan.tenureMonths, loan.method);
            const loanStatus = loan.payments.length > 0
              ? calculateLoanPaymentHistory(loan.amount, loan.interestRate, loan.tenureMonths, loan.method, loan.payments)
              : null;
            const isExpanded = expandedLoan === loan.id;

            // Basic stats
            const currentBalance = loanStatus ? loanStatus.currentBalance : loan.amount;
            const principalPercent = loanStatus ? loanStatus.principalPayoffPercent : 0;

            return (
              <div key={loan.id} className="loan-portfolio-card" style={{ marginBottom: '20px' }}>
                {/* ── HEADER ── */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                  onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{loan.name}</h3>
                      {loanStatus?.isCompleted && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '3px 10px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                          <BadgeCheck size={12} /> PAID OFF
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--loan-bg)', color: 'var(--loan-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {loan.method} rate
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--bg-surface)', color: 'var(--text-muted)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {loan.interestRate}% • {loan.tenureMonths} months
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--bg-surface)', color: 'var(--text-muted)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {loan.payments.length} payment{loan.payments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); deleteLoan(loan.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* ── QUICK STATS ROW ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Principal</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{formatCurrency(loan.amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Required EMI</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--loan-primary)' }}>{loanCalc ? formatCurrency(loanCalc.emi) : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Balance</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: currentBalance > 0 ? '#fb7185' : 'var(--success)' }}>
                      {formatCurrency(currentBalance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Total Paid</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                      {formatCurrency(loanStatus ? loanStatus.totalPaid : 0)}
                    </div>
                  </div>
                </div>

                {/* ── PROGRESS BAR ── */}
                <div className="goal-progress-bar" style={{ height: '8px', marginBottom: '8px' }}>
                  <div className="goal-progress-fill" style={{ width: `${Math.min(principalPercent, 100)}%`, background: 'linear-gradient(90deg, var(--loan-primary), var(--success))' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{principalPercent.toFixed(1)}% of principal repaid</span>
                  {loanStatus && loanStatus.monthsSaved > 0 && (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>🚀 {loanStatus.monthsSaved} month{loanStatus.monthsSaved > 1 ? 's' : ''} ahead!</span>
                  )}
                </div>

                {/* ── EXPANDED CONTENT ── */}
                {isExpanded && (
                  <div style={{ marginTop: '20px' }}>

                    {/* ── LIVE INSIGHT CARDS ── */}
                    {loanStatus && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(251, 191, 36, 0.04))', border: '1px solid var(--loan-glow)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                          <Zap size={16} color="var(--loan-primary)" style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--loan-primary)' }}>
                            {loanStatus.isCompleted ? '✓ Done' : `${loanStatus.projectedRemainingMonths} mo`}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Months Left</div>
                        </div>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.04))', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                          <Clock size={16} color="var(--success)" style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                            {loanStatus.monthsSaved} mo
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Months Saved</div>
                        </div>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(52, 211, 153, 0.04))', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                          <TrendingDown size={16} color="#34d399" style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#34d399' }}>
                            {formatCurrency(loanStatus.interestSaved)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Interest Saved</div>
                        </div>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.04))', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                          <DollarSign size={16} color="#8B5CF6" style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#8B5CF6' }}>
                            {formatCurrency(loanStatus.totalExtraPaid)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Extra Paid</div>
                        </div>
                      </div>
                    )}

                    {/* ── NEXT PAYMENT HINT ── */}
                    {loanStatus && !loanStatus.isCompleted && (
                      <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(251, 191, 36, 0.03))', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Next month's interest</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#fb7185' }}>{formatCurrency(loanStatus.nextMonthInterest)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Min. EMI required</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--loan-primary)' }}>{formatCurrency(loanStatus.originalEmi)}</div>
                        </div>
                      </div>
                    )}

                    {/* ── PAYMENT HISTORY TABLE ── */}
                    {loanStatus && loanStatus.history.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CalendarDays size={16} color="var(--loan-primary)" />
                          Payment History
                        </h4>
                        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                          <table className="amortization-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Payment</th>
                                <th>Interest</th>
                                <th>Principal</th>
                                <th>Extra</th>
                                <th>Balance</th>
                                <th style={{ width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {loanStatus.history.map((row, rowIndex) => (
                                <tr key={row.month}>
                                  <td>{row.month}</td>
                                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                    {new Date(row.date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: '2-digit' })}
                                  </td>
                                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Rs. {fmtNum(row.payment)}</td>
                                  <td className="interest-col">Rs. {fmtNum(row.interest)}</td>
                                  <td className="capital-col">Rs. {fmtNum(row.principal)}</td>
                                  <td style={{ color: row.extraPaid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {row.extraPaid > 0 ? `+Rs. ${fmtNum(row.extraPaid)}` : '—'}
                                  </td>
                                  <td className="balance-col">
                                    Rs. {fmtNum(row.balance)}
                                    <div className="mini-bar">
                                      <div className="interest-bar" style={{ width: `${row.interestRatio}%` }} />
                                      <div className="capital-bar" style={{ width: `${100 - row.interestRatio}%` }} />
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => deleteLoanPayment(loan.id, loan.payments[rowIndex].id)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                                      title="Delete payment"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: 'rgba(245, 158, 11, 0.06)' }}>
                                <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700, color: 'var(--loan-primary)', paddingLeft: '16px' }}>TOTALS</td>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {fmtNum(loanStatus.totalPaid)}</td>
                                <td style={{ fontWeight: 700, color: '#fb7185' }}>Rs. {fmtNum(loanStatus.totalInterestPaid)}</td>
                                <td style={{ fontWeight: 700, color: '#34d399' }}>Rs. {fmtNum(loanStatus.totalPrincipalPaid)}</td>
                                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{loanStatus.totalExtraPaid > 0 ? `+Rs. ${fmtNum(loanStatus.totalExtraPaid)}` : '—'}</td>
                                <td style={{ fontWeight: 700, color: loanStatus.currentBalance === 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                                  Rs. {fmtNum(loanStatus.currentBalance)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '3px', background: '#fb7185', borderRadius: '2px' }} /> Interest portion
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '3px', background: '#34d399', borderRadius: '2px' }} /> Principal portion
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── MAKE PAYMENT FORM ── */}
                    {!loanStatus?.isCompleted && (
                      <div style={{ marginTop: '4px' }}>
                        {showPaymentForm === loan.id ? (
                          <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <DollarSign size={16} color="var(--loan-primary)" />
                              Record Payment
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                              <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Amount (Rs.)</label>
                                <input type="number" className="input-field" placeholder={loanCalc ? `Min: ${fmtNum(loanCalc.emi)}` : 'Amount'}
                                  value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                                  min={loanCalc ? loanCalc.emi : 1} step="1" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Date</label>
                                <input type="date" className="input-field" value={paymentDate}
                                  onChange={(e) => setPaymentDate(e.target.value)} />
                              </div>
                            </div>
                            {loanCalc && paymentAmount && Number(paymentAmount) > loanCalc.emi && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--success)', marginBottom: '10px', fontWeight: 500 }}>
                                💪 Paying Rs. {fmtNum(Number(paymentAmount) - loanCalc.emi)} extra this month!
                              </div>
                            )}
                            {loanCalc && paymentAmount && Number(paymentAmount) < loanCalc.emi && Number(paymentAmount) > 0 && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--warning)', marginBottom: '10px', fontWeight: 500 }}>
                                ⚠️ Below minimum EMI of {formatCurrency(loanCalc.emi)}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button className="btn-loan" style={{ flex: 1, padding: '12px' }} onClick={() => handleAddPayment(loan.id)}>
                                <Check size={18} /> Record Payment
                              </button>
                              <button className="btn-secondary" style={{ padding: '12px' }} onClick={() => setShowPaymentForm(null)}>
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn-loan" style={{ width: '100%', padding: '14px' }}
                            onClick={() => { setShowPaymentForm(loan.id); setPaymentAmount(''); setPaymentDate(new Date().toISOString().split('T')[0]); }}
                          >
                            <Plus size={18} /> Record Monthly Payment
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── COMPLETED MESSAGE ── */}
                    {loanStatus?.isCompleted && (
                      <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 211, 238, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginTop: '4px' }}>
                        <BadgeCheck size={32} color="var(--success)" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>Loan Fully Paid Off! 🎉</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Completed in {loanStatus.history.length} month{loanStatus.history.length > 1 ? 's' : ''}
                          {loanStatus.monthsSaved > 0 && ` — ${loanStatus.monthsSaved} month${loanStatus.monthsSaved > 1 ? 's' : ''} early`}
                          {loanStatus.interestSaved > 0 && ` — saved ${formatCurrency(loanStatus.interestSaved)} in interest`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddLoan && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="header" style={{ marginBottom: '24px' }}>
              <h2 className="panel-title">Add Loan</h2>
              <button onClick={() => setShowAddLoan(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddLoan}>
              <div className="form-group">
                <label>Loan Name</label>
                <input type="text" className="input-field" placeholder="e.g., Wedding Loan"
                  value={newLoan.name} onChange={(e) => setNewLoan({ ...newLoan, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (Rs.)</label>
                  <input type="number" className="input-field" placeholder="1000000" min="1" step="1"
                    value={newLoan.amount} onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input type="number" className="input-field" placeholder="11.5" min="0.1" step="0.1"
                    value={newLoan.interestRate} onChange={(e) => setNewLoan({ ...newLoan, interestRate: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tenure (months)</label>
                  <input type="number" className="input-field" placeholder="12" min="1" step="1"
                    value={newLoan.tenureMonths} onChange={(e) => setNewLoan({ ...newLoan, tenureMonths: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Method</label>
                  <select className="input-field" value={newLoan.method} onChange={(e) => setNewLoan({ ...newLoan, method: e.target.value })}>
                    <option value="flat">Flat Rate</option>
                    <option value="reducing">Reducing Balance</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddLoan(false)}>Cancel</button>
                <button type="submit" className="btn-loan">Add Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManager;
