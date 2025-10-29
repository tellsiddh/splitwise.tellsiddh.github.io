import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ExpenseCategory, SplitType, ExpenseSplit } from '../types';
import { calculateEqualSplit, calculatePercentageSplit, calculateSharesSplit, formatCurrency } from '../utils/helpers';

const ExpenseFormPage: React.FC = () => {
  const { user } = useAuth();
  const { friends, groups, addExpense, updateExpense, expenses } = useApp();
  const [searchParams] = useSearchParams();
  const { id: expenseId } = useParams();
  const [loading, setLoading] = useState(false);
  
  // Check if we're editing an existing expense
  const isEditing = !!expenseId;
  const existingExpense = isEditing ? expenses.find(e => e.id === expenseId) : null;

  // Get pre-selected friend or group from URL params
  const preSelectedFriend = searchParams.get('friend');
  const preSelectedGroup = searchParams.get('group');
  
  // Initialize form data based on whether we're editing or creating
  const getInitialFormData = () => {
    if (isEditing && existingExpense) {
      return {
        description: existingExpense.description,
        amount: existingExpense.amount.toString(),
        category: existingExpense.category,
        paidBy: existingExpense.paidBy,
        groupId: existingExpense.groupId || '',
        splitType: existingExpense.splitType,
        notes: existingExpense.notes || '',
        date: new Date(existingExpense.date).toISOString().split('T')[0],
      };
    }
    return {
      description: '',
      amount: '',
      category: 'food' as ExpenseCategory,
      paidBy: user?.id || '',
      groupId: preSelectedGroup || '',
      splitType: 'equal' as SplitType,
      notes: '',
      date: new Date().toISOString().split('T')[0],
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<{ [userId: string]: number }>({});

  // Initialize form data when editing
  useEffect(() => {
    if (isEditing && existingExpense) {
      setFormData(getInitialFormData());
      setSelectedUsers(existingExpense.splits.map(split => split.userId));
      
      // Set custom splits for non-equal split types
      if (existingExpense.splitType !== 'equal') {
        const customSplitData: { [userId: string]: number } = {};
        existingExpense.splits.forEach(split => {
          if (existingExpense.splitType === 'exact') {
            customSplitData[split.userId] = split.amount;
          } else if (existingExpense.splitType === 'percentage') {
            customSplitData[split.userId] = (split.amount / existingExpense.amount) * 100;
          } else if (existingExpense.splitType === 'shares') {
            // For shares, we'll assume equal shares as we don't store the original share count
            customSplitData[split.userId] = 1;
          }
        });
        setCustomSplits(customSplitData);
      }
    }
  }, [isEditing, existingExpense]);

  const categories: { value: ExpenseCategory; label: string; emoji: string }[] = [
    { value: 'food', label: 'Food & Dining', emoji: '🍽️' },
    { value: 'transportation', label: 'Transportation', emoji: '🚗' },
    { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
    { value: 'shopping', label: 'Shopping', emoji: '🛒' },
    { value: 'utilities', label: 'Utilities', emoji: '⚡' },
    { value: 'rent', label: 'Rent', emoji: '🏠' },
    { value: 'groceries', label: 'Groceries', emoji: '🥕' },
    { value: 'healthcare', label: 'Healthcare', emoji: '🏥' },
    { value: 'travel', label: 'Travel', emoji: '✈️' },
    { value: 'other', label: 'Other', emoji: '📝' },
  ];

  const splitTypes: { value: SplitType; label: string }[] = [
    { value: 'equal', label: 'Split Equally' },
    { value: 'exact', label: 'Exact Amounts' },
    { value: 'percentage', label: 'Percentages' },
    { value: 'shares', label: 'Shares' },
  ];

  // Get available users (friends + current user)
  const availableUsers = [user!, ...friends].filter(Boolean);

  // Initialize selected users with current user or pre-selected friend
  React.useEffect(() => {
    if (!formData.groupId && selectedUsers.length === 0 && user) {
      if (preSelectedFriend) {
        setSelectedUsers([user.id, preSelectedFriend]);
      } else {
        setSelectedUsers([user.id]);
      }
    }
  }, [formData.groupId, selectedUsers.length, user, preSelectedFriend]);

  // Update selected users when group changes
  React.useEffect(() => {
    if (formData.groupId) {
      const group = groups.find(g => g.id === formData.groupId);
      if (group) {
        setSelectedUsers(group.members.map(m => m.userId));
      }
    }
  }, [formData.groupId, groups]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        const newSelection = prev.filter(id => id !== userId);
        // Remove from custom splits if deselected
        setCustomSplits(prevSplits => {
          const newSplits = { ...prevSplits };
          delete newSplits[userId];
          return newSplits;
        });
        return newSelection;
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCustomSplitChange = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomSplits(prev => ({ ...prev, [userId]: numValue }));
  };

  const calculateSplits = (): ExpenseSplit[] => {
    const amount = parseFloat(formData.amount) || 0;
    
    switch (formData.splitType) {
      case 'equal':
        return calculateEqualSplit(amount, selectedUsers);
      
      case 'exact':
        return selectedUsers.map(userId => ({
          userId,
          amount: customSplits[userId] || 0,
        }));
      
      case 'percentage':
        const percentageSplits = selectedUsers.map(userId => ({
          userId,
          percentage: customSplits[userId] || 0,
        }));
        return calculatePercentageSplit(amount, percentageSplits);
      
      case 'shares':
        const sharesSplits = selectedUsers.map(userId => ({
          userId,
          shares: customSplits[userId] || 1,
        }));
        return calculateSharesSplit(amount, sharesSplits);
      
      default:
        return [];
    }
  };

  const splits = calculateSplits();
  const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
  const amount = parseFloat(formData.amount) || 0;
  const isValidAmount = amount > 0;
  const isValidSplit = Math.abs(totalSplit - amount) < 0.01; // Allow for small rounding differences

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValidAmount || !isValidSplit || selectedUsers.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: 'USD',
        category: formData.category,
        paidBy: formData.paidBy,
        groupId: formData.groupId || undefined,
        splitType: formData.splitType,
        splits: calculateSplits(),
        notes: formData.notes || undefined,
        date: new Date(formData.date),
      };

      if (isEditing && expenseId) {
        updateExpense(expenseId, expenseData);
      } else {
        addExpense(expenseData);
      }
      
      // Reset form if creating new expense
      if (!isEditing) {
        setFormData({
          description: '',
          amount: '',
          category: 'food',
          paidBy: user.id,
          groupId: '',
          splitType: 'equal',
          notes: '',
          date: new Date().toISOString().split('T')[0],
        });
        setSelectedUsers([user.id]);
        setCustomSplits({});
      }
      
      // Navigate back
      window.history.back();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} expense:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout 
      title={isEditing ? "Edit Expense" : "Add Expense"}
      headerChildren={
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          Cancel
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Expense Details" : "Expense Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="What was this expense for?"
                  required
                />
                
                <Input
                  label="Amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group (Optional)
                </label>
                <select
                  name="groupId"
                  value={formData.groupId}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Group (Personal Expense)</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid By
                </label>
                <select
                  name="paidBy"
                  value={formData.paidBy}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How to Split
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {splitTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, splitType: type.value }))}
                        className={`p-2 text-sm rounded-md border transition-colors ${
                          formData.splitType === type.value
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Split Between ({selectedUsers.length} people)
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableUsers.map(user => {
                      const isSelected = selectedUsers.includes(user.id);
                      const split = splits.find(s => s.userId === user.id);
                      
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUserSelection(user.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Avatar user={user} size="sm" />
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isSelected && formData.splitType !== 'equal' && (
                              <input
                                type="number"
                                step={formData.splitType === 'percentage' ? '1' : '0.01'}
                                min="0"
                                max={formData.splitType === 'percentage' ? '100' : undefined}
                                value={customSplits[user.id] || ''}
                                onChange={(e) => handleCustomSplitChange(user.id, e.target.value)}
                                placeholder={
                                  formData.splitType === 'exact' ? '0.00' :
                                  formData.splitType === 'percentage' ? '%' : 'shares'
                                }
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                            {isSelected && split && (
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(split.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Split Summary */}
                {selectedUsers.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center text-sm">
                      <span>Total Amount:</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Total Split:</span>
                      <span className={`font-medium ${isValidSplit ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalSplit)}
                      </span>
                    </div>
                    {!isValidSplit && (
                      <div className="text-xs text-red-600 mt-1">
                        Split amounts don't match the total expense amount
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Add any additional notes..."
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit */}
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!isValidAmount || !isValidSplit || selectedUsers.length === 0 || !formData.description.trim()}
                  className="flex-1"
                >
                  {isEditing ? "Update Expense" : "Add Expense"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ExpenseFormPage;