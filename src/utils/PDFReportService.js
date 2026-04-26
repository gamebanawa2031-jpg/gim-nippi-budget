import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../context/FinanceContext';

export const generatePDFReport = (data) => {
  try {
    console.log("Generating PDF report with data:", data);
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

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('en-LK', { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    // Colors
    const primaryColor = [99, 102, 241]; 
    const secondaryColor = [100, 116, 139];

    // Title
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(appName || 'Financial Report', 14, 22);

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
      ['Total Balance', formatCurrency(balance || 0)],
      ['Total Income', formatCurrency(totalIncome || 0)],
      ['Total Expenses', formatCurrency(totalExpense || 0)],
      ['Total Savings', formatCurrency(totalSavings || 0)],
      ['Credit Card Debt', formatCurrency(totalCardDebt || 0)],
    ];

    autoTable(doc, {
      startY: 58,
      head: [['Metric', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 },
    });

    // Section 2: Credit Cards
    let currentY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Credit Card Accounts', 14, currentY);
    
    if (creditCards && creditCards.length > 0) {
      const ccData = creditCards.map(card => [
        card.name,
        formatCurrency(card.limit || 0),
        formatCurrency(card.balance || 0),
        `${(((card.balance || 0) / (card.limit || 1)) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Card Name', 'Limit', 'Balance', 'Utilization']],
        body: ccData,
        theme: 'grid',
        headStyles: { fillColor: [244, 63, 94] },
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

    if (goals && goals.length > 0) {
      const goalsData = goals.map(goal => [
        goal.title,
        formatCurrency(goal.target || 0),
        formatCurrency(goal.current || 0),
        `${(((goal.current || 0) / (goal.target || 1)) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Goal', 'Target', 'Current', 'Progress']],
        body: goalsData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
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
      ['Overall Budget', formatCurrency(weddingTotalBudget || 0)],
      ['Amount Spent', formatCurrency(weddingTotalSpent || 0)],
      ['Remaining Budget', formatCurrency((weddingTotalBudget || 0) - (weddingTotalSpent || 0))],
    ];

    autoTable(doc, {
      startY: 26,
      head: [['Item', 'Value']],
      body: weddingData,
      theme: 'plain',
      headStyles: { fillColor: [139, 92, 246] },
    });

    // Section 5: Recent Transactions
    currentY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Recent Transactions', 14, currentY);

    if (transactions && transactions.length > 0) {
      const recentTx = transactions.slice(0, 15).map(tx => [
        tx.date,
        tx.description || tx.category,
        tx.category,
        tx.type.toUpperCase(),
        formatCurrency(tx.amount || 0)
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
        body: recentTx,
        theme: 'striped',
        headStyles: { fillColor: secondaryColor },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    } else {
      doc.setFontSize(10);
      doc.text('No transaction history available.', 14, currentY + 8);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount} - ${appName || 'Gim & Nippi Budget'} Financial Report`, 14, 285);
    }

    // Save the PDF
    doc.save(`${(appName || 'Budget').replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    alert("Failed to generate PDF. Check the console for details.");
  }
};
