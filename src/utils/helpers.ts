import { Expense, Settlement, Balance, User, ExpenseSplit } from '../types';

// Currency formatting
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Date formatting
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Calculate balances between users
export const calculateBalances = (expenses: Expense[], users: User[]): Balance[] => {
  const balances: { [userId: string]: { [otherUserId: string]: number } } = {};

  // Validate inputs
  if (!expenses || !users || users.length === 0) {
    return [];
  }

  // Initialize balances
  users.forEach(user => {
    if (user && user.id) {
      balances[user.id] = {};
      users.forEach(otherUser => {
        if (otherUser && otherUser.id && user.id !== otherUser.id) {
          balances[user.id][otherUser.id] = 0;
        }
      });
    }
  });

  // Calculate balances from expenses
  expenses.forEach(expense => {
    // Validate expense
    if (!expense || !expense.paidBy || !expense.splits) return;
    
    const paidBy = expense.paidBy;
    
    // Skip if payer doesn't exist in users
    if (!balances[paidBy]) return;
    
    expense.splits.forEach(split => {
      // Validate split
      if (!split || !split.userId || typeof split.amount !== 'number') return;
      
      // Skip if split user doesn't exist in users
      if (!balances[split.userId]) return;
      
      // Skip if the other user's balance object doesn't exist
      if (balances[split.userId][paidBy] === undefined || balances[paidBy][split.userId] === undefined) return;
      
      if (split.userId !== paidBy) {
        // Person who paid is owed money by person who owes
        balances[split.userId][paidBy] += split.amount;
        balances[paidBy][split.userId] -= split.amount;
      }
    });
  });

  // Convert to Balance array
  const result: Balance[] = [];
  Object.keys(balances).forEach(userId => {
    Object.keys(balances[userId]).forEach(otherUserId => {
      const amount = balances[userId][otherUserId];
      if (amount !== 0) {
        result.push({
          userId,
          amount,
          currency: 'USD'
        });
      }
    });
  });

  return result;
};

// Calculate optimal settlements using simplified debt optimization
export const calculateOptimalSettlements = (balances: Balance[]): Settlement[] => {
  // Create a net balance for each user
  const netBalances: { [userId: string]: number } = {};
  
  balances.forEach(balance => {
    netBalances[balance.userId] = (netBalances[balance.userId] || 0) + balance.amount;
  });

  const settlements: Settlement[] = [];
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  // Separate creditors (positive balance) and debtors (negative balance)
  Object.keys(netBalances).forEach(userId => {
    const amount = netBalances[userId];
    if (amount > 0.01) { // Creditor
      creditors.push({ userId, amount });
    } else if (amount < -0.01) { // Debtor
      debtors.push({ userId, amount: -amount });
    }
  });

  // Create settlements
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const settlementAmount = Math.min(creditor.amount, debtor.amount);

    settlements.push({
      id: `settlement-${settlements.length + 1}`,
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: settlementAmount,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date()
    });

    creditor.amount -= settlementAmount;
    debtor.amount -= settlementAmount;

    if (creditor.amount <= 0.01) {
      creditorIndex++;
    }
    if (debtor.amount <= 0.01) {
      debtorIndex++;
    }
  }

  return settlements;
};

// Split expense calculation utilities
export const calculateEqualSplit = (amount: number, userIds: string[]): ExpenseSplit[] => {
  const splitAmount = amount / userIds.length;
  return userIds.map(userId => ({
    userId,
    amount: Number(splitAmount.toFixed(2))
  }));
};

export const calculatePercentageSplit = (
  amount: number, 
  splits: { userId: string; percentage: number }[]
): ExpenseSplit[] => {
  return splits.map(split => ({
    userId: split.userId,
    amount: Number((amount * split.percentage / 100).toFixed(2)),
    percentage: split.percentage
  }));
};

export const calculateSharesSplit = (
  amount: number,
  splits: { userId: string; shares: number }[]
): ExpenseSplit[] => {
  const totalShares = splits.reduce((sum, split) => sum + split.shares, 0);
  
  return splits.map(split => ({
    userId: split.userId,
    amount: Number((amount * split.shares / totalShares).toFixed(2)),
    shares: split.shares
  }));
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateAmount = (amount: string): boolean => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

// Generate unique ID
export const generateId = (): string => {
  // Use timestamp + random + counter for better uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  const counter = (Math.floor(Math.random() * 1000)).toString(36);
  return `${timestamp}-${random}-${counter}`;
};

// Color utilities for avatars
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};