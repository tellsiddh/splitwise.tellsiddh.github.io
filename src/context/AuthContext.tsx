import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { AuthState, AuthContextType } from '../types/context';
import { storageService } from '../services/storage';
import { generateId, validateEmail } from '../utils/helpers';

// Authentication action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing user on mount
  useEffect(() => {
    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: currentUser });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Get existing users
      const users = storageService.getUsers();
      const existingUser = users.find(user => user.email === email);

      if (existingUser) {
        // Simulate password check (in real app, you'd verify against hashed password)
        storageService.saveCurrentUser(existingUser);
        dispatch({ type: 'LOGIN_SUCCESS', payload: existingUser });
      } else {
        throw new Error('User not found. Please register first.');
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (!name.trim()) {
        throw new Error('Name is required');
      }

      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Get existing users
      const users = storageService.getUsers();
      const existingUser = users.find(user => user.email === email);

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const newUser: User = {
        id: generateId(),
        name: name.trim(),
        email: email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to storage
      users.push(newUser);
      storageService.saveUsers(users);
      storageService.saveCurrentUser(newUser);

      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    storageService.removeCurrentUser();
    dispatch({ type: 'LOGOUT' });
  };

  // Update profile function
  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!state.user) {
      throw new Error('No user logged in');
    }

    try {
      const updatedUser: User = {
        ...state.user,
        ...updates,
        updatedAt: new Date(),
      };

      // Update in users array
      const users = storageService.getUsers();
      const userIndex = users.findIndex(user => user.id === state.user!.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        storageService.saveUsers(users);
      }

      // Update current user
      storageService.saveCurrentUser(updatedUser);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};