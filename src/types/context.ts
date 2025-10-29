export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export interface AppContextType {
  user: User | null;
  friends: User[];
  groups: Group[];
  expenses: Expense[];
  balances: Balance[];
  notifications: Notification[];
  activities: Activity[];
  settlements: Settlement[];
}

import { User, Group, Expense, Balance, Notification, Activity, Settlement } from './index';