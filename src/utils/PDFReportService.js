import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '../context/FinanceContext';

export const generatePDFReport = (data) => {
  const { 
    transactions, 
    totalIncome, 
    totalExpense, 
    balance, 
    totalCardDebt, 
    totalSavings,
    creditCards,
    goals,
    weddingTotalBudget,
    weddingTotalSpent,
    appName,
    user
  } = data;

  const doc = jsPDF();
  const dateStr = new Date().toLocaleDateString('en-LK', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  // Colors
  const primaryColor = [99, 102, 241]; // var(--accent-primary)
  const secondaryColor = [100, 116, 139]; // var(--text-secondary)

  // Title
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(appName, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Financial Status Report - Generated on ${dateStr}`, 14, 30);
  if (user?.email) {
    doc.text(`User: ${user.email}`, 14, 35);
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 40, 196, 40);

  // Section 1: Executive Summary
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('Executive Summary', 14, 52);

  const summaryData = [
    ['Metric', 'Amount'],
    ['Total Balance', formatCurrency(balance)],
    ['Total Income', formatCurrency(totalIncome)],
    ['Total Expenses', formatCurrency(totalExpense)],
    ['Total Savings', formatCurrency(totalSavings)],
    ['Credit Card Debt', formatCurrency(totalCardDebt)],
  ];

  doc.autoTable({
    startY: 58,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 14, right: 14 },
  });

  // Section 2: Credit Cards
  let currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text('Credit Card Accounts', 14, currentY);
  
  if (creditCards.length > 0) {
    const ccData = creditCards.map(card => [
      card.name,
      formatCurrency(card.limit),
      formatCurrency(card.balance),
      `${((card.balance / card.limit) * 100).toFixed(1)}%`
    ]);

    doc.autoTable({
      startY: currentY + 6,
      head: [['Card Name', 'Limit', 'Balance', 'Utilization']],
      body: ccData,
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94] }, // Rose-500
    });
  } else {
    doc.setFontSize(10);
    doc.text('No credit card data available.', 14, currentY + 8);
    doc.lastAutoTable = { finalY: currentY + 10 };
  }

  // Section 3: Savings Goals
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text('Savings Goals', 14, currentY);

  if (goals.length > 0) {
    const goalsData = goals.map(goal => [
      goal.title,
      formatCurrency(goal.target),
      formatCurrency(goal.current),
      `${((goal.current / goal.target) * 100).toFixed(1)}%`
    ]);

    doc.autoTable({
      startY: currentY + 6,
      head: [['Goal', 'Target', 'Current', 'Progress']],
      body: goalsData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
    });
  } else {
    doc.setFontSize(10);
    doc.text('No savings goals added.', 14, currentY + 8);
    doc.lastAutoTable = { finalY: currentY + 10 };
  }

  // New Page for Wedding and Transactions
  doc.addPage();
  
  // Section 4: Wedding Planner
  doc.setFontSize(16);
  doc.text('Wedding Planning', 14, 20);
  
  const weddingData = [
    ['Item', 'Value'],
    ['Overall Budget', formatCurrency(weddingTotalBudget)],
    ['Amount Spent', formatCurrency(weddingTotalSpent)],
    ['Remaining Budget', formatCurrency(weddingTotalBudget - weddingTotalSpent)],
  ];

  doc.autoTable({
    startY: 26,
    head: [weddingData[0]],
    body: weddingData.slice(1),
    theme: 'plain',
    headStyles: { fillColor: [139, 92, 246] }, // Violet-500
  });

  // Section 5: Recent Transactions
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text('Recent Transactions', 14, currentY);

  const recentTx = transactions.slice(0, 15).map(tx => [
    tx.date,
    tx.description || tx.category,
    tx.category,
    tx.type.toUpperCase(),
    formatCurrency(tx.amount)
  ]);

  doc.autoTable({
    startY: currentY + 6,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
    body: recentTx,
    theme: 'striped',
    headStyles: { fillColor: secondaryColor },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} - ${appName} Financial Report`, 14, 285);
  }

  // Save the PDF
  doc.save(`${appName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
