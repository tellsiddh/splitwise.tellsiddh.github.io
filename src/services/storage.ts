import { User, Group, Expense, Settlement, Friend, Notification, Activity, Balance } from '../types';

export class LocalStorageService {
  private static instance: LocalStorageService;

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // Generic storage methods
  private setItem<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error);
    }
  }

  // User management
  saveCurrentUser(user: User): void {
    this.setItem('current_user', user);
  }

  getCurrentUser(): User | null {
    return this.getItem<User>('current_user');
  }

  removeCurrentUser(): void {
    this.removeItem('current_user');
  }

  saveUsers(users: User[]): void {
    this.setItem('users', users);
  }

  getUsers(): User[] {
    return this.getItem<User[]>('users') || [];
  }

  // Friends management
  saveFriends(friends: Friend[]): void {
    this.setItem('friends', friends);
  }

  getFriends(): Friend[] {
    return this.getItem<Friend[]>('friends') || [];
  }

  // Groups management
  saveGroups(groups: Group[]): void {
    this.setItem('groups', groups);
  }

  getGroups(): Group[] {
    return this.getItem<Group[]>('groups') || [];
  }

  // Expenses management
  saveExpenses(expenses: Expense[]): void {
    this.setItem('expenses', expenses);
  }

  getExpenses(): Expense[] {
    return this.getItem<Expense[]>('expenses') || [];
  }

  // Settlements management
  saveSettlements(settlements: Settlement[]): void {
    this.setItem('settlements', settlements);
  }

  getSettlements(): Settlement[] {
    return this.getItem<Settlement[]>('settlements') || [];
  }

  // Notifications management
  saveNotifications(notifications: Notification[]): void {
    this.setItem('notifications', notifications);
  }

  getNotifications(): Notification[] {
    return this.getItem<Notification[]>('notifications') || [];
  }

  // Activities management
  saveActivities(activities: Activity[]): void {
    this.setItem('activities', activities);
  }

  getActivities(): Activity[] {
    return this.getItem<Activity[]>('activities') || [];
  }

  // Balances management
  saveBalances(balances: Balance[]): void {
    this.setItem('balances', balances);
  }

  getBalances(): Balance[] {
    return this.getItem<Balance[]>('balances') || [];
  }

  // Clear all data
  clearAllData(): void {
    const keys = [
      'current_user',
      'users',
      'friends',
      'groups',
      'expenses',
      'settlements',
      'notifications',
      'activities',
      'balances'
    ];
    
    keys.forEach(key => this.removeItem(key));
  }

  // Initialize with sample data
  initializeSampleData(): void {
    // Clear existing data
    this.clearAllData();

    // Sample users with unique IDs that won't conflict
    const sampleUsers: User[] = [
      {
        id: 'sample-user-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-user-3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample friends
    const sampleFriends: Friend[] = [
      {
        id: 'sample-friend-1',
        userId: 'sample-user-1',
        friendId: 'sample-user-2',
        status: 'accepted',
        createdAt: new Date()
      },
      {
        id: 'sample-friend-2',
        userId: 'sample-user-1',
        friendId: 'sample-user-3',
        status: 'accepted',
        createdAt: new Date()
      }
    ];

    // Sample groups
    const sampleGroups: Group[] = [
      {
        id: 'sample-group-1',
        name: 'Roommates',
        description: 'Apartment expenses',
        createdBy: 'sample-user-1',
        members: [
          { userId: 'sample-user-1', role: 'admin', joinedAt: new Date() },
          { userId: 'sample-user-2', role: 'member', joinedAt: new Date() }
        ],
        totalExpenses: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-group-2',
        name: 'Trip to Bali',
        description: 'Vacation expenses',
        createdBy: 'sample-user-1',
        members: [
          { userId: 'sample-user-1', role: 'admin', joinedAt: new Date() },
          { userId: 'sample-user-2', role: 'member', joinedAt: new Date() },
          { userId: 'sample-user-3', role: 'member', joinedAt: new Date() }
        ],
        totalExpenses: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample expenses
    const sampleExpenses: Expense[] = [
      {
        id: 'sample-expense-1',
        description: 'Grocery shopping',
        amount: 120.50,
        currency: 'USD',
        category: 'groceries',
        paidBy: 'sample-user-1',
        groupId: 'sample-group-1',
        splitType: 'equal',
        splits: [
          { userId: 'sample-user-1', amount: 60.25 },
          { userId: 'sample-user-2', amount: 60.25 }
        ],
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sample-expense-2',
        description: 'Flight tickets',
        amount: 1200.00,
        currency: 'USD',
        category: 'travel',
        paidBy: 'sample-user-2',
        groupId: 'sample-group-2',
        splitType: 'equal',
        splits: [
          { userId: 'sample-user-1', amount: 400.00 },
          { userId: 'sample-user-2', amount: 400.00 },
          { userId: 'sample-user-3', amount: 400.00 }
        ],
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Save sample data
    this.saveUsers(sampleUsers);
    this.saveFriends(sampleFriends);
    this.saveGroups(sampleGroups);
    this.saveExpenses(sampleExpenses);
    this.saveCurrentUser(sampleUsers[0]);
  }
}

export const storageService = LocalStorageService.getInstance();