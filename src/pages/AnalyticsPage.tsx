import React, { useState, useMemo, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { storageService } from '../services/storage';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { expenses, groups, loading } = useApp();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Get all users for display
  const allUsers = storageService.getUsers();
  const getUserById = useCallback((id: string) => allUsers.find(u => u.id === id), [allUsers]);

  // Filter expenses by time range
  const getTimeRangeStart = () => {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return start;
  };

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.createdAt);
    return expenseDate >= getTimeRangeStart();
  });

  // Calculate analytics data
  const analytics = useMemo(() => {
    if (!user) return null;

    const userExpenses = filteredExpenses.filter(expense => 
      expense.splits.some(split => split.userId === user.id)
    );

    const totalSpent = userExpenses.reduce((sum, expense) => {
      const userSplit = expense.splits.find(split => split.userId === user.id);
      return sum + (userSplit?.amount || 0);
    }, 0);

    const totalPaid = filteredExpenses
      .filter(expense => expense.paidBy === user.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Category breakdown
    const categoryData: { [key: string]: { amount: number; count: number } } = {};
    userExpenses.forEach(expense => {
      const userSplit = expense.splits.find(split => split.userId === user.id);
      if (userSplit) {
        if (!categoryData[expense.category]) {
          categoryData[expense.category] = { amount: 0, count: 0 };
        }
        categoryData[expense.category].amount += userSplit.amount;
        categoryData[expense.category].count += 1;
      }
    });

    const categories = Object.entries(categoryData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly breakdown
    const monthlyData: { [key: string]: { spent: number; paid: number; count: number } } = {};
    userExpenses.forEach(expense => {
      const month = formatDate(expense.createdAt).split(' ').slice(0, 2).join(' '); // "Jan 2024"
      const userSplit = expense.splits.find(split => split.userId === user.id);
      
      if (!monthlyData[month]) {
        monthlyData[month] = { spent: 0, paid: 0, count: 0 };
      }
      
      if (userSplit) {
        monthlyData[month].spent += userSplit.amount;
      }
      if (expense.paidBy === user.id) {
        monthlyData[month].paid += expense.amount;
      }
      monthlyData[month].count += 1;
    });

    const monthlyBreakdown = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Group breakdown
    const groupData: { [key: string]: { amount: number; count: number; name: string } } = {};
    userExpenses.forEach(expense => {
      if (expense.groupId) {
        const group = groups.find(g => g.id === expense.groupId);
        const groupName = group?.name || 'Unknown Group';
        const userSplit = expense.splits.find(split => split.userId === user.id);
        
        if (userSplit) {
          if (!groupData[expense.groupId]) {
            groupData[expense.groupId] = { amount: 0, count: 0, name: groupName };
          }
          groupData[expense.groupId].amount += userSplit.amount;
          groupData[expense.groupId].count += 1;
        }
      }
    });

    const groupBreakdown = Object.values(groupData)
      .sort((a, b) => b.amount - a.amount);

    // Friend breakdown
    const friendData: { [key: string]: { amount: number; count: number; name: string } } = {};
    userExpenses.forEach(expense => {
      if (!expense.groupId) { // Only individual expenses
        const paidByUser = getUserById(expense.paidBy);
        if (paidByUser && paidByUser.id !== user.id) {
          const userSplit = expense.splits.find(split => split.userId === user.id);
          
          if (userSplit) {
            if (!friendData[paidByUser.id]) {
              friendData[paidByUser.id] = { amount: 0, count: 0, name: paidByUser.name };
            }
            friendData[paidByUser.id].amount += userSplit.amount;
            friendData[paidByUser.id].count += 1;
          }
        }
      }
    });

    const friendBreakdown = Object.values(friendData)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      totalPaid,
      expenseCount: userExpenses.length,
      categories,
      monthlyBreakdown,
      groupBreakdown,
      friendBreakdown,
      averageExpense: userExpenses.length > 0 ? totalSpent / userExpenses.length : 0
    };
  }, [filteredExpenses, user, groups, getUserById]);

  // Simple bar chart component
  const BarChart: React.FC<{ data: Array<{ name: string; amount: number; count?: number }>, maxValue?: number }> = ({ 
    data, 
    maxValue 
  }) => {
    const max = maxValue || Math.max(...data.map(d => d.amount));
    
    return (
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium capitalize">{item.name}</span>
              <span className="text-gray-600">
                {formatCurrency(item.amount)} 
                {item.count && ` (${item.count} expenses)`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${max > 0 ? (item.amount / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Pie chart component (simple version)
  const PieChart: React.FC<{ data: Array<{ name: string; amount: number }> }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    
    return (
      <div className="flex items-center space-x-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {data.slice(0, 6).map((item, index) => {
              const percentage = (item.amount / total) * 100;
              const strokeDasharray = `${percentage * 2.51} 251`;
              const strokeDashoffset = data
                .slice(0, index)
                .reduce((sum, prev) => sum + (prev.amount / total) * 251, 0);

              return (
                <circle
                  key={item.name}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          {data.slice(0, 6).map((item, index) => (
            <div key={item.name} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-medium capitalize">{item.name}</span>
              <span className="text-sm text-gray-600 ml-auto">
                {formatCurrency(item.amount)} ({((item.amount / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading || !analytics) {
    return (
      <Layout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Analytics">
      <div className="space-y-6">
        {/* Time Range Filter */}
        <Card>
          <CardContent className="p-3">
            <div className="flex space-x-1">
              {[
                { key: 'week', label: 'Last Week' },
                { key: 'month', label: 'Last Month' },
                { key: 'quarter', label: 'Last 3 Months' },
                { key: 'year', label: 'Last Year' },
              ].map(range => (
                <button
                  key={range.key}
                  onClick={() => setTimeRange(range.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.totalSpent)}
                </div>
                <div className="text-sm text-gray-500">Total Spent</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.totalPaid)}
                </div>
                <div className="text-sm text-gray-500">Total Paid</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.expenseCount}
                </div>
                <div className="text-sm text-gray-500">Expenses</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(analytics.averageExpense)}
                </div>
                <div className="text-sm text-gray-500">Avg. Expense</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {analytics.categories.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={analytics.categories} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.categories.length > 0 ? (
                  <PieChart data={analytics.categories} />
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Trend */}
        {analytics.monthlyBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.monthlyBreakdown.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{month.month}</span>
                      <div className="text-sm text-gray-600">
                        Spent: {formatCurrency(month.spent)} | 
                        Paid: {formatCurrency(month.paid)} | 
                        Expenses: {month.count}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Spent</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ 
                              width: `${analytics.monthlyBreakdown.length > 0 ? 
                                (month.spent / Math.max(...analytics.monthlyBreakdown.map(m => m.spent))) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Paid</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ 
                              width: `${analytics.monthlyBreakdown.length > 0 ? 
                                (month.paid / Math.max(...analytics.monthlyBreakdown.map(m => m.paid))) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group & Friend Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.groupBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Spending by Group</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={analytics.groupBreakdown} />
              </CardContent>
            </Card>
          )}

          {analytics.friendBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Spending with Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={analytics.friendBreakdown} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* No Data State */}
        {analytics.expenseCount === 0 && (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No spending data
                </h3>
                <p className="text-gray-500 mb-6">
                  Add some expenses to see your spending analytics.
                </p>
                <Button>Add First Expense</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;