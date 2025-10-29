import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import ExportModal from '../components/ExportModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { storageService } from '../services/storage';

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const { expenses, loading, deleteExpense } = useApp();
  const [filter, setFilter] = useState<'all' | 'personal' | 'group' | 'you-owe' | 'owed-to-you'>('all');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleDeleteExpense = (expenseId: string, expenseDescription: string) => {
    if (window.confirm(`Are you sure you want to delete "${expenseDescription}"? This action cannot be undone.`)) {
      deleteExpense(expenseId);
    }
  };

  // Get all users for display
  const allUsers = storageService.getUsers();
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  // Filter expenses based on user involvement
  const filteredExpenses = expenses.filter(expense => {
    switch (filter) {
      case 'personal':
        return !expense.groupId;
      case 'group':
        return !!expense.groupId;
      case 'you-owe':
        return expense.splits.some(split => split.userId === user?.id && expense.paidBy !== user?.id);
      case 'owed-to-you':
        return expense.paidBy === user?.id && expense.splits.some(split => split.userId !== user?.id);
      default:
        return true;
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryEmoji = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      food: '🍽️',
      transportation: '🚗',
      entertainment: '🎬',
      shopping: '🛒',
      utilities: '⚡',
      rent: '🏠',
      groceries: '🥕',
      healthcare: '🏥',
      travel: '✈️',
      other: '📝',
    };
    return categoryMap[category] || '📝';
  };

  if (loading) {
    return (
      <Layout title="Expenses">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Expenses"
      headerChildren={
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowExportModal(true)}
          >
            📊 Export
          </Button>
          <Link to="/expenses/new">
            <Button size="sm">+ Add Expense</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filter Tabs */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Expenses', count: expenses.length },
                { key: 'paid', label: 'You Paid', count: expenses.filter(e => e.paidBy === user?.id).length },
                { key: 'owed', label: 'You Owe', count: expenses.filter(e => e.splits.some(s => s.userId === user?.id && e.paidBy !== user?.id)).length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => {
              const paidByUser = getUserById(expense.paidBy);
              const userSplit = expense.splits.find(s => s.userId === user?.id);
              const isPaidByUser = expense.paidBy === user?.id;
              
              return (
                <Card key={expense.id}>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg shrink-0">
                          {getCategoryEmoji(expense.category)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">
                            {expense.description}
                          </h3>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 mb-2">
                            <span>{formatDate(expense.date)}</span>
                            <span className="capitalize">{expense.category}</span>
                            {expense.notes && (
                              <span className="truncate max-w-xs">{expense.notes}</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {paidByUser && <Avatar user={paidByUser} size="sm" />}
                            <span className="text-sm text-gray-600">
                              {isPaidByUser ? 'You paid' : `${paidByUser?.name} paid`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          {formatCurrency(expense.amount)}
                        </div>
                        
                        {userSplit && (
                          <div className={`text-sm font-medium ${
                            isPaidByUser ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPaidByUser 
                              ? `You're owed ${formatCurrency(expense.amount - userSplit.amount)}`
                              : `You owe ${formatCurrency(userSplit.amount)}`
                            }
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-1 mb-2">
                          Split {expense.splits.length} way{expense.splits.length > 1 ? 's' : ''}
                        </div>
                        
                        {/* Action buttons - only show if user paid for the expense or is involved */}
                        {(isPaidByUser || userSplit) && (
                          <div className="flex gap-1">
                            <Link to={`/expenses/edit/${expense.id}`}>
                              <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                                Edit
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Split Details */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {expense.splits.map((split) => {
                          const splitUser = getUserById(split.userId);
                          if (!splitUser) return null;
                          
                          return (
                            <div key={split.userId} className="flex items-center space-x-2">
                              <Avatar user={splitUser} size="sm" />
                              <div>
                                <div className="text-xs font-medium text-gray-900">
                                  {splitUser.id === user?.id ? 'You' : splitUser.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(split.amount)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💸</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'all' ? 'No expenses yet' :
                   filter === 'personal' ? 'No personal expenses yet' :
                   filter === 'group' ? 'No group expenses yet' :
                   filter === 'you-owe' ? "You don't owe anyone" :
                   "No one owes you"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' ? 'Start tracking your expenses by adding your first expense.' :
                   filter === 'personal' ? 'Your personal expenses will appear here.' :
                   filter === 'group' ? 'Group expenses will appear here.' :
                   filter === 'you-owe' ? 'Expenses where you owe money will appear here.' :
                   'Expenses where others owe you will appear here.'}
                </p>
                <Link to="/expenses/new">
                  <Button>Add Your First Expense</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </Layout>
  );
};

export default ExpensesPage;