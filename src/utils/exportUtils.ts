import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Expense, User } from '../types';
import { formatCurrency, formatDate } from './helpers';

export interface ExportFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  categories: string[];
  minAmount: number | null;
  maxAmount: number | null;
  includeGroups: boolean;
  includePersonal: boolean;
}

export interface ExportData {
  expenses: Expense[];
  totalAmount: number;
  totalCount: number;
  userInfo: User;
}

// Prepare expense data for export
export const prepareExportData = (
  expenses: Expense[],
  user: User,
  filters: ExportFilters,
  allUsers: User[]
): ExportData => {
  let filteredExpenses = expenses.filter(expense => {
    // Filter by user involvement
    const isUserInvolved = expense.splits.some(split => split.userId === user.id) || expense.paidBy === user.id;
    if (!isUserInvolved) return false;

    // Filter by date range
    if (filters.dateRange.start && new Date(expense.date) < filters.dateRange.start) return false;
    if (filters.dateRange.end && new Date(expense.date) > filters.dateRange.end) return false;

    // Filter by categories
    if (filters.categories.length > 0 && !filters.categories.includes(expense.category)) return false;

    // Filter by amount range
    const userSplit = expense.splits.find(split => split.userId === user.id);
    const userAmount = userSplit?.amount || 0;
    if (filters.minAmount !== null && userAmount < filters.minAmount) return false;
    if (filters.maxAmount !== null && userAmount > filters.maxAmount) return false;

    // Filter by group/personal
    if (!filters.includeGroups && expense.groupId) return false;
    if (!filters.includePersonal && !expense.groupId) return false;

    return true;
  });

  // Sort by date (newest first)
  filteredExpenses = filteredExpenses.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalAmount = filteredExpenses.reduce((sum, expense) => {
    const userSplit = expense.splits.find(split => split.userId === user.id);
    return sum + (userSplit?.amount || 0);
  }, 0);

  return {
    expenses: filteredExpenses,
    totalAmount,
    totalCount: filteredExpenses.length,
    userInfo: user
  };
};

// Export to CSV
export const exportToCSV = (data: ExportData, allUsers: User[], groups: any[]) => {
  const csvHeaders = [
    'Date',
    'Description',
    'Category',
    'Total Amount',
    'Your Share',
    'Paid By',
    'Group',
    'Split Type',
    'Notes'
  ];

  const csvRows = data.expenses.map(expense => {
    const userSplit = expense.splits.find(split => split.userId === data.userInfo.id);
    const paidByUser = allUsers.find(u => u.id === expense.paidBy);
    const group = expense.groupId ? groups.find(g => g.id === expense.groupId) : null;

    return [
      formatDate(expense.date),
      `"${expense.description}"`,
      expense.category,
      formatCurrency(expense.amount),
      formatCurrency(userSplit?.amount || 0),
      paidByUser?.name || 'Unknown',
      group?.name || 'Personal',
      expense.splitType,
      `"${expense.notes || ''}"`
    ];
  });

  const csvContent = [csvHeaders, ...csvRows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `expenses_${data.userInfo.name}_${new Date().toISOString().split('T')[0]}.csv`);
};

// Export to Excel
export const exportToExcel = (data: ExportData, allUsers: User[], groups: any[]) => {
  const workbook = XLSX.utils.book_new();

  // Main expenses sheet
  const expensesData = data.expenses.map(expense => {
    const userSplit = expense.splits.find(split => split.userId === data.userInfo.id);
    const paidByUser = allUsers.find(u => u.id === expense.paidBy);
    const group = expense.groupId ? groups.find(g => g.id === expense.groupId) : null;

    return {
      Date: formatDate(expense.date),
      Description: expense.description,
      Category: expense.category,
      'Total Amount': expense.amount,
      'Your Share': userSplit?.amount || 0,
      'Paid By': paidByUser?.name || 'Unknown',
      Group: group?.name || 'Personal',
      'Split Type': expense.splitType,
      Notes: expense.notes || ''
    };
  });

  const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

  // Summary sheet
  const categoryTotals = data.expenses.reduce((acc, expense) => {
    const userSplit = expense.splits.find(split => split.userId === data.userInfo.id);
    const amount = userSplit?.amount || 0;
    
    if (!acc[expense.category]) {
      acc[expense.category] = { count: 0, total: 0 };
    }
    acc[expense.category].count += 1;
    acc[expense.category].total += amount;
    
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const summaryData = [
    { Metric: 'Total Expenses', Value: data.totalCount },
    { Metric: 'Total Amount', Value: data.totalAmount },
    { Metric: 'Average per Expense', Value: data.totalCount > 0 ? data.totalAmount / data.totalCount : 0 },
    { Metric: '', Value: '' }, // Empty row
    { Metric: 'Category Breakdown', Value: '' },
    ...Object.entries(categoryTotals).map(([category, stats]) => ({
      Metric: `${category} (${stats.count} expenses)`,
      Value: stats.total
    }))
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Write file
  XLSX.writeFile(workbook, `expenses_${data.userInfo.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export to PDF
export const exportToPDF = (data: ExportData, allUsers: User[], groups: any[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Title
  doc.setFontSize(20);
  doc.text('Expense Report', margin, yPosition);
  yPosition += 15;

  // User info and summary
  doc.setFontSize(12);
  doc.text(`Generated for: ${data.userInfo.name}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Generated on: ${formatDate(new Date())}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Total Expenses: ${data.totalCount}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Total Amount: ${formatCurrency(data.totalAmount)}`, margin, yPosition);
  yPosition += 15;

  // Table headers
  doc.setFontSize(10);
  const headers = ['Date', 'Description', 'Category', 'Your Share', 'Paid By'];
  const colWidths = [30, 60, 25, 25, 30];
  let xPosition = margin;

  doc.setFont('helvetica', 'bold');
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });
  yPosition += 8;

  // Draw line under headers
  doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
  yPosition += 5;

  // Table data
  doc.setFont('helvetica', 'normal');
  data.expenses.forEach((expense, index) => {
    if (yPosition > 270) { // New page if needed
      doc.addPage();
      yPosition = margin;
    }

    const userSplit = expense.splits.find(split => split.userId === data.userInfo.id);
    const paidByUser = allUsers.find(u => u.id === expense.paidBy);
    
    xPosition = margin;
    const rowData = [
      formatDate(expense.date),
      expense.description.length > 20 ? expense.description.substring(0, 17) + '...' : expense.description,
      expense.category,
      formatCurrency(userSplit?.amount || 0),
      paidByUser?.name || 'Unknown'
    ];

    rowData.forEach((cell, cellIndex) => {
      doc.text(cell, xPosition, yPosition);
      xPosition += colWidths[cellIndex];
    });
    yPosition += 6;
  });

  // Footer
  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${formatCurrency(data.totalAmount)}`, pageWidth - margin - 30, yPosition);

  // Save PDF
  doc.save(`expenses_${data.userInfo.name}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Get default filters
export const getDefaultFilters = (): ExportFilters => ({
  dateRange: {
    start: null,
    end: null
  },
  categories: [],
  minAmount: null,
  maxAmount: null,
  includeGroups: true,
  includePersonal: true
});

// Get available categories from expenses
export const getAvailableCategories = (expenses: Expense[]): string[] => {
  const categories = new Set(expenses.map(expense => expense.category));
  return Array.from(categories).sort();
};