export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdBy: string;
  members: GroupMember[];
  totalExpenses: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  paidBy: string;
  groupId?: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  receipt?: string;
  notes?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory = 
  | 'food'
  | 'transportation'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'rent'
  | 'groceries'
  | 'healthcare'
  | 'travel'
  | 'other';

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  groupId?: string;
  status: 'pending' | 'completed';
  settledAt?: Date;
  createdAt: Date;
}

export interface Balance {
  userId: string;
  groupId?: string;
  amount: number;
  currency: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_request'
  | 'payment_received'
  | 'friend_request'
  | 'group_invitation'
  | 'settlement_reminder';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  targetId: string;
  description: string;
  data?: any;
  createdAt: Date;
}

export type ActivityType = 
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_made'
  | 'group_created'
  | 'friend_added'
  | 'settlement_completed';