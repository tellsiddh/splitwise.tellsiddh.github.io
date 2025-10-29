import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Group, GroupMember } from '../types';

const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { friends, groups, createGroup, deleteGroup, loading } = useApp();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    selectedMembers: [] as string[],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Available users (current user + friends)
  const availableUsers = [user!, ...friends].filter(Boolean);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroup.name.trim()) {
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Ensure current user is always included as admin
      const members: GroupMember[] = [
        {
          userId: user.id,
          role: 'admin',
          joinedAt: new Date(),
        },
        ...newGroup.selectedMembers
          .filter(id => id !== user.id) // Remove duplicates
          .map(userId => ({
            userId,
            role: 'member' as const,
            joinedAt: new Date(),
          }))
      ];

      const groupData = {
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
        createdBy: user.id,
        members,
      };

      createGroup(groupData);
      
      // Reset form
      setNewGroup({
        name: '',
        description: '',
        selectedMembers: [],
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    if (window.confirm(`Are you sure you want to delete "${group.name}"? This will also delete all associated expenses.`)) {
      deleteGroup(group.id);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setNewGroup(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(userId)
        ? prev.selectedMembers.filter(id => id !== userId)
        : [...prev.selectedMembers, userId]
    }));
  };

  const getUserById = (id: string) => availableUsers.find(u => u.id === id);
  const isUserAdmin = (group: Group) => group.createdBy === user?.id;

  if (loading) {
    return (
      <Layout title="Groups">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Groups"
      headerChildren={
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          + Create Group
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Create Group Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create a Group</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Group Name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Roommates, Trip to Paris"
                    required
                  />
                  <Input
                    label="Description (Optional)"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the group"
                  />
                </div>

                {/* Member Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Members ({newGroup.selectedMembers.length + 1} selected)
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {/* Current user (always included as admin) */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <Avatar user={user!} size="sm" />
                        <div>
                          <span className="font-medium text-gray-900">You</span>
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>
                        </div>
                      </div>
                    </div>

                    {/* Friends */}
                    {friends.map(friend => {
                      const isSelected = newGroup.selectedMembers.includes(friend.id);
                      
                      return (
                        <div
                          key={friend.id}
                          className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMemberSelection(friend.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Avatar user={friend} size="sm" />
                            <span className="font-medium text-gray-900">{friend.name}</span>
                          </div>
                        </div>
                      );
                    })}

                    {friends.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <p>No friends added yet.</p>
                        <Link to="/friends" className="text-blue-600 hover:text-blue-500">
                          Add friends first
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={isCreating}
                    disabled={!newGroup.name.trim()}
                  >
                    Create Group
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewGroup({ name: '', description: '', selectedMembers: [] });
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

        {/* Groups List */}
        {groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => {
              const isAdmin = isUserAdmin(group);
              
              return (
                <Card key={group.id}>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-gray-500">{group.description}</p>
                            )}
                            <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                              <span>Created {formatDate(group.createdAt)}</span>
                              {isAdmin && <span className="text-blue-600">• Admin</span>}
                            </div>
                          </div>
                        </div>

                        {/* Members */}
                        <div className="mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Members ({group.members.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.members.map((member) => {
                              const memberUser = getUserById(member.userId);
                              if (!memberUser) return null;
                              
                              return (
                                <div key={member.userId} className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                                  <Avatar user={memberUser} size="sm" className="w-6 h-6" />
                                  <span className="text-xs font-medium">
                                    {memberUser.id === user?.id ? 'You' : memberUser.name}
                                  </span>
                                  {member.role === 'admin' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">A</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Group Stats */}
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Total Expenses</span>
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(group.totalExpenses)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Your Share</span>
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(group.totalExpenses / group.members.length)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <Link to={`/expenses/new?group=${group.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Add Expense
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGroup(group)}
                            className="text-red-600 hover:text-red-700 w-full"
                          >
                            Delete
                          </Button>
                        )}
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
                  No groups yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Create groups to organize expenses with multiple people for trips, shared living, or projects.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Create Your First Group
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {groups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Group Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
                  <div className="text-sm text-gray-500">Total Groups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {groups.filter(g => isUserAdmin(g)).length}
                  </div>
                  <div className="text-sm text-gray-500">You Admin</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(groups.reduce((sum, g) => sum + g.totalExpenses, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Total Spent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {groups.reduce((sum, g) => sum + g.members.length, 0)}
                  </div>
                  <div className="text-sm text-gray-500">Total Members</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default GroupsPage;