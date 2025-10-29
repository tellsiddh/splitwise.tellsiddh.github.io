import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import ExportModal from '../components/ExportModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { expenses, groups, friends, balances, loading } = useApp();
  const [showExportModal, setShowExportModal] = useState(false);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Calculate user's total balance
  const userBalances = balances.filter(b => b.userId === user?.id);
  const totalOwed = userBalances
    .filter(b => b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
  const totalOwes = userBalances
    .filter(b => b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const netBalance = totalOwed - totalOwes;

  // Recent expenses (last 5)
  const recentExpenses = expenses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Statistics
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyExpenses = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Layout 
      title="Dashboard"
      headerChildren={
        <Link to="/expenses/new">
          <Button size="sm">
            + Add Expense
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-blue-100 text-sm sm:text-base">
            Here's your expense overview and recent activity.
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Net Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                netBalance > 0 ? 'text-green-600' : 
                netBalance < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(netBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {netBalance > 0 ? 'You are owed' : 
                 netBalance < 0 ? 'You owe' : 'All settled up'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(monthlyExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {groups.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Groups
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {recentExpenses.length > 0 ? (
                <div className="space-y-4">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm">💰</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {expense.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(expense.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {expense.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">💸</p>
                  <p>No expenses yet</p>
                  <p className="text-sm">Add your first expense to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Groups & Friends */}
          <Card>
            <CardHeader>
              <CardTitle>Groups & Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Groups */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Recent Groups ({groups.length})
                  </h4>
                  {groups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">👥</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {group.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {group.members.length} members
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(group.totalExpenses)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Friends */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Friends ({friends.length})
                  </h4>
                  <div className="flex -space-x-2">
                    {friends.slice(0, 5).map((friend) => (
                      <Avatar
                        key={friend.id}
                        user={friend}
                        size="sm"
                        className="border-2 border-white"
                      />
                    ))}
                    {friends.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500">
                          +{friends.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/expenses/new">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 w-full">
                  <span className="text-2xl">💰</span>
                  <span className="text-sm">Add Expense</span>
                </Button>
              </Link>
              <Link to="/groups">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 w-full">
                  <span className="text-2xl">👥</span>
                  <span className="text-sm">Manage Groups</span>
                </Button>
              </Link>
              <Link to="/friends">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 w-full">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  <span className="text-sm">Manage Friends</span>
                </Button>
              </Link>
              <Link to="/settlements">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 w-full">
                  <span className="text-2xl">⚖️</span>
                  <span className="text-sm">Settle Up</span>
                </Button>
              </Link>
            </div>
            
            {/* Additional Actions */}
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowExportModal(true)}
              >
                📊 Export My Expenses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </Layout>
  );
};

export default DashboardPage;