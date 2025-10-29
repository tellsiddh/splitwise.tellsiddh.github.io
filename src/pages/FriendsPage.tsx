import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/helpers';
import { User, Expense, ExpenseSplit } from '../types';
import { generateId, validateEmail } from '../utils/helpers';
import { storageService } from '../services/storage';

const FriendsPage: React.FC = () => {
  const { user } = useAuth();
  const { friends, addFriend, removeFriend, loading, expenses } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFriend, setNewFriend] = useState({
    name: '',
    email: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFriend.name.trim() || !newFriend.email.trim()) {
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      if (!validateEmail(newFriend.email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const allUsers = storageService.getUsers();
      let existingUser = allUsers.find(u => u.email.toLowerCase() === newFriend.email.toLowerCase());

      if (!existingUser) {
        // Create new user
        const newUser: User = {
          id: generateId(),
          name: newFriend.name.trim(),
          email: newFriend.email.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        allUsers.push(newUser);
        storageService.saveUsers(allUsers);
        existingUser = newUser;
      }

      // Check if already friends
      if (friends.some(f => f.id === existingUser!.id)) {
        throw new Error('This person is already your friend');
      }

      if (existingUser.id === user.id) {
        throw new Error('You cannot add yourself as a friend');
      }

      addFriend(existingUser);
      
      // Reset form
      setNewFriend({ name: '', email: '' });
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add friend');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFriend = (friend: User) => {
    if (window.confirm(`Are you sure you want to remove ${friend.name} from your friends?`)) {
      removeFriend(friend.id);
    }
  };

  // Calculate balance with each friend
  const getFriendBalance = (friendId: string): number => {
    if (!user) return 0;
    
    // Calculate balance directly from expenses involving both users
    let netBalance = 0;
    
    expenses.forEach((expense: Expense) => {
      // Skip group expenses for friend balance calculations
      if (expense.groupId) return;
      
      const userPaid = expense.paidBy === user.id;
      const friendPaid = expense.paidBy === friendId;
      const userSplit = expense.splits.find((s: ExpenseSplit) => s.userId === user.id);
      const friendSplit = expense.splits.find((s: ExpenseSplit) => s.userId === friendId);
      
      // Only consider expenses involving both users
      if (!((userPaid || userSplit) && (friendPaid || friendSplit))) return;
      
      if (userPaid && friendSplit) {
        // User paid, friend owes
        netBalance += friendSplit.amount;
      } else if (friendPaid && userSplit) {
        // Friend paid, user owes
        netBalance -= userSplit.amount;
      }
    });
    
    return netBalance;
  };

  if (loading) {
    return (
      <Layout title="Friends">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Friends"
      headerChildren={
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          + Add Friend
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Add Friend Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add a Friend</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFriend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={newFriend.name}
                    onChange={(e) => setNewFriend(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter their name"
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={newFriend.email}
                    onChange={(e) => setNewFriend(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter their email"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    loading={isAdding}
                    disabled={!newFriend.name.trim() || !newFriend.email.trim()}
                    className="flex-1 sm:flex-initial"
                  >
                    Add Friend
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFriend({ name: '', email: '' });
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        {friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map((friend) => {
              const balance = getFriendBalance(friend.id);
              
              return (
                <Card key={friend.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <Avatar user={friend} size="lg" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{friend.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{friend.email}</p>
                          {balance !== 0 && (
                            <p className={`text-sm font-medium ${
                              balance > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {balance > 0 
                                ? `owes you ${formatCurrency(balance)}`
                                : `you owe ${formatCurrency(Math.abs(balance))}`
                              }
                            </p>
                          )}
                          {balance === 0 && (
                            <p className="text-sm text-gray-400">All settled up</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        <Link to={`/expenses/new?friend=${friend.id}`}>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                            Add Expense
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFriend(friend)}
                          className="text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                        >
                          Remove
                        </Button>
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
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No friends yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Add friends to start splitting expenses and tracking balances together.
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  Add Your First Friend
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {friends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{friends.length}</div>
                  <div className="text-sm text-gray-500">Total Friends</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {friends.filter(f => getFriendBalance(f.id) > 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Owe You</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {friends.filter(f => getFriendBalance(f.id) < 0).length}
                  </div>
                  <div className="text-sm text-gray-500">You Owe</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {friends.filter(f => getFriendBalance(f.id) === 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Settled Up</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default FriendsPage;