import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Group, Expense, Balance, Notification, Activity, Settlement, Friend } from '../types';
import { storageService } from '../services/storage';
import { calculateBalances, calculateOptimalSettlements } from '../utils/helpers';
import { useAuth } from './AuthContext';

interface AppContextType {
  // Data
  friends: User[];
  groups: Group[];
  expenses: Expense[];
  balances: Balance[];
  notifications: Notification[];
  activities: Activity[];
  settlements: Settlement[];
  
  // Loading states
  loading: boolean;
  
  // Actions
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'totalExpenses'>) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  recordPayment: (fromUserId: string, toUserId: string, amount: number, description?: string) => void;
  resetAllData: () => void;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      resetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // loadData is defined in the same component and is stable

  // Recalculate balances and settlements when expenses change
  useEffect(() => {
    if (user && expenses.length > 0) {
      try {
        const users = storageService.getUsers();
        
        // Filter users to only include those referenced in expenses or current user's friends
        const referencedUserIds = new Set<string>();
        referencedUserIds.add(user.id);
        
        expenses.forEach(expense => {
          if (expense.paidBy) referencedUserIds.add(expense.paidBy);
          if (expense.splits) {
            expense.splits.forEach(split => {
              if (split.userId) referencedUserIds.add(split.userId);
            });
          }
        });
        
        friends.forEach(friend => {
          if (friend.id) referencedUserIds.add(friend.id);
        });
        
        const relevantUsers = users.filter(u => u && u.id && referencedUserIds.has(u.id));
        
        const newBalances = calculateBalances(expenses, relevantUsers);
        const newSettlements = calculateOptimalSettlements(newBalances);
        
        setBalances(newBalances);
        setSettlements(newSettlements);
        
        storageService.saveBalances(newBalances);
        storageService.saveSettlements(newSettlements);
      } catch (error) {
        console.error('Error calculating balances:', error);
        // Reset balances and settlements on error
        setBalances([]);
        setSettlements([]);
      }
    }
  }, [expenses, user, friends]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data from storage
      const users = storageService.getUsers();
      
      // Clean up any invalid data
      const validUserIds = new Set(users.map(u => u.id));
      
      // Load and clean data
      const friendsData = storageService.getFriends();
      const groupsData = storageService.getGroups();
      let expensesData = storageService.getExpenses();
      
      // Clean expenses - remove any with invalid user references
      const originalExpenseCount = expensesData.length;
      expensesData = expensesData.filter(expense => {
        if (!expense.paidBy || !validUserIds.has(expense.paidBy)) return false;
        if (!expense.splits || expense.splits.length === 0) return false;
        return expense.splits.every(split => split.userId && validUserIds.has(split.userId));
      });
      
      // Save cleaned expenses if any were removed
      if (expensesData.length !== originalExpenseCount) {
        console.log(`Cleaned ${originalExpenseCount - expensesData.length} invalid expenses`);
        storageService.saveExpenses(expensesData);
      }
      
      const notificationsData = storageService.getNotifications();
      const activitiesData = storageService.getActivities();

      // Filter friends for current user
      const userFriends = friendsData
        .filter(f => f.userId === user?.id && f.status === 'accepted')
        .map(f => users.find(u => u.id === f.friendId))
        .filter(Boolean) as User[];

      // Filter groups where user is a member
      const userGroups = groupsData.filter(g => 
        g.members.some(m => m.userId === user?.id)
      );

      // Filter expenses for user's groups or personal expenses
      const userExpenses = expensesData.filter(e => {
        // If it's a group expense, user must be in that group
        if (e.groupId) {
          return userGroups.some(g => g.id === e.groupId);
        }
        
        // For personal expenses, user must be involved (paid or split)
        const userPaidFor = e.paidBy === user?.id;
        const userInSplit = e.splits.some(s => s.userId === user?.id);
        
        // For personal expenses, also check if it involves a friend
        if (!userPaidFor && userInSplit) {
          const otherUsersInExpense = [e.paidBy, ...e.splits.map(s => s.userId)].filter(id => id !== user?.id);
          const isWithFriend = otherUsersInExpense.some(userId => 
            userFriends.some(friend => friend.id === userId)
          );
          return isWithFriend;
        }
        
        return userPaidFor || userInSplit;
      });

      // Filter notifications for current user
      const userNotifications = notificationsData.filter(n => n.userId === user?.id);

      // Filter activities for current user
      const userActivities = activitiesData.filter(a => a.userId === user?.id);

      setFriends(userFriends);
      setGroups(userGroups);
      setExpenses(userExpenses);
      setNotifications(userNotifications);
      setActivities(userActivities);

      // Initialize sample data if no data exists and sample data hasn't been initialized yet
      const sampleDataInitialized = localStorage.getItem('sampleDataInitialized');
      if (users.length <= 1 && groupsData.length === 0 && expensesData.length === 0 && !sampleDataInitialized) {
        localStorage.setItem('sampleDataInitialized', 'true');
        storageService.initializeSampleData();
        setTimeout(() => {
          loadData();
        }, 100);
        return;
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    setFriends([]);
    setGroups([]);
    setExpenses([]);
    setBalances([]);
    setNotifications([]);
    setActivities([]);
    setSettlements([]);
    setLoading(false);
  };

  const addFriend = (friend: User) => {
    if (!user) return;

    const newFriend: Friend = {
      id: `friend-${Date.now()}`,
      userId: user.id,
      friendId: friend.id,
      status: 'accepted',
      createdAt: new Date()
    };

    const allFriends = storageService.getFriends();
    allFriends.push(newFriend);
    storageService.saveFriends(allFriends);

    setFriends(prev => [...prev, friend]);
    
    // Refresh data to ensure proper filtering
    loadData();
  };

  const removeFriend = (friendId: string) => {
    if (!user) return;

    const allFriends = storageService.getFriends();
    const updatedFriends = allFriends.filter(f => 
      !(f.userId === user.id && f.friendId === friendId)
    );
    storageService.saveFriends(updatedFriends);

    setFriends(prev => prev.filter(f => f.id !== friendId));
  };

  const createGroup = (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'totalExpenses'>) => {
    if (!user) return;

    const newGroup: Group = {
      ...groupData,
      id: `group-${Date.now()}`,
      totalExpenses: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const allGroups = storageService.getGroups();
    allGroups.push(newGroup);
    storageService.saveGroups(allGroups);

    setGroups(prev => [...prev, newGroup]);
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    const allGroups = storageService.getGroups();
    const groupIndex = allGroups.findIndex(g => g.id === groupId);
    
    if (groupIndex !== -1) {
      allGroups[groupIndex] = { ...allGroups[groupIndex], ...updates, updatedAt: new Date() };
      storageService.saveGroups(allGroups);
      
      setGroups(prev => prev.map(g => 
        g.id === groupId ? allGroups[groupIndex] : g
      ));
    }
  };

  const deleteGroup = (groupId: string) => {
    const allGroups = storageService.getGroups();
    const updatedGroups = allGroups.filter(g => g.id !== groupId);
    storageService.saveGroups(updatedGroups);

    // Also remove expenses for this group
    const allExpenses = storageService.getExpenses();
    const updatedExpenses = allExpenses.filter(e => e.groupId !== groupId);
    storageService.saveExpenses(updatedExpenses);

    setGroups(prev => prev.filter(g => g.id !== groupId));
    setExpenses(prev => prev.filter(e => e.groupId !== groupId));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `expense-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const allExpenses = storageService.getExpenses();
    allExpenses.push(newExpense);
    storageService.saveExpenses(allExpenses);

    setExpenses(prev => [...prev, newExpense]);

    // Update group total if expense belongs to a group
    if (newExpense.groupId) {
      updateGroup(newExpense.groupId, {
        totalExpenses: groups.find(g => g.id === newExpense.groupId)?.totalExpenses || 0 + newExpense.amount
      });
    }
  };

  const updateExpense = (expenseId: string, updates: Partial<Expense>) => {
    const allExpenses = storageService.getExpenses();
    const expenseIndex = allExpenses.findIndex(e => e.id === expenseId);
    
    if (expenseIndex !== -1) {
      allExpenses[expenseIndex] = { ...allExpenses[expenseIndex], ...updates, updatedAt: new Date() };
      storageService.saveExpenses(allExpenses);
      
      setExpenses(prev => prev.map(e => 
        e.id === expenseId ? allExpenses[expenseIndex] : e
      ));
    }
  };

  const deleteExpense = (expenseId: string) => {
    const allExpenses = storageService.getExpenses();
    const expense = allExpenses.find(e => e.id === expenseId);
    const updatedExpenses = allExpenses.filter(e => e.id !== expenseId);
    storageService.saveExpenses(updatedExpenses);

    setExpenses(prev => prev.filter(e => e.id !== expenseId));

    // Update group total if expense belonged to a group
    if (expense?.groupId) {
      const group = groups.find(g => g.id === expense.groupId);
      if (group) {
        updateGroup(expense.groupId, {
          totalExpenses: Math.max(0, group.totalExpenses - expense.amount)
        });
      }
    }
  };

  const markNotificationRead = (notificationId: string) => {
    const allNotifications = storageService.getNotifications();
    const notificationIndex = allNotifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex !== -1) {
      allNotifications[notificationIndex].read = true;
      storageService.saveNotifications(allNotifications);
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    }
  };

  const clearAllNotifications = () => {
    if (!user) return;

    const allNotifications = storageService.getNotifications();
    const updatedNotifications = allNotifications.filter(n => n.userId !== user.id);
    storageService.saveNotifications(updatedNotifications);

    setNotifications([]);
  };

  const recordPayment = (fromUserId: string, toUserId: string, amount: number, description?: string) => {
    if (!user) return;

    // Create a settlement expense to balance the books
    const settlementExpense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
      description: description || `Settlement payment from ${storageService.getUsers().find(u => u.id === fromUserId)?.name || 'Unknown'} to ${storageService.getUsers().find(u => u.id === toUserId)?.name || 'Unknown'}`,
      amount: amount,
      currency: 'USD',
      category: 'other',
      paidBy: fromUserId,
      groupId: undefined, // Personal settlement
      splitType: 'exact',
      splits: [
        { userId: fromUserId, amount: amount }, // Payer gets full amount back
        { userId: toUserId, amount: 0 } // Receiver owes nothing
      ],
      date: new Date()
    };

    // Add the settlement expense
    addExpense(settlementExpense);

    // Create a settlement record for history
    const settlement: Settlement = {
      id: `settlement-${Date.now()}`,
      fromUserId,
      toUserId,
      amount,
      currency: 'USD',
      status: 'completed',
      settledAt: new Date(),
      createdAt: new Date()
    };

    // Save settlement record
    const allSettlements = storageService.getSettlements();
    allSettlements.push(settlement);
    storageService.saveSettlements(allSettlements);

    // Create activity records
    const toUser = storageService.getUsers().find(u => u.id === toUserId);

    if (fromUserId === user.id) {
      // Current user made payment
      const activity: Activity = {
        id: `activity-${Date.now()}`,
        userId: user.id,
        type: 'payment_made',
        targetId: toUserId,
        description: `You paid $${amount.toFixed(2)} to ${toUser?.name || 'Unknown'}`,
        data: { amount, settlementId: settlement.id },
        createdAt: new Date()
      };
      
      const allActivities = storageService.getActivities();
      allActivities.push(activity);
      storageService.saveActivities(allActivities);
    }
  };

  const refreshData = () => {
    loadData();
  };

  const resetAllData = () => {
    // Clear all localStorage data
    storageService.clearAllData();
    localStorage.removeItem('sampleDataInitialized');
    
    // Reset all state
    setFriends([]);
    setGroups([]);
    setExpenses([]);
    setBalances([]);
    setNotifications([]);
    setActivities([]);
    setSettlements([]);
    
    // Reload data (will initialize sample data)
    setTimeout(() => {
      loadData();
    }, 100);
  };

  const value: AppContextType = {
    friends,
    groups,
    expenses,
    balances,
    notifications,
    activities,
    settlements,
    loading,
    addFriend,
    removeFriend,
    createGroup,
    updateGroup,
    deleteGroup,
    addExpense,
    updateExpense,
    deleteExpense,
    markNotificationRead,
    clearAllNotifications,
    recordPayment,
    resetAllData,
    refreshData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};